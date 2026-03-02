"""
Document management routes — DocuMind™.  /api/documents prefix.
Upload, list, toggle, delete documents for RAG context.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User, Document
from app.auth import get_user_id

logger = logging.getLogger("app.api.documents")
router = APIRouter(prefix="/api/documents", tags=["DocuMind™"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_UPLOADS_FREE = 5
MAX_UPLOADS_PRO = 20


@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    doc_type: str = "general",
    db: AsyncSession = Depends(get_db),
):
    """Upload a document for RAG context injection."""
    user_id = get_user_id(request)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, f"File exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit")

    # Count existing docs
    result = await db.execute(select(Document).where(Document.user_id == user_id))
    existing = len(result.scalars().all())
    if existing >= MAX_UPLOADS_PRO:
        raise HTTPException(429, f"Maximum {MAX_UPLOADS_PRO} uploads reached")

    # Extract text (UTF-8 best-effort)
    try:
        text_content = content.decode("utf-8", errors="replace")[:50000]
    except Exception:
        text_content = ""

    doc = Document(
        user_id=user_id,
        filename=file.filename or "untitled",
        doc_type=doc_type,
        content_text=text_content,
        embedding_status="ready",
        is_active=True,
        file_size=len(content),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return {
        "id": str(doc.id),
        "filename": doc.filename,
        "doc_type": doc.doc_type,
        "file_size": doc.file_size,
        "embedding_status": doc.embedding_status,
        "is_active": doc.is_active,
        "created_at": doc.created_at.isoformat(),
    }


@router.get("/")
async def list_documents(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """List user's documents."""
    result = await db.execute(
        select(Document).where(Document.user_id == user_id).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "filename": d.filename,
            "doc_type": d.doc_type,
            "file_size": d.file_size,
            "embedding_status": d.embedding_status,
            "is_active": d.is_active,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]


@router.put("/{doc_id}/toggle")
async def toggle_document(doc_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """Toggle document active/inactive for RAG context."""
    result = await db.execute(select(Document).where(Document.id == doc_id, Document.user_id == user_id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(404, "Document not found")
    doc.is_active = not doc.is_active
    await db.commit()
    return {"id": str(doc.id), "is_active": doc.is_active}


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_user_id(request)
    """Delete a document."""
    result = await db.execute(select(Document).where(Document.id == doc_id, Document.user_id == user_id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(404, "Document not found")
    await db.delete(doc)
    await db.commit()
    return {"deleted": True, "id": str(doc_id)}
