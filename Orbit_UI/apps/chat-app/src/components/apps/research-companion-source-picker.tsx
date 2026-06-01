"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2, Search, Upload, X } from "lucide-react";
import { getApiErrorMessage, publicApi, type ApiLibraryGenerated, type ApiRagDocument } from "@/lib/orbit-api";
import { findExistingInsightForDocument } from "@/lib/research-companion-insights";
import { mapRagDocumentToSource, PdfUploadCancelledError, uploadPdfAndWait } from "@/lib/rag-upload";
import { catalogAppIds, getAppWorkspaceHref } from "@orbit/clovai-apps";

type ResearchCompanionSourcePickerProps = {
  open: boolean;
  onClose: () => void;
  autoUpload?: boolean;
};

function navigateToWorkspace(
  router: ReturnType<typeof useRouter>,
  id: string,
  name: string,
  insightId?: string | null,
) {
  const params = new URLSearchParams({
    sourceId: id,
    sourceName: name,
    sourceType: "uploaded-file",
  });
  if (insightId) {
    params.set("insightId", insightId);
  }
  router.push(`${getAppWorkspaceHref(catalogAppIds.researchCompanion)}?${params.toString()}`);
}

function SourceRow({
  title,
  subtitle,
  disabled,
  onClick,
}: {
  title: string;
  subtitle: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl border border-border/30 bg-background/70 px-3 py-2.5 text-left transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <BookOpen className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

export function ResearchCompanionSourcePicker({
  open,
  onClose,
  autoUpload = false,
}: ResearchCompanionSourcePickerProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [files, setFiles] = useState<ApiRagDocument[]>([]);
  const [generatedInsights, setGeneratedInsights] = useState<ApiLibraryGenerated[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setUploadError("");
      setLoadError("");
      return;
    }

    setLoading(true);
    setLoadError("");
    publicApi
      .library()
      .then((data) => {
        setFiles(data.uploads || []);
        setGeneratedInsights(data.generated || []);
      })
      .catch((err) => setLoadError(getApiErrorMessage(err, "Failed to load files")))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || !autoUpload || uploading) return;
    const timer = window.setTimeout(() => fileInputRef.current?.click(), 0);
    return () => window.clearTimeout(timer);
  }, [open, autoUpload, uploading]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  const handleSelectFile = useCallback(
    (doc: ApiRagDocument) => {
      if (doc.status !== "ready") return;
      const source = mapRagDocumentToSource(doc);
      const existing = findExistingInsightForDocument(source.id, source.name, {
        uploads: files,
        generated: generatedInsights,
      });
      navigateToWorkspace(router, source.id, source.name, existing?.id);
      onClose();
    },
    [files, generatedInsights, onClose, router],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError("");
      setUploadProgress("Checking document…");
      try {
        const source = await uploadPdfAndWait(file, {
          onProgress: setUploadProgress,
        });
        navigateToWorkspace(router, source.id, source.name);
        onClose();
      } catch (err) {
        if (err instanceof PdfUploadCancelledError) return;
        setUploadError(getApiErrorMessage(err, "Upload failed"));
      } finally {
        setUploading(false);
        setUploadProgress("");
      }
    },
    [onClose, router],
  );

  if (!mounted || !open) return null;

  const filteredFiles = files.filter((item) => {
    const name = item.original_filename || item.name;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return createPortal(
    <div className="fixed inset-0 z-[10004] flex items-center justify-center bg-background/70 px-4 backdrop-blur-md">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close file picker"
        onClick={onClose}
      />

      <div className="relative flex max-h-[min(32rem,85vh)] w-full max-w-md flex-col overflow-hidden rounded-[1.5rem] border border-border/40 bg-card shadow-lg">
        <div className="flex items-start justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">File</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Open file</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload a PDF from your device or choose an existing file.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/30 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 px-4 pb-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUpload(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/8 px-3 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/12 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? uploadProgress || "Processing…" : "Upload PDF from device"}
          </button>
          {uploadError ? <p className="text-[11px] text-destructive">{uploadError}</p> : null}
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/25 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search files…"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading files…
            </div>
          ) : loadError ? (
            <div className="rounded-xl bg-destructive/10 px-4 py-8 text-center text-sm text-destructive">
              {loadError}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="rounded-xl bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              No files yet. Upload a PDF above.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map((item) => {
                const name = item.original_filename || item.name;
                return (
                  <SourceRow
                    key={item.id}
                    title={name}
                    subtitle={
                      item.status === "ready"
                        ? `${item.page_count} pages · Ready`
                        : item.status === "processing" || item.status === "pending"
                          ? "Processing…"
                          : item.error_message || "Unavailable"
                    }
                    disabled={item.status !== "ready"}
                    onClick={() => handleSelectFile(item)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function useResearchCompanionSourcePicker() {
  const [open, setOpen] = useState(false);
  const [autoUpload, setAutoUpload] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setAutoUpload(false);
  }, []);

  return {
    openFile: () => {
      setAutoUpload(false);
      setOpen(true);
    },
    openLibrary: () => {
      setAutoUpload(false);
      setOpen(true);
    },
    openUpload: () => {
      setAutoUpload(true);
      setOpen(true);
    },
    picker: (
      <ResearchCompanionSourcePicker open={open} autoUpload={autoUpload} onClose={close} />
    ),
  };
}
