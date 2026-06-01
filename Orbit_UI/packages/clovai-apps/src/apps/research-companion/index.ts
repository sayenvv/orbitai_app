export const appSlug = "research-companion";
export { ResearchCompanionApp } from "./research-companion-app";
export type { ResearchCompanionAppProps, RecentWorkspace } from "./research-companion-app";
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
