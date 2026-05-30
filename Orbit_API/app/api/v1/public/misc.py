from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.public.auth import get_current_user, require_user
from app.db.session import get_db
from app.models import User
from app.schemas import PlanLimitItem, PlanLimitsResponse, PublicAgentListResponse, PublicAgentResponse, SubscriptionResponse
from app.services.agent_registry import AgentRegistry
from app.services.plan_limit_store import list_plan_limits
from app.services.token_usage import ensure_current_period, get_usage_snapshot

router = APIRouter(tags=["public"])


def _subscription_response(user: User) -> SubscriptionResponse:
    snapshot = get_usage_snapshot(user)
    return SubscriptionResponse(
        plan=snapshot.plan,
        tokens_used=snapshot.tokens_used,
        tokens_limit=snapshot.tokens_limit,
        tokens_remaining=snapshot.tokens_remaining,
        period_start=snapshot.period_start,
        period_end=snapshot.period_end,
        usage_percent=snapshot.usage_percent,
        limit_reached=snapshot.limit_reached,
    )


@router.get("/agents", response_model=PublicAgentListResponse)
def list_agents(db: Session = Depends(get_db)):
    agents = AgentRegistry(db).list_active_public()
    return PublicAgentListResponse(
        data=[
            PublicAgentResponse(
                id=a.id,
                slug=a.slug,
                name=a.name,
                short_name=a.short_name,
                description=a.description,
                icon_key=a.icon_key,
                color_key=a.color_key,
            )
            for a in agents
        ]
    )


@router.get("/plans", response_model=PlanLimitsResponse)
def list_subscription_plans(db: Session = Depends(get_db)):
    return PlanLimitsResponse(data=[PlanLimitItem(**item) for item in list_plan_limits(db)])


@router.get("/subscription", response_model=SubscriptionResponse)
def get_subscription(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    ensure_current_period(db, user)
    return _subscription_response(user)


@router.get("/files")
def list_files():
    return {"data": []}


@router.get("/study-materials")
def list_study_materials():
    return {"data": []}


@router.get("/library")
def list_library():
    return {"data": []}
