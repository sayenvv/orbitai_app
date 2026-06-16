from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from clovai_apps.project_planning.schemas import ProjectPlanningWorksheetContent


class ProjectPlanningAiHistoryTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ProjectPlanningAiTextSelection(BaseModel):
    block_id: str = Field(alias="blockId")
    selected_text: str = Field(alias="selectedText")
    start: int
    end: int

    model_config = {"populate_by_name": True}


class ProjectPlanningAiAssistRequest(BaseModel):
    project_id: str = Field(alias="projectId")
    artifact_id: str = Field(alias="artifactId")
    message: str
    project_name: str = Field(alias="projectName")
    project_summary: str = Field(alias="projectSummary")
    phase_label: str = Field(alias="phaseLabel")
    artifact_label: str = Field(alias="artifactLabel")
    artifact_description: str = Field(alias="artifactDescription")
    artifact_format: Literal["diagram", "document", "matrix"] = Field(alias="artifactFormat")
    worksheet: ProjectPlanningWorksheetContent
    history: list[ProjectPlanningAiHistoryTurn] = Field(default_factory=list)
    text_selection: ProjectPlanningAiTextSelection | None = Field(default=None, alias="textSelection")
    context_scope: Literal["plan", "section"] = Field(default="plan", alias="contextScope")
    focused_section_label: str | None = Field(default=None, alias="focusedSectionLabel")
    focused_section_content: str | None = Field(default=None, alias="focusedSectionContent")

    model_config = {"populate_by_name": True}


class ProjectPlanningAiAssistResponse(BaseModel):
    reply: str
    worksheet: ProjectPlanningWorksheetContent | None = None
    worksheet_updated: bool = Field(default=False, alias="worksheetUpdated")

    model_config = {"populate_by_name": True}
