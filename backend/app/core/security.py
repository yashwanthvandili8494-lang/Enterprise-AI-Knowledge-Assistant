import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Union
from passlib.context import CryptContext
from jose import jwt, JWTError
from app.core.config import settings

# Password hashing with Argon2 as primary and bcrypt as backward-compatible fallback
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto"
)

# In-memory revocation set for revoked refresh tokens (jti)
# In production clusters, this can also be backed by Redis
REVOKED_TOKENS: set[str] = set()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Safely verify a plain text password against an Argon2/bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password securely using Argon2."""
    return pwd_context.hash(password)


def create_access_token(
    subject: Union[str, Any],
    organization_id: str,
    role: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a signed JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "org_id": str(organization_id),
        "role": str(role),
        "type": "access",
        "jti": str(uuid.uuid4()),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(
    subject: Union[str, Any],
    organization_id: str,
    role: str,
    expires_delta: Optional[timedelta] = None
) -> tuple[str, str]:
    """
    Create a signed JWT refresh token.
    Returns (token_string, jti).
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    jti = str(uuid.uuid4())
    to_encode = {
        "sub": str(subject),
        "org_id": str(organization_id),
        "role": str(role),
        "type": "refresh",
        "jti": jti,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt, jti


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        jti = payload.get("jti")
        if jti and jti in REVOKED_TOKENS:
            raise JWTError("Token has been revoked")
        return payload
    except JWTError:
        raise


def revoke_token(jti: str) -> None:
    """Add a token identifier to the revocation set."""
    REVOKED_TOKENS.add(jti)
