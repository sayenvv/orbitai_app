/** Catalog slugs for apps without a workspace package yet. */
export const assetRemixSlug = "asset-remix";
export const careerCoachSlug = "career-coach";
export const creativeEditorSlug = "creative-editor";
export const logoStudioSlug = "logo-studio";
export const videoSnippetsSlug = "video-snippets";
export const voiceMakerSlug = "voice-maker";

export { appSlug as photoStudioSlug, PhotoStudioApp } from "./photo-studio";
export {
  PHOTO_STUDIO_IMAGE_ACCEPT,
  PHOTO_STUDIO_IMAGE_FORMATS_LABEL,
  isPhotoStudioSupportedImageFile,
  isPhotoStudioSupportedImageFilename,
  isPhotoStudioSupportedImageMime,
} from "./photo-studio";
export type {
  PhotoStudioAppProps,
  PhotoStudioCreationType,
  PhotoStudioGeneratedItem,
  PhotoStudioSavedDesign,
  PhotoStudioView,
  PhotoStudioWorkspaceSnapshot,
  CanvasBackgroundId,
  RecentPhotoProject,
} from "./photo-studio";
export type { PhotoStudioOptionsConfig } from "./photo-studio";
export { DEFAULT_PHOTO_STUDIO_OPTIONS, resolvePhotoStudioOptions } from "./photo-studio";
export {
  appSlug as researchCompanionSlug,
  ResearchCompanionApp,
} from "./research-companion";
export type { ResearchCompanionAppProps, RecentWorkspace, ResearchCompanionView } from "./research-companion";
export type {
  ResearchCompanionGeneratableInsightType,
  ResearchCompanionInsightOption,
} from "./research-companion";
export {
  DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES,
  RESEARCH_COMPANION_INSIGHT_OPTIONS,
  getMissingInsightTypes,
  mergeInsightTypes,
  normalizeResearchCompanionInsightTypes,
  parseResearchCompanionInsightTypesParam,
  serializeResearchCompanionInsightTypes,
} from "./research-companion";
export {
  appSlug as clovaiProjectsSlug,
  ClovaiProjectsApp,
  buildDemoArtifacts,
  resolvePresetModules,
  SDLC_MODULES,
  SDLC_SELECTION_PRESETS,
  CLOVAI_PROJECTS_PROCESSING_STEPS,
} from "./clovai-projects";
export type {
  ClovaiProjectsAppProps,
  ClovaiProjectsView,
  RecentProjectWorkspace,
  ProjectWorkspace,
  SdlcArtifact,
  SdlcModuleId,
  SdlcSelectionPresetId,
  ArtifactReviewStatus,
  GenerationStatus,
  OutputStyle,
  ProcessingStep,
} from "./clovai-projects";
