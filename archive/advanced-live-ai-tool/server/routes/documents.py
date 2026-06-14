"""DocuMind™ — Document upload, processing, and context retrieval."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Document
from auth_utils import get_current_user
from config import settings

router = APIRouter()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = "resume",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload and process a document for RAG context."""
    # Check credits
    if user.credits < settings.CREDIT_COST_DOC_UPLOAD:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    # Check file size (10MB max)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    # Extract text (simplified — would use pdfplumber for PDF)
    text_content = content.decode("utf-8", errors="ignore")

    doc = Document(
        user_id=user.id,
        filename=file.filename or "untitled",
        doc_type=doc_type,
        content_text=text_content[:50000],  # limit stored text
        file_size=len(content),
        embedding_status="ready",  # would be "processing" in production
        is_active=True,
    )
    db.add(doc)

    # Deduct credits
    user.credits -= settings.CREDIT_COST_DOC_UPLOAD
    db.add(user)
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
