"""
CounselAI – Auth Endpoints
POST /register, /login, /refresh, /logout
"""
from fastapi import APIRouter, Depends, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.database import get_db
from backend.app.schemas.schemas import (
    LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserOut,
)
from backend.app.services.auth import (
    authenticate_user, create_access_token, create_refresh_token_pair,
    get_current_user, persist_refresh_token, register_user, rotate_refresh_token,
)

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user           = await register_user(db, body.email, body.full_name, body.password)
    raw, hashed    = create_refresh_token_pair()
    await persist_refresh_token(db, user.id, hashed)
    return TokenResponse(
        access_token=create_access_token(str(user.id), user.email),
        refresh_token=raw,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    user = await authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    raw, hashed = create_refresh_token_pair()
    await persist_refresh_token(db, user.id, hashed)
    return TokenResponse(
        access_token=create_access_token(str(user.id), user.email),
        refresh_token=raw,
    )


@router.post("/login/form", response_model=TokenResponse, include_in_schema=False)
async def login_form(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """OAuth2 compatible form login (for Swagger UI)."""
    from fastapi import HTTPException
    user = await authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    raw, hashed = create_refresh_token_pair()
    await persist_refresh_token(db, user.id, hashed)
    return TokenResponse(
        access_token=create_access_token(str(user.id), user.email),
        refresh_token=raw,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    user, access, new_refresh = await rotate_refresh_token(db, body.refresh_token)
    return TokenResponse(access_token=access, refresh_token=new_refresh)


@router.post("/logout", status_code=204)
async def logout():
    """Client should discard tokens. Refresh token is invalidated on next rotate."""
    return Response(status_code=204)


@router.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return user
