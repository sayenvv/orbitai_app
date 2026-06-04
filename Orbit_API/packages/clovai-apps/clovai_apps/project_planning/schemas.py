from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ProjectPlanningWorksheetContent(BaseModel):
    blocks: list[dict[str, Any]] = Field(default_factory=list)


class ProjectPlanningArtifactRecord(BaseModel):
    id: str
    phase_id: str = Field(alias="phaseId")
    label: str
    description: str
    format: Literal["diagram", "document", "matrix"]
    worksheet: ProjectPlanningWorksheetContent | None = None

    model_config = {"populate_by_name": True}


class ProjectPlanningPhaseRecord(BaseModel):
    id: str
    label: str
    artifacts: list[ProjectPlanningArtifactRecord]


class ProjectPlanningWorkspaceState(BaseModel):
    reviewed_artifact_ids: list[str] = Field(default_factory=list, alias="reviewedArtifactIds")
    active_phase_id: str = Field(alias="activePhaseId")
    active_artifact_id: str | None = Field(default=None, alias="activeArtifactId")
    worksheets_by_artifact_id: dict[str, ProjectPlanningWorksheetContent] = Field(
        default_factory=dict,
        alias="worksheetsByArtifactId",
    )

    model_config = {"populate_by_name": True}


class ProjectPlanningDocument(BaseModel):
    id: str
    name: str
    summary: str
    stack: dict[str, str]
    phases: list[ProjectPlanningPhaseRecord]
    state: ProjectPlanningWorkspaceState
    updated_at: str = Field(alias="updatedAt")

    model_config = {"populate_by_name": True}


class ProjectPlanningSaveResponse(BaseModel):
    project_id: str = Field(alias="projectId")
    relative_path: str = Field(alias="relativePath")
    updated_at: str = Field(alias="updatedAt")

    model_config = {"populate_by_name": True}
