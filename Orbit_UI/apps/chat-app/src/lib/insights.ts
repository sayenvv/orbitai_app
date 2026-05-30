import type { LibraryGeneratedFile, LibraryUpload } from "@/hooks/use-library";

const INSIGHTS_TITLE_PREFIX = "Insights: ";

export function isAiInsight(file: LibraryGeneratedFile): boolean {
  return file.type === "AI Insights" || file.title.startsWith(INSIGHTS_TITLE_PREFIX);
}

export function resolveInsightSourceDocumentId(
  insight: LibraryGeneratedFile,
  uploads: LibraryUpload[],
): string | null {
  if (insight.sourceDocumentId) return insight.sourceDocumentId;
  if (insight.sourceFilename) {
    const match = uploads.find((upload) => upload.title === insight.sourceFilename);
    if (match) return match.id;
  }
  if (insight.title.startsWith(INSIGHTS_TITLE_PREFIX)) {
    const filename = insight.title.slice(INSIGHTS_TITLE_PREFIX.length);
    return uploads.find((upload) => upload.title === filename)?.id ?? null;
  }
  return null;
}

export function insightSourceLabel(
  insight: LibraryGeneratedFile,
  uploads: LibraryUpload[],
): string | null {
  if (insight.sourceFilename) return insight.sourceFilename;
  const documentId = resolveInsightSourceDocumentId(insight, uploads);
  if (!documentId) return null;
  return uploads.find((upload) => upload.id === documentId)?.title ?? null;
}
