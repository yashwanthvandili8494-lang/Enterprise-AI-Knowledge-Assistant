from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class UserResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class UserRoleUpdateRequest(BaseModel):
    role: str
