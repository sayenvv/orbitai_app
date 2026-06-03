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
