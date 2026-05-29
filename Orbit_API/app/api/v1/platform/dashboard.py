from fastapi import APIRouter, Depends

from app.api.v1.public.auth import require_user
from app.models import User

router = APIRouter(prefix="/platform", tags=["platform"])


def require_admin(user: User = Depends(require_user)) -> User:
    if user.role not in ("admin", "superadmin"):
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/dashboard/stats")
def dashboard_stats(_: User = Depends(require_admin)):
    return {
        "users": 0,
        "conversations": 0,
        "active_agents": 0,
        "messages_today": 0,
    }


@router.get("/users")
def list_users(_: User = Depends(require_admin)):
    return {"data": [], "message": "Platform user API — wire admin-app here"}


@router.get("/conversations")
def list_all_conversations(_: User = Depends(require_admin)):
    return {"data": [], "message": "Platform conversations API — wire admin-app here"}


@router.get("/logs")
def list_logs(_: User = Depends(require_admin)):
    return {"data": []}
