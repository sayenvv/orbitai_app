export const appSlug = "photo-studio";
export { PhotoStudioApp } from "./photo-studio-app";
export { PhotoStudioWorkspaceShimmer } from "./photo-studio-workspace-shimmer";
export {
  PHOTO_STUDIO_IMAGE_ACCEPT,
  PHOTO_STUDIO_IMAGE_FORMATS_LABEL,
  PHOTO_STUDIO_SUPPORTED_EXTENSIONS,
  PHOTO_STUDIO_SUPPORTED_MIME_TYPES,
  isPhotoStudioSupportedImageFile,
  isPhotoStudioSupportedImageFilename,
  isPhotoStudioSupportedImageMime,
} from "./image-formats";
export type {
  PhotoStudioAppProps,
  PhotoStudioCreationType,
  PhotoStudioGeneratedItem,
  PhotoStudioSavedDesign,
  PhotoStudioView,
  PhotoStudioWorkspaceSnapshot,
  CanvasBackgroundId,
  RecentPhotoProject,
} from "./photo-studio-app";
export type { PhotoStudioOptionsConfig } from "./photo-studio-options";
export {
  DEFAULT_PHOTO_STUDIO_OPTIONS,
  resolvePhotoStudioOptions,
} from "./photo-studio-options";
