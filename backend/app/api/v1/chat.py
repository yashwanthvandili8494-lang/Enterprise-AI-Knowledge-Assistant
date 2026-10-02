from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.db.session import get_db
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.models.feedback import Feedback
from app.core.dependencies import get_current_user
from app.rag.pipeline import rag_pipeline
from app.services.audit_service import record_audit_log
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionDetailResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    Citation,
    FeedbackCreate,
    FeedbackResponse,
)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new conversational chat session."""
    session = ChatSession(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        title=data.title or "New Conversation",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0,
    )


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all chat sessions belonging to the current user."""
    stmt = (
        select(ChatSession, func.count(ChatMessage.id).label("msg_count"))
        .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
        .where(
            and_(
                ChatSession.user_id == current_user.id,
                ChatSession.organization_id == current_user.organization_id,
            )
        )
        .group_by(ChatSession.id)
        .order_by(ChatSession.updated_at.desc())
    )
    results = (await db.execute(stmt)).all()
    
    return [
        ChatSessionResponse(
            id=s.id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=count,
        )
        for s, count in results
    ]


@router.get("/sessions/{session_id}", response_model=ChatSessionDetailResponse)
async def get_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve complete message history and citations for a chat session."""
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id or session.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    stmt = select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
    messages = (await db.execute(stmt)).scalars().all()

    # Pre-fetch feedbacks for messages
    msg_ids = [m.id for m in messages]
    feedbacks_map = {}
    if msg_ids:
        fb_stmt = select(Feedback).where(Feedback.message_id.in_(msg_ids))
        feedbacks = (await db.execute(fb_stmt)).scalars().all()
        feedbacks_map = {fb.message_id: fb for fb in feedbacks}

    serialized_messages = []
    for m in messages:
        fb = feedbacks_map.get(m.id)
        serialized_messages.append(ChatMessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            retrieved_sources=m.retrieved_sources if isinstance(m.retrieved_sources, list) else [],
            created_at=m.created_at,
            feedback=FeedbackResponse.model_validate(fb) if fb else None,
        ))

    return ChatSessionDetailResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=serialized_messages,
    )


@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deletes a chat session and all associated messages."""
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id or session.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    await db.delete(session)
    await db.commit()
    return {"message": "Chat session deleted"}


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
async def send_chat_message(
    session_id: str,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a question in a chat session.
    Retrieves vector similarity chunks from authorized documents and generates
    grounded answer with genuine source citations.
    """
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id or session.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    # Step 1: Save User Question
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=data.content.strip(),
        retrieved_sources=[],
    )
    db.add(user_msg)
    await db.flush()

    # Step 2: Execute RAG Pipeline
    rag_result = await rag_pipeline.answer_question(
        db=db,
        query=data.content.strip(),
        user=current_user,
    )

    citations_data = [c.model_dump() for c in rag_result["citations"]]

    # Step 3: Save Assistant Response
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=rag_result["answer"],
        retrieved_sources=citations_data,
    )
    db.add(assistant_msg)

    # Update session title if first exchange
    if session.title == "New Conversation":
        summary = data.content.strip()[:40]
        session.title = summary + ("..." if len(data.content.strip()) > 40 else "")
    session.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(assistant_msg)

    await record_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="CHAT_QUERY",
        resource_type="chat",
        resource_id=session.id,
        metadata={"citations_count": len(citations_data)},
    )

    return ChatMessageResponse(
        id=assistant_msg.id,
        session_id=assistant_msg.session_id,
        role=assistant_msg.role,
        content=assistant_msg.content,
        retrieved_sources=rag_result["citations"],
        created_at=assistant_msg.created_at,
        feedback=None,
    )


@router.post("/messages/{message_id}/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    message_id: str,
    data: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submits helpful (+1) or not helpful (-1) rating on an AI answer."""
    msg = await db.get(ChatMessage, message_id)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    # Check session ownership
    session = await db.get(ChatSession, msg.session_id)
    if not session or session.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Upsert feedback
    fb_stmt = select(Feedback).where(Feedback.message_id == message_id)
    existing_fb = (await db.execute(fb_stmt)).scalar_one_or_none()

    if existing_fb:
        existing_fb.rating = data.rating
        existing_fb.comment = data.comment
        await db.commit()
        await db.refresh(existing_fb)
        return existing_fb

    fb = Feedback(
        message_id=message_id,
        user_id=current_user.id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)

    await record_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="FEEDBACK_SUBMIT",
        resource_type="feedback",
        resource_id=fb.id,
        metadata={"rating": data.rating},
    )

    return fb
