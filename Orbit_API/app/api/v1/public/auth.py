import json
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import User
from app.schemas import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserProfileUpdate,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def get_current_user(
    db: Session = Depends(get_db),
    orbit_session: Annotated[str | None, Cookie(alias=settings.auth_cookie_name)] = None,
) -> User | None:
    if not orbit_session:
        return None
    payload = decode_access_token(orbit_session)
    if not payload or "sub" not in payload:
        return None
    try:
        user_id = UUID(payload["sub"])
    except ValueError:
        return None
    return db.query(User).filter(User.id == user_id).first()


def require_user(user: User | None = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def _set_auth_cookie(response: Response, user: User) -> None:
    token = create_access_token(str(user.id), {"role": user.role})
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.auth_cookie_max_age,
        path="/",
    )


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        email_verified=True,
        image=None,
        created_at=user.created_at,
        updated_at=user.created_at,
    )


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=body.email.lower(),
        name=body.name,
        password_hash=hash_password(body.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _set_auth_cookie(response, user)
    return AuthResponse(user=_user_response(user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Use admin portal to sign in")
    _set_auth_cookie(response, user)
    return AuthResponse(user=_user_response(user))


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(require_user)):
    return _user_response(user)


@router.patch("/me", response_model=UserResponse)
def update_me(
    body: UserProfileUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    user.name = body.name.strip()
    db.commit()
    db.refresh(user)
    return _user_response(user)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(settings.auth_cookie_name, path="/")
    return {"ok": True}
