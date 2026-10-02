import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, DateTime, ForeignKey, Index, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now
from app.db.vector_type import VectorType
from app.core.config import settings

if TYPE_CHECKING:
    from app.models.document import Document


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding = mapped_column(VectorType(dim=settings.EMBEDDING_DIMENSIONS), nullable=True)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chunk_metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Relationship
    document: Mapped["Document"] = relationship("Document", back_populates="chunks")
