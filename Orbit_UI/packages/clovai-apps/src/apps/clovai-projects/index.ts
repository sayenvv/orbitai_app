export const appSlug = "clovai-projects";

export { ClovaiProjectsApp, CLOVAI_PROJECTS_PROCESSING_STEPS } from "./clovai-projects-app";
export type { ClovaiProjectsAppProps, ClovaiProjectsView, RecentProjectWorkspace, ProjectWorkspace, SdlcArtifact } from "./clovai-projects-app";
export { ClovaiProjectsWorkspaceShimmer } from "./clovai-projects-workspace-shimmer";
export {
  SDLC_MODULES,
  SDLC_SELECTION_PRESETS,
  getSdlcModule,
  resolvePresetModules,
} from "./sdlc-modules";
export type { SdlcModuleId, SdlcSelectionPresetId, SdlcModuleDef } from "./sdlc-modules";
export { buildDemoArtifacts } from "./demo-artifacts";
export type {
  ArtifactReviewStatus,
  GenerationStatus,
  OutputStyle,
  ProcessingStep,
  ProcessingStepId,
} from "./types";
