import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, ForeignKey, Index, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.user import User
    from app.models.feedback import Feedback


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="New Conversation", nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="chat_sessions")
    user: Mapped["User"] = relationship("User")
    messages: Mapped[List["ChatMessage"]] = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user", "assistant", "system"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    retrieved_sources: Mapped[list] = mapped_column(JSON, default=list, nullable=False)  # genuine citation chunks
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

    # Relationships
    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")
    feedback: Mapped[Optional["Feedback"]] = relationship("Feedback", back_populates="message", uselist=False, cascade="all, delete-orphan")
