from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    organization_name: Optional[str] = Field("Acme Enterprise", min_length=2, max_length=100)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    organization_id: str
    organization_name: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfileResponse
