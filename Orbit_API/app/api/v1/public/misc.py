from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.public.auth import require_chat_user
from app.db.session import get_db
from app.models import Agent, User
from app.schemas import (
    DefaultChatResponse,
    LibraryGeneratedFileResponse,
    LibraryResponse,
    PlanLimitItem,
    PlanLimitsResponse,
    PublicAgentListResponse,
    PublicAgentResponse,
    RagDocumentListResponse,
    RagDocumentResponse,
    SubscriptionResponse,
)
from app.services.agent_registry import AgentRegistry, CLOVAI_AGENT_SLUG
from app.services.library_store import list_user_library
from app.services.plan_limit_store import list_plan_limits
from app.services.rag.document_store import list_user_documents
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


@router.get("/default-chat", response_model=DefaultChatResponse)
def default_chat(db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.slug == CLOVAI_AGENT_SLUG).first()
    if agent:
        return DefaultChatResponse(
            assistant_name=agent.name,
            description=agent.description
            or "Your AI assistant for study, research, writing, and everyday questions.",
        )
    config = AgentRegistry(db).get_clovai()
    return DefaultChatResponse(
        assistant_name=config.name if config else "Assistant",
        description="Your AI assistant for study, research, writing, and everyday questions.",
    )


@router.get("/plans", response_model=PlanLimitsResponse)
def list_subscription_plans(db: Session = Depends(get_db)):
    return PlanLimitsResponse(data=[PlanLimitItem(**item) for item in list_plan_limits(db)])


@router.get("/subscription", response_model=SubscriptionResponse)
def get_subscription(
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    ensure_current_period(db, user)
    return _subscription_response(user)


@router.get("/files", response_model=RagDocumentListResponse)
def list_files_legacy(
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    return RagDocumentListResponse(
        data=[RagDocumentResponse(**item) for item in list_user_documents(db, user.id)]
    )


@router.get("/study-materials")
def list_study_materials():
    return {"data": []}


@router.get("/library", response_model=LibraryResponse)
def list_library(
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    payload = list_user_library(db, user.id)
    return LibraryResponse(
        uploads=[RagDocumentResponse(**item) for item in payload["uploads"]],
        generated=[LibraryGeneratedFileResponse(**item) for item in payload["generated"]],
    )
