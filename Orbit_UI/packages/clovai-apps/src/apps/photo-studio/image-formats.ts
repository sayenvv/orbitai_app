export const PHOTO_STUDIO_IMAGE_ACCEPT = ".jpg,.jpeg,.png,image/jpeg,image/png";

export const PHOTO_STUDIO_SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png"] as const;

export const PHOTO_STUDIO_SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png"] as const;

export const PHOTO_STUDIO_IMAGE_FORMATS_LABEL = "JPG, PNG, or JPEG";

export function isPhotoStudioSupportedImageMime(mime: string): boolean {
  const normalized = mime.trim().toLowerCase();
  return (PHOTO_STUDIO_SUPPORTED_MIME_TYPES as readonly string[]).includes(normalized);
}

export function isPhotoStudioSupportedImageFilename(filename: string): boolean {
  const normalized = filename.trim().toLowerCase();
  return PHOTO_STUDIO_SUPPORTED_EXTENSIONS.some((extension) => normalized.endsWith(extension));
}

export function isPhotoStudioSupportedImageFile(file: File): boolean {
  if (file.type && isPhotoStudioSupportedImageMime(file.type)) {
    return true;
  }
  return isPhotoStudioSupportedImageFilename(file.name);
}
