import uuid
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.models.organization import Organization


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    KNOWLEDGE_MANAGER = "KNOWLEDGE_MANAGER"
    EMPLOYEE = "EMPLOYEE"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default=UserRole.EMPLOYEE.value, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="users")
