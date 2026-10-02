from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.db.session import get_db
from app.models.user import User
from app.models.document import Document, DocumentStatus
from app.models.chat import ChatSession, ChatMessage
from app.models.feedback import Feedback
from app.models.audit import AuditLog
from app.core.dependencies import get_current_user
from app.schemas.dashboard import (
    DashboardOverviewResponse,
    OverviewMetricsResponse,
    RecentActivityItem,
    UsageStatsResponse,
)
from app.api.v1.documents import _serialize_document
from app.schemas.chat import ChatSessionResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Computes realtime operational metrics and recent activity for the organization."""
    org_id = current_user.organization_id

    # Document counts
    total_docs = (await db.execute(select(func.count(Document.id)).where(Document.organization_id == org_id))).scalar_one()
    completed_docs = (await db.execute(select(func.count(Document.id)).where(and_(Document.organization_id == org_id, Document.status == DocumentStatus.COMPLETED.value)))).scalar_one()
    failed_docs = (await db.execute(select(func.count(Document.id)).where(and_(Document.organization_id == org_id, Document.status == DocumentStatus.FAILED.value)))).scalar_one()
    pending_docs = (await db.execute(select(func.count(Document.id)).where(and_(Document.organization_id == org_id, Document.status.in_([DocumentStatus.PENDING.value, DocumentStatus.PROCESSING.value]))))).scalar_one()

    # User questions & sessions
    total_sessions = (await db.execute(select(func.count(ChatSession.id)).where(ChatSession.organization_id == org_id))).scalar_one()
    total_questions = (await db.execute(
        select(func.count(ChatMessage.id))
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .where(and_(ChatSession.organization_id == org_id, ChatMessage.role == "user"))
    )).scalar_one()
    total_users = (await db.execute(select(func.count(User.id)).where(User.organization_id == org_id))).scalar_one()

    # Feedback ratings
    pos_fb = (await db.execute(
        select(func.count(Feedback.id))
        .join(ChatMessage, Feedback.message_id == ChatMessage.id)
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .where(and_(ChatSession.organization_id == org_id, Feedback.rating == 1))
    )).scalar_one()
    
    neg_fb = (await db.execute(
        select(func.count(Feedback.id))
        .join(ChatMessage, Feedback.message_id == ChatMessage.id)
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .where(and_(ChatSession.organization_id == org_id, Feedback.rating == -1))
    )).scalar_one()

    total_fb = pos_fb + neg_fb
    helpful_ratio = round((pos_fb / total_fb * 100), 1) if total_fb > 0 else 100.0

    metrics = OverviewMetricsResponse(
        total_documents=total_docs,
        completed_documents=completed_docs,
        failed_documents=failed_docs,
        pending_documents=pending_docs,
        total_questions=total_questions,
        total_sessions=total_sessions,
        total_users=total_users,
        positive_feedback_count=pos_fb,
        negative_feedback_count=neg_fb,
        helpful_ratio_percent=helpful_ratio,
    )

    # Recent documents
    recent_docs_q = select(Document).where(Document.organization_id == org_id).order_by(Document.created_at.desc()).limit(5)
    recent_docs = (await db.execute(recent_docs_q)).scalars().all()

    # Recent user chat sessions
    recent_sess_q = select(ChatSession).where(
        and_(ChatSession.organization_id == org_id, ChatSession.user_id == current_user.id)
    ).order_by(ChatSession.updated_at.desc()).limit(5)
    recent_sessions = (await db.execute(recent_sess_q)).scalars().all()

    # Recent audit events
    audit_q = select(AuditLog).where(AuditLog.organization_id == org_id).order_by(AuditLog.created_at.desc()).limit(8)
    audit_logs = (await db.execute(audit_q)).scalars().all()
    
    # Pre-fetch user names for audit
    actor_ids = [a.actor_user_id for a in audit_logs if a.actor_user_id]
    user_map = {}
    if actor_ids:
        users = (await db.execute(select(User).where(User.id.in_(actor_ids)))).scalars().all()
        user_map = {u.id: u.name for u in users}

    activity_items = [
        RecentActivityItem(
            id=a.id,
            action=a.action,
            resource_type=a.resource_type,
            resource_id=a.resource_id,
            actor_name=user_map.get(a.actor_user_id, "System"),
            created_at=a.created_at,
        )
        for a in audit_logs
    ]

    return DashboardOverviewResponse(
        metrics=metrics,
        recent_documents=[_serialize_document(d) for d in recent_docs],
        recent_sessions=[
            ChatSessionResponse(id=s.id, title=s.title, created_at=s.created_at, updated_at=s.updated_at)
            for s in recent_sessions
        ],
        recent_activity=activity_items,
    )


@router.get("/usage", response_model=UsageStatsResponse)
async def get_usage_statistics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Computes document category and status distributions."""
    org_id = current_user.organization_id

    # Category breakdown
    cat_q = select(Document.category, func.count(Document.id)).where(Document.organization_id == org_id).group_by(Document.category)
    cat_results = (await db.execute(cat_q)).all()
    cat_counts = {cat: count for cat, count in cat_results}

    # Status breakdown
    status_q = select(Document.status, func.count(Document.id)).where(Document.organization_id == org_id).group_by(Document.status)
    status_results = (await db.execute(status_q)).all()
    status_counts = {st: count for st, count in status_results}

    return UsageStatsResponse(
        category_counts=cat_counts,
        status_counts=status_counts,
        daily_queries=[],
    )
