import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.user import User


class DocumentPermission(Base):
    __tablename__ = "document_permissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)  # e.g. "EMPLOYEE", "KNOWLEDGE_MANAGER", "ADMIN", or null for specific user
    permission: Mapped[str] = mapped_column(String(20), default="READ", nullable=False)  # "READ", "WRITE", "ADMIN"
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="permissions")
    user: Mapped[Optional["User"]] = relationship("User")
