from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User, UserRole
from app.core.dependencies import get_current_user, require_role
from app.schemas.user import UserResponse, UserUpdateRequest, UserRoleUpdateRequest
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all users within the current user's organization."""
    stmt = select(User).where(User.organization_id == current_user.organization_id).order_by(User.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve a specific user profile within organization."""
    user = await db.get(User, user_id)
    if not user or user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user info (Self or Admin)."""
    if current_user.id != user_id and current_user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this user")

    user = await db.get(User, user_id)
    if not user or user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if data.name is not None:
        user.name = data.name
    if data.is_active is not None:
        if current_user.role != UserRole.ADMIN.value:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admins can change user active status")
        user.is_active = data.is_active

    await db.commit()
    await db.refresh(user)

    await record_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="USER_UPDATE",
        resource_type="user",
        resource_id=user.id,
        metadata={"updated_fields": list(data.model_dump(exclude_unset=True).keys())},
    )

    return user


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    data: UserRoleUpdateRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """Admin-only endpoint to promote/demote user roles."""
    if data.role not in [UserRole.ADMIN.value, UserRole.KNOWLEDGE_MANAGER.value, UserRole.EMPLOYEE.value]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role specified")

    user = await db.get(User, user_id)
    if not user or user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    old_role = user.role
    user.role = data.role
    await db.commit()
    await db.refresh(user)

    await record_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="USER_ROLE_CHANGE",
        resource_type="user",
        resource_id=user.id,
        metadata={"old_role": old_role, "new_role": data.role},
    )

    return user
