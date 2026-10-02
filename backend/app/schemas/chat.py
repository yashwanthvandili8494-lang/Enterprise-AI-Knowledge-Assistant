from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class Citation(BaseModel):
    document_id: str
    document_name: str
    chunk_id: str
    page_number: Optional[int] = None
    excerpt: str
    similarity: Optional[float] = None


class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=-1, le=1)  # 1 or -1
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    message_id: str
    user_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1)


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    retrieved_sources: List[Citation] = []
    created_at: datetime
    feedback: Optional[FeedbackResponse] = None

    model_config = ConfigDict(from_attributes=True)


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class ChatSessionDetailResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageResponse] = []

    model_config = ConfigDict(from_attributes=True)
