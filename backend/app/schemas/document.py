from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class DocumentResponse(BaseModel):
    id: str
    organization_id: str
    uploaded_by: Optional[str] = None
    uploader_name: Optional[str] = None
    filename: str
    content_type: str
    file_size: int
    checksum: str
    status: str
    category: str
    tags: List[str] = []
    chunk_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int


class DocumentUpdateRequest(BaseModel):
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class DocumentStatusResponse(BaseModel):
    id: str
    status: str
    chunk_count: int
    error_message: Optional[str] = None
    updated_at: datetime


class DocumentChunkResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    content: str
    page_number: Optional[int] = None
    chunk_metadata: dict = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentPermissionCreate(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None
    permission: str = "READ"


class DocumentPermissionResponse(BaseModel):
    id: str
    document_id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    role: Optional[str] = None
    permission: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
