import {
  catalogAppIds,
  findCatalogApp,
  getAppWorkspaceHref,
  type CatalogApp,
} from "@orbit/clovai-apps";
import type { LibraryGeneratedFile, LibraryUpload } from "@/hooks/use-library";
import { isAiInsight, resolveInsightSourceDocumentId } from "@/lib/insights";

export const LIBRARY_OPEN_ORIGIN = "library";

export function isPhotoStudioGenerated(file: LibraryGeneratedFile): boolean {
  const type = file.type.toLowerCase();
  const slug = file.agentSlug.toLowerCase();
  return (
    slug === "photo-studio" ||
    slug === "photo-generator" ||
    type.includes("image") ||
    type.includes("visual") ||
    type.includes("photo") ||
    type.includes("logo")
  );
}

export function resolveGeneratedFileLaunchApp(
  file: LibraryGeneratedFile,
  uploads: LibraryUpload[],
): CatalogApp | null {
  if (isAiInsight(file)) {
    if (resolveInsightSourceDocumentId(file, uploads)) {
      return findCatalogApp("research-companion") ?? null;
    }
  }

  if (isPhotoStudioGenerated(file)) {
    return findCatalogApp("photo-studio") ?? null;
  }

  const bySlug = findCatalogApp(file.agentSlug);
  if (
    bySlug &&
    (bySlug.id === catalogAppIds.researchCompanion ||
      bySlug.id === catalogAppIds.photoGenerator)
  ) {
    return bySlug;
  }

  return null;
}

export function buildGeneratedFileAppHref(
  file: LibraryGeneratedFile,
  app: CatalogApp,
  uploads: LibraryUpload[],
): string | null {
  if (app.id === catalogAppIds.researchCompanion) {
    const sourceId = resolveInsightSourceDocumentId(file, uploads);
    if (!sourceId) return null;

    const sourceName =
      file.sourceFilename ??
      uploads.find((upload) => upload.id === sourceId)?.title ??
      "Document";

    const params = new URLSearchParams({
      sourceId,
      sourceName,
      sourceType: "uploaded-file",
      insightId: file.id,
      origin: LIBRARY_OPEN_ORIGIN,
    });
    return `${getAppWorkspaceHref(app)}?${params.toString()}`;
  }

  if (app.id === catalogAppIds.photoGenerator) {
    const params = new URLSearchParams({
      assetId: file.id,
      assetName: file.title,
      view: "workspace",
      origin: LIBRARY_OPEN_ORIGIN,
    });
    return `${getAppWorkspaceHref(app)}?${params.toString()}`;
  }

  return null;
}
