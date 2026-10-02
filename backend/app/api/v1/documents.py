import uuid
import json
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, delete
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.document import Document, DocumentStatus
from app.models.chunk import DocumentChunk
from app.models.permission import DocumentPermission
from app.core.dependencies import get_current_user, require_role
from app.core.config import settings
from app.storage.local import default_storage, sanitize_filename, calculate_checksum
from app.workers.queue import enqueue_document_processing
from app.services.audit_service import record_audit_log
from app.schemas.document import (
    DocumentResponse,
    DocumentListResponse,
    DocumentUpdateRequest,
    DocumentStatusResponse,
    DocumentChunkResponse,
    DocumentPermissionCreate,
    DocumentPermissionResponse,
)

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".csv", ".md"}


def _serialize_document(doc: Document, uploader_name: Optional[str] = None) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        organization_id=doc.organization_id,
        uploaded_by=doc.uploaded_by,
        uploader_name=uploader_name or (doc.uploader.name if doc.uploader else None),
        filename=doc.filename,
        content_type=doc.content_type,
        file_size=doc.file_size,
        checksum=doc.checksum,
        status=doc.status,
        category=doc.category,
        tags=doc.tags if isinstance(doc.tags, list) else [],
        chunk_count=doc.chunk_count,
        error_message=doc.error_message,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("General"),
    tags: Optional[str] = Form(""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a document (PDF, DOCX, TXT, CSV), store securely, and trigger
    background extraction and vector indexing.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read and validate size
    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB",
        )
    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    checksum = calculate_checksum(content)

    # Check for duplicate in organization
    dup_stmt = select(Document).where(
        and_(
            Document.organization_id == current_user.organization_id,
            Document.checksum == checksum,
        )
    )
    existing = (await db.execute(dup_stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An identical document already exists: '{existing.filename}' (Status: {existing.status})",
        )

    # Parse tags
    tag_list = []
    if tags:
        try:
            tag_list = json.loads(tags) if tags.startswith("[") else [t.strip() for t in tags.split(",") if t.strip()]
        except Exception:
            tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    # Secure storage key
    clean_name = sanitize_filename(file.filename or "uploaded_document")
    storage_key = f"{current_user.organization_id}/{uuid.uuid4()}_{clean_name}"
    await default_storage.save_file(content, storage_key)

    doc = Document(
        organization_id=current_user.organization_id,
        uploaded_by=current_user.id,
        filename=clean_name,
        storage_key=storage_key,
        content_type=file.content_type or "application/octet-stream",
        file_size=len(content),
        checksum=checksum,
        status=DocumentStatus.PENDING.value,
        category=category or "General",
        tags=tag_list,
        chunk_count=0,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Enqueue background processing
    await enqueue_document_processing(doc.id)

    await record_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="DOCUMENT_UPLOAD",
        resource_type="document",
        resource_id=doc.id,
        metadata={"filename": doc.filename, "size": doc.file_size, "category": doc.category},
    )

    return _serialize_document(doc, uploader_name=current_user.name)


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    query: Optional[str] = Query(None, description="Search term for filename"),
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lists organization documents with search, category filtering, and pagination."""
    stmt = select(Document).where(Document.organization_id == current_user.organization_id)

    if query:
        stmt = stmt.where(Document.filename.ilike(f"%{query.strip()}%"))
    if category:
        stmt = stmt.where(Document.category == category)
    if status_filter:
        stmt = stmt.where(Document.status == status_filter)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Pagination & sorting
    stmt = stmt.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    docs = (await db.execute(stmt)).scalars().all()

    # Pre-fetch uploaders
    uploader_ids = [d.uploaded_by for d in docs if d.uploaded_by]
    uploader_map = {}
    if uploader_ids:
        users = (await db.execute(select(User).where(User.id.in_(uploader_ids)))).scalars().all()
        uploader_map = {u.id: u.name for u in users}

    items = [_serialize_document(d, uploader_name=uploader_map.get(d.uploaded_by)) for d in docs]
    return DocumentListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve metadata for a specific document."""
    doc = await db.get(Document, document_id)
    if not doc or doc.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    uploader_name = None
    if doc.uploaded_by:
        uploader = await db.get(User, doc.uploaded_by)
        if uploader:
            uploader_name = uploader.name

    return _serialize_document(doc, uploader_name=uploader_name)


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve realtime processing status for polling/monitoring."""
    doc = await db.get(Document, document_id)
    if not doc or doc.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentStatusResponse(
        id=doc.id,
        status=doc.status,
        chunk_count=doc.chunk_count,
        error_message=doc.error_message,
        updated_at=doc.updated_at,
    )


@router.get("/{document_id}/sources", response_model=List[DocumentChunkResponse])
async def get_document_sources(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Inspect the extracted chunks and page references of a document."""
    doc = await db.get(Document, document_id)
    if not doc or doc.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    stmt = select(DocumentChunk).where(DocumentChunk.document_id == document_id).order_by(DocumentChunk.chunk_index.asc())
    chunks = (await db.execute(stmt)).scalars().all()
    return chunks


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    data: DocumentUpdateRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.KNOWLEDGE_MANAGER])),
    db: AsyncSession = Depends(get_db)
):
    """Update document category or tags (Admin / Knowledge Manager only)."""
    doc = await db.get(Document, document_id)
    if not doc or doc.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if data.category is not None:
        doc.category = data.category
    if data.tags is not None:
        doc.tags = data.tags

    await db.commit()
    await db.refresh(doc)
    return _serialize_document(doc)


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.KNOWLEDGE_MANAGER])),
    db: AsyncSession = Depends(get_db)
):
    """Deletes document, chunks, and storage file permanently."""
    doc = await db.get(Document, document_id)
    if not doc or doc.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Delete storage file
    await default_storage.delete_file(doc.storage_key)

    # Delete DB records (cascades to chunks and permissions)
    await db.delete(doc)
    await db.commit()

    await record_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="DOCUMENT_DELETE",
        resource_type="document",
        resource_id=document_id,
        metadata={"filename": doc.filename},
    )

    return {"message": "Document deleted successfully"}


@router.post("/{document_id}/retry", response_model=DocumentResponse)
async def retry_document_processing(
    document_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.KNOWLEDGE_MANAGER])),
    db: AsyncSession = Depends(get_db)
):
    """Retries processing for a failed document."""
    doc = await db.get(Document, document_id)
    if not doc or doc.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    doc.status = DocumentStatus.PENDING.value
    doc.error_message = None
    await db.commit()
    await db.refresh(doc)

    await enqueue_document_processing(doc.id)

    await record_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="DOCUMENT_RETRY",
        resource_type="document",
        resource_id=doc.id,
    )

    return _serialize_document(doc)


# ==========================================
# Document Permissions
# ==========================================
@router.get("/{document_id}/permissions", response_model=List[DocumentPermissionResponse])
async def get_document_permissions(
    document_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.KNOWLEDGE_MANAGER])),
    db: AsyncSession = Depends(get_db)
):
    """View access permissions assigned to a document."""
    doc = await db.get(Document, document_id)
    if not doc or doc.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    stmt = select(DocumentPermission).where(DocumentPermission.document_id == document_id)
    perms = (await db.execute(stmt)).scalars().all()
    return perms


@router.post("/{document_id}/permissions", response_model=DocumentPermissionResponse, status_code=status.HTTP_201_CREATED)
async def add_document_permission(
    document_id: str,
    data: DocumentPermissionCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.KNOWLEDGE_MANAGER])),
    db: AsyncSession = Depends(get_db)
):
    """Assign user- or role-specific access permission to a document."""
    doc = await db.get(Document, document_id)
    if not doc or doc.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    perm = DocumentPermission(
        document_id=document_id,
        user_id=data.user_id,
        role=data.role,
        permission=data.permission,
    )
    db.add(perm)
    await db.commit()
    await db.refresh(perm)
    return perm


@router.delete("/{document_id}/permissions/{permission_id}")
async def remove_document_permission(
    document_id: str,
    permission_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.KNOWLEDGE_MANAGER])),
    db: AsyncSession = Depends(get_db)
):
    """Revoke an access permission."""
    perm = await db.get(DocumentPermission, permission_id)
    if not perm or perm.document_id != document_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found")

    await db.delete(perm)
    await db.commit()
    return {"message": "Permission revoked"}
