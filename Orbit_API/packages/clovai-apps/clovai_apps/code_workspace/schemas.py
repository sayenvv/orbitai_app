from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CodeWorkspaceNode(BaseModel):
    """Project tree node — structure metadata only (no file contents)."""

    id: str
    kind: Literal["folder", "file"]
    name: str
    parent_id: str | None = Field(default=None, alias="parentId", serialization_alias="parentId")
    language: str | None = None

    model_config = {"populate_by_name": True}


class CodeWorkspaceUiState(BaseModel):
    explorer_focus_id: str | None = Field(
        default=None,
        alias="explorerFocusId",
        serialization_alias="explorerFocusId",
    )
    active_file_id: str | None = Field(
        default=None, alias="activeFileId", serialization_alias="activeFileId"
    )
    root_expanded: bool = Field(
        default=True, alias="rootExpanded", serialization_alias="rootExpanded"
    )
    expanded_folder_ids: list[str] = Field(
        default_factory=list, alias="expandedFolderIds", serialization_alias="expandedFolderIds"
    )
    open_file_ids: list[str] = Field(
        default_factory=list, alias="openFileIds", serialization_alias="openFileIds"
    )

    model_config = {"populate_by_name": True}


class CodeWorkspaceState(BaseModel):
    nodes: list[CodeWorkspaceNode] = Field(default_factory=list)
    ui: CodeWorkspaceUiState = Field(default_factory=CodeWorkspaceUiState)

    model_config = {"populate_by_name": True}


class CodeWorkspaceProjectCreateRequest(BaseModel):
    title: str = "Untitled project"
    description: str | None = None
    seed_demo: bool = Field(default=True, alias="seedDemo", serialization_alias="seedDemo")

    model_config = {"populate_by_name": True}


class CodeWorkspaceProjectUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None

    model_config = {"populate_by_name": True}


class CodeWorkspaceStructureUpdateRequest(BaseModel):
    nodes: list[CodeWorkspaceNode]
    ui: CodeWorkspaceUiState | None = None

    model_config = {"populate_by_name": True}


class CodeWorkspaceNodeCreateRequest(BaseModel):
    kind: Literal["folder", "file"]
    name: str
    parent_id: str | None = Field(default=None, alias="parentId")
    language: str | None = None

    model_config = {"populate_by_name": True}


class CodeWorkspaceNodeUpdateRequest(BaseModel):
    name: str | None = None
    language: str | None = None
    parent_id: str | None = Field(default=None, alias="parentId")

    model_config = {"populate_by_name": True}


class CodeWorkspaceProjectSummary(BaseModel):
    id: str
    title: str
    description: str | None = None
    updated_at: int = Field(alias="updatedAt", serialization_alias="updatedAt")

    model_config = {"populate_by_name": True}


class CodeWorkspaceProjectResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    updated_at: int = Field(alias="updatedAt", serialization_alias="updatedAt")
    state: CodeWorkspaceState

    model_config = {"populate_by_name": True}


class CodeWorkspaceProjectListResponse(BaseModel):
    data: list[CodeWorkspaceProjectSummary]

    model_config = {"populate_by_name": True}


class CodeWorkspaceNodeResponse(BaseModel):
    node: CodeWorkspaceNode
    state: CodeWorkspaceState

    model_config = {"populate_by_name": True}


class CodeWorkspaceFileContentResponse(BaseModel):
    node_id: str = Field(alias="nodeId", serialization_alias="nodeId")
    content: str = ""

    model_config = {"populate_by_name": True}


class CodeWorkspaceFileContentUpdateRequest(BaseModel):
    content: str = ""

    model_config = {"populate_by_name": True}


class CodeWorkspacePreferences(BaseModel):
    tab_size: Literal[2, 4, 8] = Field(default=2, alias="tabSize", serialization_alias="tabSize")
    font_size: int = Field(default=13, ge=11, le=20, alias="fontSize", serialization_alias="fontSize")
    word_wrap: bool = Field(default=True, alias="wordWrap", serialization_alias="wordWrap")
    line_numbers: bool = Field(default=True, alias="lineNumbers", serialization_alias="lineNumbers")
    auto_save: bool = Field(default=True, alias="autoSave", serialization_alias="autoSave")
    auto_save_delay_ms: Literal[500, 1000, 2000, 5000] = Field(
        default=1000, alias="autoSaveDelayMs", serialization_alias="autoSaveDelayMs"
    )
    seed_demo_on_create: bool = Field(
        default=True, alias="seedDemoOnCreate", serialization_alias="seedDemoOnCreate"
    )
    terminal_open_on_launch: bool = Field(
        default=True, alias="terminalOpenOnLaunch", serialization_alias="terminalOpenOnLaunch"
    )
    default_git_branch: str = Field(
        default="main", alias="defaultGitBranch", serialization_alias="defaultGitBranch", max_length=64
    )
    right_sidebar_open_on_launch: bool = Field(
        default=False,
        alias="rightSidebarOpenOnLaunch",
        serialization_alias="rightSidebarOpenOnLaunch",
    )

    model_config = {"populate_by_name": True}


class CodeWorkspaceSettingsResponse(BaseModel):
    storage_root_path: str | None = Field(
        default=None, alias="storageRootPath", serialization_alias="storageRootPath"
    )
    effective_storage_root_path: str = Field(
        alias="effectiveStorageRootPath", serialization_alias="effectiveStorageRootPath"
    )
    default_storage_root_path: str = Field(
        alias="defaultStorageRootPath", serialization_alias="defaultStorageRootPath"
    )
    preferences: CodeWorkspacePreferences = Field(default_factory=CodeWorkspacePreferences)

    model_config = {"populate_by_name": True}


class CodeWorkspaceSettingsUpdateRequest(BaseModel):
    storage_root_path: str | None = Field(
        default=None, alias="storageRootPath", serialization_alias="storageRootPath"
    )
    preferences: CodeWorkspacePreferences | None = None

    model_config = {"populate_by_name": True}


class CodeWorkspaceDeployRequest(BaseModel):
    target: Literal["clovops"] = "clovops"

    model_config = {"populate_by_name": True}


class CodeWorkspaceDeployLogEntry(BaseModel):
    level: Literal["info", "warn", "error", "success"] = "info"
    message: str
    timestamp: int = Field(alias="timestamp", serialization_alias="timestamp")

    model_config = {"populate_by_name": True}


class CodeWorkspaceDeployResponse(BaseModel):
    status: Literal["success", "failed"]
    stack: str
    deploy_url: str | None = Field(default=None, alias="deployUrl", serialization_alias="deployUrl")
    logs: list[CodeWorkspaceDeployLogEntry] = Field(default_factory=list)
    deployed_at: int = Field(alias="deployedAt", serialization_alias="deployedAt")

    model_config = {"populate_by_name": True}
