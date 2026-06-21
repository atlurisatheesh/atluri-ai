"""DocuMind™ — Document upload, processing, and context retrieval."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Document
from auth_utils import get_current_user
from config import settings

router = APIRouter()

_ALLOWED_DOC_TYPES = {"resume", "job_description", "cover_letter", "portfolio", "other"}
_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

# MIME types that are safe to decode as text
_TEXT_MIMETYPES = {"text/plain", "text/markdown", "application/json"}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = "resume",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload and process a document for RAG context."""
    if doc_type not in _ALLOWED_DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"doc_type must be one of: {', '.join(_ALLOWED_DOC_TYPES)}")

    if user.credits < settings.CREDIT_COST_DOC_UPLOAD:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    # Read with a hard size limit — do not buffer the entire file before checking
    content = await file.read(_MAX_UPLOAD_BYTES + 1)
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    # Only decode as text if it is actually a text MIME type; otherwise mark for extraction
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type in _TEXT_MIMETYPES:
        try:
            text_content = content.decode("utf-8")
        except UnicodeDecodeError:
            text_content = content.decode("utf-8", errors="replace")
        embedding_status = "ready"
    else:
        # Binary file (PDF, DOCX, etc.) — store placeholder; a background worker
        # should extract text via pdfplumber/python-docx and update this record.
        text_content = f"[Binary document: {file.filename}. Text extraction pending.]"
        embedding_status = "processing"

    doc = Document(
        user_id=user.id,
        filename=file.filename or "untitled",
        doc_type=doc_type,
        content_text=text_content[:50000],
        file_size=len(content),
        embedding_status=embedding_status,
        is_active=True,
    )
    db.add(doc)

    # Atomic credit deduction
    result = await db.execute(
        update(User)
        .where(User.id == user.id, User.credits >= settings.CREDIT_COST_DOC_UPLOAD)
        .values(credits=User.credits - settings.CREDIT_COST_DOC_UPLOAD)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    await db.flush()

    return {"id": doc.id, "filename": doc.filename, "status": doc.embedding_status}


@router.get("/")
async def list_documents(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.user_id == user.id).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "doc_type": d.doc_type,
            "status": d.embedding_status,
            "is_active": d.is_active,
            "file_size": d.file_size,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]


@router.put("/{doc_id}/toggle")
async def toggle_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.is_active = not doc.is_active
    db.add(doc)
    return {"id": doc.id, "is_active": doc.is_active}


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.delete(doc)
    return {"message": "Document deleted"}
