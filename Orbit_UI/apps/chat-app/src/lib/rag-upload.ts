import type { ApiRagDocument } from "@/lib/orbit-api";
import { publicApi } from "@/lib/orbit-api";
import { confirmPdfPageLimit } from "@/lib/pdf-page-limit";
import { mapWebpageDocumentToSource } from "@/lib/web-url-import";
import type { StudySource } from "@/types";

export type RagDocumentStatus = ApiRagDocument["status"];

export class PdfUploadCancelledError extends Error {
  constructor() {
    super("Upload cancelled");
    this.name = "PdfUploadCancelledError";
  }
}

export function mapRagDocumentToSource(doc: ApiRagDocument): StudySource {
  if (doc.metadata?.source_kind === "webpage" || doc.mime_type === "text/html") {
    return mapWebpageDocumentToSource(doc);
  }

  const status = doc.status;
  const subject =
    status === "processing" || status === "pending"
      ? "Processing…"
      : status === "failed"
        ? doc.error_message || "Processing failed"
        : doc.pages_processed && doc.page_count
          ? `${doc.pages_processed}/${doc.page_count} pages indexed`
          : "Ready for chat";

  return {
    id: doc.id,
    name: doc.original_filename || doc.name,
    type: "uploaded-file",
    subject,
    status,
    createdAt: new Date(doc.created_at),
  };
}

export function isSourceProcessing(source: StudySource | null): boolean {
  if (!source) return false;
  return source.status === "pending" || source.status === "processing";
}

export function isSourceReady(source: StudySource | null): boolean {
  if (!source) return true;
  if (source.type !== "uploaded-file") return true;
  return !source.status || source.status === "ready";
}

export function appendSourceToSearchParams(
  params: URLSearchParams,
  source: StudySource,
): void {
  params.set("sourceId", source.id);
  params.set("sourceName", source.name);
  params.set("sourceType", source.type);
  if (source.subject) {
    params.set("sourceSubject", source.subject);
  }
  if (source.status) {
    params.set("sourceStatus", source.status);
  }
}

export async function ensurePdfUploadAllowed(file: File): Promise<void> {
  const inspection = await publicApi.inspectPdf(file);
  if (!inspection.will_truncate) return;

  const allowed = await confirmPdfPageLimit(inspection);
  if (!allowed) {
    throw new PdfUploadCancelledError();
  }
}

export async function uploadPdfAndWait(
  file: File,
  options?: {
    conversationId?: string | null;
    onQueued?: (doc: ApiRagDocument) => void;
    onProgress?: (message: string) => void;
    skipPageLimitCheck?: boolean;
  },
): Promise<StudySource> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    throw new Error("Only PDF files are supported.");
  }

  if (!options?.skipPageLimitCheck) {
    options?.onProgress?.("Checking document…");
    await ensurePdfUploadAllowed(file);
  }

  options?.onProgress?.("Uploading…");
  const queued = await publicApi.uploadFile(file, options?.conversationId);
  options?.onQueued?.(queued);

  if (queued.status === "ready") {
    return mapRagDocumentToSource(queued);
  }

  options?.onProgress?.("Extracting and indexing…");
  const ready = await publicApi.waitForFileReady(queued.id, {
    onProgress: (doc) => {
      if (doc.status === "processing") {
        options?.onProgress?.("Extracting and indexing…");
      }
    },
  });

  return mapRagDocumentToSource(ready);
}

export function validatePdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
