import type { ApiLibraryGenerated, ApiLibraryResponse } from "@/lib/orbit-api";

const INSIGHTS_TITLE_PREFIX = "Insights: ";

export function isAiInsightGenerated(file: ApiLibraryGenerated): boolean {
  return file.type === "AI Insights" || file.title.startsWith(INSIGHTS_TITLE_PREFIX);
}

export function findExistingInsightForDocument(
  sourceId: string,
  sourceName: string | null | undefined,
  library: Pick<ApiLibraryResponse, "generated" | "uploads">,
): ApiLibraryGenerated | null {
  const title = sourceName?.trim();
  const upload = library.uploads.find((item) => item.id === sourceId);
  const uploadName = upload?.original_filename || upload?.name || title;

  return (
    library.generated.find((file) => {
      if (!isAiInsightGenerated(file)) return false;
      if (file.source_document_id === sourceId) return true;
      if (uploadName && file.source_filename === uploadName) return true;
      if (uploadName && file.title === `${INSIGHTS_TITLE_PREFIX}${uploadName}`) return true;
      if (title && file.source_filename === title) return true;
      if (title && file.title === `${INSIGHTS_TITLE_PREFIX}${title}`) return true;
      return false;
    }) ?? null
  );
}
