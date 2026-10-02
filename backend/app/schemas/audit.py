from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    id: str
    organization_id: str
    actor_user_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_email: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    audit_metadata: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
