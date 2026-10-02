import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.models.chat import ChatMessage
    from app.models.user import User


class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_messages.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 (Helpful) or -1 (Unhelpful)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Relationships
    message: Mapped["ChatMessage"] = relationship("ChatMessage", back_populates="feedback")
    user: Mapped["User"] = relationship("User")
