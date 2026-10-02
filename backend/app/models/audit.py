import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Index, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.user import User


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    actor_user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    audit_metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    actor: Mapped[Optional["User"]] = relationship("User")
