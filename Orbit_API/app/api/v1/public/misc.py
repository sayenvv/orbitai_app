from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import PublicAgentListResponse, PublicAgentResponse, SubscriptionResponse
from app.services.agent_registry import AgentRegistry

router = APIRouter(tags=["public"])


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


@router.get("/subscription", response_model=SubscriptionResponse)
def get_subscription():
    return SubscriptionResponse(plan="free")


@router.get("/files")
def list_files():
    return {"data": []}


@router.get("/study-materials")
def list_study_materials():
    return {"data": []}


@router.get("/library")
def list_library():
    return {"data": []}
