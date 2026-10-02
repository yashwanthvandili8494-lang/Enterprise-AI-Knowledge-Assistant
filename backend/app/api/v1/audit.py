from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.core.dependencies import require_role
from app.schemas.audit import AuditLogListResponse, AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.KNOWLEDGE_MANAGER])),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve audit trail for security review (Admin & Knowledge Manager)."""
    stmt = select(AuditLog).where(AuditLog.organization_id == current_user.organization_id)

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    logs = (await db.execute(stmt)).scalars().all()

    # Pre-fetch actor users
    actor_ids = [l.actor_user_id for l in logs if l.actor_user_id]
    actor_map = {}
    if actor_ids:
        users = (await db.execute(select(User).where(User.id.in_(actor_ids)))).scalars().all()
        actor_map = {u.id: (u.name, u.email) for u in users}

    items = []
    for l in logs:
        user_info = actor_map.get(l.actor_user_id, ("System", None))
        items.append(AuditLogResponse(
            id=l.id,
            organization_id=l.organization_id,
            actor_user_id=l.actor_user_id,
            actor_name=user_info[0],
            actor_email=user_info[1],
            action=l.action,
            resource_type=l.resource_type,
            resource_id=l.resource_id,
            audit_metadata=l.audit_metadata or {},
            ip_address=l.ip_address,
            created_at=l.created_at,
        ))

    return AuditLogListResponse(items=items, total=total, page=page, page_size=page_size)
