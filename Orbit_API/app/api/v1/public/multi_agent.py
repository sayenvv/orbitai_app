from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.public.auth import require_chat_user
from app.models import User
from app.orchestration.multi_agent import get_group_chat_orchestrator
from app.schemas import (
    MultiAgentHumanInputRequest,
    MultiAgentMessageResponse,
    MultiAgentRoutingResponse,
    MultiAgentRunResponse,
    MultiAgentStartRequest,
)
from orbit_orchestration.domain.routing import TaskRouting
from orbit_orchestration.domain.types import OrchestrationRun

router = APIRouter(prefix="/multi-agent", tags=["multi-agent"])


def _routing_to_response(routing: TaskRouting | None) -> MultiAgentRoutingResponse | None:
    if routing is None:
        return None
    return MultiAgentRoutingResponse(
        primary_agent=routing.primary_agent,
        selected_agents=list(routing.selected_agents),
        intent=routing.intent,
        topics=list(routing.topics),
        reasoning=routing.reasoning,
    )


def _to_response(run: OrchestrationRun) -> MultiAgentRunResponse:
    return MultiAgentRunResponse(
        session_id=run.session_id,
        status=run.status.value if hasattr(run.status, "value") else str(run.status),
        task=run.task,
        routing=_routing_to_response(run.routing),
        messages=[
            MultiAgentMessageResponse(source=m.source, content=m.content) for m in run.messages
        ],
        human_prompt=run.human_prompt,
        result=run.result,
        error=run.error,
    )


@router.post("/runs", response_model=MultiAgentRunResponse)
async def start_multi_agent_run(
    body: MultiAgentStartRequest,
    user: User = Depends(require_chat_user),
):
    _ = user
    orchestrator = get_group_chat_orchestrator()
    try:
        run = await orchestrator.start(body.task)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Multi-agent orchestration failed: {exc}",
        ) from exc
    return _to_response(run)


@router.get("/runs/{session_id}", response_model=MultiAgentRunResponse)
async def get_multi_agent_run(
    session_id: str,
    user: User = Depends(require_chat_user),
):
    _ = user
    orchestrator = get_group_chat_orchestrator()
    run = orchestrator.get_session(session_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return _to_response(run)


@router.post("/runs/{session_id}/human-input", response_model=MultiAgentRunResponse)
async def resume_multi_agent_run(
    session_id: str,
    body: MultiAgentHumanInputRequest,
    user: User = Depends(require_chat_user),
):
    _ = user
    orchestrator = get_group_chat_orchestrator()
    try:
        run = await orchestrator.resume(session_id, body.human_input)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Multi-agent resume failed: {exc}",
        ) from exc
    return _to_response(run)
