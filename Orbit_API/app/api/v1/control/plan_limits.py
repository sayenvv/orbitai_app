from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.control.agents import require_operator
from app.db.session import get_db
from app.models import User
from app.schemas import PlanLimitItem, PlanLimitsResponse, PlanLimitsUpdate
from app.services.plan_limit_store import list_plan_limits, update_plan_limits

router = APIRouter(prefix="/control", tags=["control"])


@router.get("/plan-limits", response_model=PlanLimitsResponse)
def get_plan_limits(
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    return PlanLimitsResponse(data=[PlanLimitItem(**item) for item in list_plan_limits(db)])


@router.patch("/plan-limits", response_model=PlanLimitsResponse)
def patch_plan_limits(
    body: PlanLimitsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    try:
        updates = {
            plan: patch.model_dump(exclude_unset=True)
            for plan, patch in body.plans.items()
        }
        items = update_plan_limits(db, updates)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PlanLimitsResponse(data=[PlanLimitItem(**item) for item in items])
