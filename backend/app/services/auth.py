"""
CounselAI – Auth Service
JWT access/refresh tokens, bcrypt hashing, refresh token rotation.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.database import RefreshToken, User, get_db

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto",
                              bcrypt__rounds=settings.BCRYPT_ROUNDS)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ── Password ──────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {"sub": str(user_id), "email": email, "exp": expire, "type": "access"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def create_refresh_token_pair() -> tuple[str, str]:
    """Returns (raw_token, sha256_hash). Store hash; send raw."""
    raw    = secrets.token_urlsafe(64)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            raise JWTError("Wrong token type")
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ── DB helpers ────────────────────────────────────────────────────────────────

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    r = await db.execute(select(User).where(User.email == email.lower()))
    return r.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
    r = await db.execute(select(User).where(User.id == user_id))
    return r.scalar_one_or_none()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user if user.is_active else None


async def register_user(db: AsyncSession, email: str, full_name: str,
                         password: str) -> User:
    if await get_user_by_email(db, email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=email.lower().strip(),
        full_name=full_name.strip(),
        hashed_password=hash_password(password),
    )
    db.add(user)
    await db.flush()
    return user


async def persist_refresh_token(db: AsyncSession, user_id: UUID,
                                  token_hash: str) -> None:
    db.add(RefreshToken(
        token_hash=token_hash,
        user_id=user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))


async def rotate_refresh_token(db: AsyncSession, raw_token: str,
                                ) -> tuple[User, str, str]:
    """Revoke old token, issue new access+refresh pair."""
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    r  = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
    )
    rt = r.scalar_one_or_none()
    if not rt or rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    rt.revoked = True
    user       = await get_user_by_id(db, rt.user_id)
    new_raw, new_hash = create_refresh_token_pair()
    await persist_refresh_token(db, user.id, new_hash)

    return user, create_access_token(str(user.id), user.email), new_raw


# ── FastAPI dependency ────────────────────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_access_token(token)
    user    = await get_user_by_id(db, UUID(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user
