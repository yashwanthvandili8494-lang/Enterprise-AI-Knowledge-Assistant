import uuid
from typing import List, TYPE_CHECKING
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.document import Document
    from app.models.chat import ChatSession


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="organization", cascade="all, delete-orphan")
    chat_sessions: Mapped[List["ChatSession"]] = relationship("ChatSession", back_populates="organization", cascade="all, delete-orphan")
