from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from app.schemas.document import DocumentResponse
from app.schemas.chat import ChatSessionResponse


class OverviewMetricsResponse(BaseModel):
    total_documents: int
    completed_documents: int
    failed_documents: int
    pending_documents: int
    total_questions: int
    total_sessions: int
    total_users: int
    positive_feedback_count: int
    negative_feedback_count: int
    helpful_ratio_percent: float


class RecentActivityItem(BaseModel):
    id: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    actor_name: Optional[str] = "System"
    created_at: datetime


class DashboardOverviewResponse(BaseModel):
    metrics: OverviewMetricsResponse
    recent_documents: List[DocumentResponse]
    recent_sessions: List[ChatSessionResponse]
    recent_activity: List[RecentActivityItem]


class UsageStatsResponse(BaseModel):
    category_counts: Dict[str, int]
    status_counts: Dict[str, int]
    daily_queries: List[Dict[str, Any]]
