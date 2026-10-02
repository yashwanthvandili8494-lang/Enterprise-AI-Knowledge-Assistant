from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    revoke_token,
)
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserProfileResponse,
)
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Registers a new user within an organization."""
    # Check if email already registered
    existing_user = (await db.execute(select(User).where(User.email == data.email.lower()))).scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Find or create organization
    org_name = data.organization_name or "Acme Enterprise"
    org = (await db.execute(select(Organization).where(Organization.name == org_name))).scalar_one_or_none()
    if not org:
        org = Organization(name=org_name)
        db.add(org)
        await db.flush()

    # Determine role: first user in org gets ADMIN, subsequent get EMPLOYEE
    user_count = (await db.execute(select(User).where(User.organization_id == org.id))).scalars().all()
    assigned_role = UserRole.ADMIN.value if len(user_count) == 0 else UserRole.EMPLOYEE.value

    # Create user
    new_user = User(
        name=data.name,
        email=data.email.lower(),
        password_hash=get_password_hash(data.password),
        role=assigned_role,
        organization_id=org.id,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Issue tokens
    access_token = create_access_token(new_user.id, org.id, new_user.role)
    refresh_token, jti = create_refresh_token(new_user.id, org.id, new_user.role)

    # Set secure HTTP-only cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="lax",
    )

    client_ip = request.client.host if request.client else None
    await record_audit_log(
        db,
        organization_id=org.id,
        actor_user_id=new_user.id,
        action="AUTH_REGISTER",
        resource_type="user",
        resource_id=new_user.id,
        metadata={"email": new_user.email, "role": new_user.role},
        ip_address=client_ip,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserProfileResponse(
            id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            role=new_user.role,
            organization_id=org.id,
            organization_name=org.name,
            is_active=new_user.is_active,
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Authenticates credentials and returns JWT access & refresh tokens."""
    stmt = select(User).where(User.email == data.email.lower())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your administrator.",
        )

    # Fetch organization
    org = await db.get(Organization, user.organization_id)
    org_name = org.name if org else "Acme Enterprise"

    access_token = create_access_token(user.id, user.organization_id, user.role)
    refresh_token, jti = create_refresh_token(user.id, user.organization_id, user.role)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="lax",
    )

    client_ip = request.client.host if request.client else None
    await record_audit_log(
        db,
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="AUTH_LOGIN",
        resource_type="auth",
        resource_id=user.id,
        metadata={"email": user.email},
        ip_address=client_ip,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserProfileResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            organization_id=user.organization_id,
            organization_name=org_name,
            is_active=user.is_active,
        ),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    request: Request,
    response: Response,
    data: RefreshTokenRequest = None,
    db: AsyncSession = Depends(get_db)
):
    """Rotates refresh token and generates a fresh access token."""
    token = None
    if data and data.refresh_token:
        token = data.refresh_token
    elif "refresh_token" in request.cookies:
        token = request.cookies.get("refresh_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type for refresh",
            )
        old_jti = payload.get("jti")
        user_id = payload.get("sub")
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid refresh token: {str(e)}",
        )

    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Revoke old refresh token (rotation)
    if old_jti:
        revoke_token(old_jti)

    # Issue new pair
    access_token = create_access_token(user.id, user.organization_id, user.role)
    new_refresh_token, new_jti = create_refresh_token(user.id, user.organization_id, user.role)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="lax",
    )

    org = await db.get(Organization, user.organization_id)
    org_name = org.name if org else "Acme Enterprise"

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserProfileResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            organization_id=user.organization_id,
            organization_name=org_name,
            is_active=user.is_active,
        ),
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logs out user and invalidates cookies and tokens."""
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        try:
            payload = decode_token(refresh_token)
            jti = payload.get("jti")
            if jti:
                revoke_token(jti)
        except Exception:
            pass

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    await record_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="AUTH_LOGOUT",
        resource_type="auth",
        resource_id=current_user.id,
    )

    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns the authenticated user's profile and organization."""
    org = await db.get(Organization, current_user.organization_id)
    return UserProfileResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        organization_id=current_user.organization_id,
        organization_name=org.name if org else "Acme Enterprise",
        is_active=current_user.is_active,
    )
