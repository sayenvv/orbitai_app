export const appSlug = "research-companion";
export { ResearchCompanionApp } from "./research-companion-app";
export type {
  ResearchCompanionAppProps,
  RecentWorkspace,
  ResearchCompanionView,
  ResearchCompanionWorkspaceTab,
} from "./research-companion-app";
export { ResearchCompanionWorkspaceChrome } from "./research-companion-workspace-chrome";
export { ResearchCompanionWorkspaceShimmer } from "./research-companion-workspace-shimmer";
export {
  DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES,
  RESEARCH_COMPANION_INSIGHT_OPTIONS,
  getMissingInsightTypes,
  mergeInsightTypes,
  normalizeResearchCompanionInsightTypes,
  parseResearchCompanionInsightTypesParam,
  serializeResearchCompanionInsightTypes,
} from "./insight-types";
export type {
  ResearchCompanionGeneratableInsightType,
  ResearchCompanionInsightOption,
} from "./insight-types";
export {
  DEFAULT_WORKSPACE_TYPE_ID,
  RESEARCH_COMPANION_WORKSPACE_TYPES,
  getDefaultWorksheetTabId,
  getWorkspaceTypeDefinition,
  parseWorkspaceTypeParam,
} from "./workspace-types";
export type {
  ResearchCompanionWorkspaceTypeDefinition,
  ResearchCompanionWorkspaceTypeId,
  WorksheetTabDefinition,
} from "./workspace-types";
export { WorkspaceTypePicker, WorkspaceTypePickerModal } from "./workspace-type-picker";
export { DeliverableWorkspacePanel, DeliverableWorkspaceChrome } from "./deliverable-workspace-panel";
