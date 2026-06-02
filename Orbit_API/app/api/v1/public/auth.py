from enum import Enum
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
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


class AuthRealm(str, Enum):
    chat = "chat"
    control = "control"
    admin = "admin"


REALM_ALLOWED_ROLES: dict[AuthRealm, frozenset[str]] = {
    AuthRealm.chat: frozenset({"user"}),
    AuthRealm.control: frozenset({"operator", "admin", "superadmin"}),
    AuthRealm.admin: frozenset({"admin", "superadmin"}),
}


def _cookie_name_for_realm(realm: AuthRealm) -> str:
    if realm is AuthRealm.chat:
        return settings.auth_cookie_chat
    if realm is AuthRealm.control:
        return settings.auth_cookie_control
    return settings.auth_cookie_admin


def _user_from_token(token: str | None, db: Session) -> User | None:
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    try:
        user_id = UUID(payload["sub"])
    except ValueError:
        return None
    return db.query(User).filter(User.id == user_id).first()


def _get_user_for_realm(realm: AuthRealm):
    cookie_name = _cookie_name_for_realm(realm)

    def dependency(request: Request, db: Session = Depends(get_db)) -> User | None:
        return _user_from_token(request.cookies.get(cookie_name), db)

    return dependency


get_chat_user = _get_user_for_realm(AuthRealm.chat)
get_control_user = _get_user_for_realm(AuthRealm.control)
get_admin_user = _get_user_for_realm(AuthRealm.admin)


def _require_user_for_realm(realm: AuthRealm):
    get_user = _get_user_for_realm(realm)

    def dependency(user: Annotated[User | None, Depends(get_user)]) -> User:
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        return user

    return dependency


require_chat_user = _require_user_for_realm(AuthRealm.chat)
require_control_user = _require_user_for_realm(AuthRealm.control)
require_admin_user = _require_user_for_realm(AuthRealm.admin)


def _set_auth_cookie(response: Response, realm: AuthRealm, user: User) -> None:
    token = create_access_token(str(user.id), {"role": user.role, "realm": realm.value})
    response.set_cookie(
        key=_cookie_name_for_realm(realm),
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.auth_cookie_max_age,
        path="/",
    )
    if settings.auth_cookie_name != _cookie_name_for_realm(realm):
        response.delete_cookie(
            settings.auth_cookie_name,
            path="/",
            secure=settings.cookie_secure,
            samesite=settings.cookie_samesite,
        )


def _clear_auth_cookie(response: Response, realm: AuthRealm) -> None:
    response.delete_cookie(
        _cookie_name_for_realm(realm),
        path="/",
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
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


def _login_for_realm(
    realm: AuthRealm,
    body: LoginRequest,
    response: Response,
    db: Session,
) -> AuthResponse:
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.role not in REALM_ALLOWED_ROLES[realm]:
        raise HTTPException(status_code=403, detail="Account not permitted for this application")
    _set_auth_cookie(response, realm, user)
    return AuthResponse(user=_user_response(user))


@router.post("/chat/register", response_model=AuthResponse)
def chat_register(
    body: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    enforce_rate_limit(
        request,
        scope="auth-register",
        limit=settings.rate_limit_register_per_minute,
    )
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
    _set_auth_cookie(response, AuthRealm.chat, user)
    return AuthResponse(user=_user_response(user))


@router.post("/chat/login", response_model=AuthResponse)
def chat_login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    enforce_rate_limit(
        request,
        scope="auth-login",
        limit=settings.rate_limit_auth_per_minute,
    )
    return _login_for_realm(AuthRealm.chat, body, response, db)


@router.get("/chat/me", response_model=UserResponse)
def chat_me(user: User = Depends(require_chat_user)):
    return _user_response(user)


@router.patch("/chat/me", response_model=UserResponse)
def chat_update_me(
    body: UserProfileUpdate,
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    user.name = body.name.strip()
    db.commit()
    db.refresh(user)
    return _user_response(user)


@router.post("/chat/logout")
def chat_logout(response: Response):
    _clear_auth_cookie(response, AuthRealm.chat)
    return {"ok": True}


@router.post("/control/login", response_model=AuthResponse)
def control_login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    enforce_rate_limit(
        request,
        scope="auth-login",
        limit=settings.rate_limit_auth_per_minute,
    )
    return _login_for_realm(AuthRealm.control, body, response, db)


@router.get("/control/me", response_model=UserResponse)
def control_me(user: User = Depends(require_control_user)):
    return _user_response(user)


@router.post("/control/logout")
def control_logout(response: Response):
    _clear_auth_cookie(response, AuthRealm.control)
    return {"ok": True}


@router.post("/admin/login", response_model=AuthResponse)
def admin_login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    enforce_rate_limit(
        request,
        scope="auth-login",
        limit=settings.rate_limit_auth_per_minute,
    )
    return _login_for_realm(AuthRealm.admin, body, response, db)


@router.get("/admin/me", response_model=UserResponse)
def admin_me(user: User = Depends(require_admin_user)):
    return _user_response(user)


@router.post("/admin/logout")
def admin_logout(response: Response):
    _clear_auth_cookie(response, AuthRealm.admin)
    return {"ok": True}
