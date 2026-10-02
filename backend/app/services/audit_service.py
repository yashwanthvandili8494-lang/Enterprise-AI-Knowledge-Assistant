import logging
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

logger = logging.getLogger("enterprise_ai.audit")


async def record_audit_log(
    db: AsyncSession,
    organization_id: str,
    action: str,
    resource_type: str,
    actor_user_id: Optional[str] = None,
    resource_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Records an audit event in the database."""
    log_entry = AuditLog(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        audit_metadata=metadata or {},
        ip_address=ip_address,
    )
    db.add(log_entry)
    await db.commit()
    logger.info(f"AUDIT: [{action}] by user {actor_user_id} on {resource_type}:{resource_id}")
    return log_entry
