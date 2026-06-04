export const appSlug = "project-planning";
export { ProjectPlanningApp } from "./project-planning-app";
export type {
  ProjectPlanningAppProps,
  ProjectPlanningView,
  ProjectPlanningWorkspaceTab,
} from "./project-planning-app";
export {
  ProjectPlanningHeaderNav,
  ProjectPlanningWorkspaceChrome,
} from "./project-planning-workspace-chrome";
export {
  ProjectPlanningWorkspace,
  type ProjectPlanningDeliverableChatProps,
  type ProjectPlanningPersistence,
} from "./project-planning-workspace";
export {
  CRIMINAL_DETECTION_PROJECT_ID,
  buildCriminalDetectionProjectDocument,
  type ProjectPlanningDocument,
} from "./project-planning-document";
export {
  PROJECT_PLANNING_PHASES,
  PROJECT_PLANNING_ARTIFACT_COUNT,
  PROJECT_PLANNING_ROOT_LABEL,
  getPlanningArtifact,
  getPlanningPhase,
  getPlanningArtifactPosition,
  getPhaseStepNumber,
  searchPlanningCatalog,
} from "./project-planning-catalog";
export type { PlanningArtifact, PlanningPhase } from "./project-planning-catalog";
export type {
  PlanningWorksheetContent,
  WorksheetTextSelection,
} from "./project-planning-worksheet";
