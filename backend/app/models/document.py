import uuid
from enum import Enum
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, DateTime, ForeignKey, Index, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.user import User
    from app.models.chunk import DocumentChunk
    from app.models.permission import DocumentPermission


class DocumentStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # SHA-256
    status: Mapped[str] = mapped_column(String(50), default=DocumentStatus.PENDING.value, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="General", index=True, nullable=False)
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="documents")
    uploader: Mapped[Optional["User"]] = relationship("User")
    chunks: Mapped[List["DocumentChunk"]] = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    permissions: Mapped[List["DocumentPermission"]] = relationship("DocumentPermission", back_populates="document", cascade="all, delete-orphan")
