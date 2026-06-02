import type { LibraryComposerItem } from "@/components/chat/library-composer-field";
import type { LibraryUpload } from "@/hooks/use-library";
import { formatFileSize, formatRelativeDate } from "@/lib/format-library";
import type { StudySource } from "@/types";

export function mapLibraryUploadToSource(upload: LibraryUpload): StudySource {
  const subject =
    upload.status === "processing" || upload.status === "pending"
      ? "Processing…"
      : upload.status === "failed"
        ? upload.errorMessage || "Processing failed"
        : upload.pageCount
          ? `${upload.pagesProcessed}/${upload.pageCount} pages indexed`
          : "Ready for chat";

  return {
    id: upload.id,
    name: upload.title,
    type: "uploaded-file",
    subject,
    status: upload.status,
    createdAt: new Date(upload.createdAt),
  };
}

export function buildLibraryComposerItems(uploads: LibraryUpload[]): LibraryComposerItem[] {
  return uploads.map((upload) => ({
    id: upload.id,
    title: upload.title,
    subtitle: [
      formatFileSize(upload.fileSizeBytes),
      formatRelativeDate(upload.createdAt),
      upload.status !== "completed" ? upload.status : null,
    ]
      .filter(Boolean)
      .join(" · "),
    kind: "upload",
    disabled: upload.status === "failed" || upload.status === "processing" || upload.status === "pending",
  }));
}
