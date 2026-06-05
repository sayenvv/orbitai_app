"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { StudySource } from "@/types";
import { publicApi, getApiErrorMessage } from "@/lib/orbit-api";
import { mapRagDocumentToSource, uploadPdfAndWait, PdfUploadCancelledError } from "@/lib/rag-upload";
import { cn } from "@/lib/utils";
import {
  X,
  Search,
  BookOpen,
  FileUp,
  Globe,
  ArrowRight,
  Loader2,
  Upload,
} from "lucide-react";

export type ContextPickerTab = "materials" | "files" | null;

function sourceVisual(type: StudySource["type"]) {
  if (type === "study-material") {
    return {
      icon: BookOpen,
      chipClass: "text-indigo-500",
      listClass: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
    };
  }
  if (type === "webpage") {
    return {
      icon: Globe,
      chipClass: "text-sky-500",
      listClass: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    };
  }
  return {
    icon: FileUp,
    chipClass: "text-orange-500",
    listClass: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  };
}

type ContextSelectorProps = {
  selectedSource: StudySource | null;
  onSelect: (source: StudySource | null) => void;
  conversationId?: string | null;
  locked?: boolean;
  pickerTab?: ContextPickerTab;
  onPickerTabChange?: (tab: ContextPickerTab) => void;
};

function SourceListModal({
  title,
  sources,
  searchQuery,
  setSearchQuery,
  onSelect,
  close,
  onUpload,
  uploading,
  uploadProgress,
  uploadError,
}: {
  title: string;
  sources: StudySource[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelect: (source: StudySource) => void;
  close: () => void;
  onUpload?: (file: File) => void;
  uploading?: boolean;
  uploadProgress?: string;
  uploadError?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = sources.filter(
    (source) =>
      source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.subject?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px]" onClick={close} />

      <div className="relative w-full max-w-xs bg-card rounded-lg shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <h3 className="text-xs font-semibold">{title}</h3>
          <button
            onClick={close}
            className="h-5 w-5 rounded flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>

        {onUpload && (
          <div className="border-b px-2 py-2 space-y-2">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-orange-200 bg-orange-50/60 px-2 py-2 text-[11px] font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-60 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300"
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {uploading ? uploadProgress || "Processing…" : "Upload PDF"}
            </button>
            <p className="text-[10px] text-muted-foreground px-0.5">
              Free plans index up to 20 pages per file. Larger PDFs will prompt before upload.
            </p>
            {uploadError && (
              <p className="text-[10px] text-destructive px-0.5">{uploadError}</p>
            )}
          </div>
        )}

        <div className="px-2 pt-2">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border bg-background">
            <Search className="h-3 w-3 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-[11px] placeholder:text-muted-foreground/60 focus:outline-none"
              autoFocus={!onUpload}
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center text-[11px] text-muted-foreground py-4">
              No items found
            </p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((source) => {
                const visual = sourceVisual(source.type);
                const Icon = visual.icon;
                return (
                <button
                  key={source.id}
                  onClick={() => onSelect(source)}
                  disabled={source.status === "processing" || source.status === "pending"}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left hover:bg-accent transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span
                    className={cn(
                      "h-6 w-6 rounded-md flex items-center justify-center shrink-0",
                      visual.listClass,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{source.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{source.subject}</p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ContextSelector({
  selectedSource,
  onSelect,
  conversationId,
  locked = false,
  pickerTab = null,
  onPickerTabChange,
}: ContextSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [studyMaterials, setStudyMaterials] = useState<StudySource[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<StudySource[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadError, setUploadError] = useState("");

  const close = useCallback(() => {
    onPickerTabChange?.(null);
    setSearchQuery("");
    setUploadError("");
  }, [onPickerTabChange]);

  const loadUploadedFiles = useCallback(() => {
    return publicApi
      .files()
      .then((data) => {
        setUploadedFiles((data.data || []).map(mapRagDocumentToSource));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (pickerTab === "materials" && studyMaterials.length === 0) {
      publicApi
        .studyMaterials()
        .then((data) => {
          const rows = (data.data ?? []) as Record<string, unknown>[];
          const items: StudySource[] = rows.map((m) => ({
            id: m.id as string,
            name: m.name as string,
            type: "study-material" as const,
            subject: (m.subject as string) || undefined,
            createdAt: new Date(m.created_at as string),
          }));
          setStudyMaterials(items);
        })
        .catch(() => {});
    }
    if (pickerTab === "files") {
      void loadUploadedFiles();
    }
  }, [pickerTab, studyMaterials.length, loadUploadedFiles]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError("");
    setUploadProgress("Uploading…");
    try {
      const source = await uploadPdfAndWait(file, {
        conversationId,
        onProgress: setUploadProgress,
        onQueued: (doc) => {
          const pending = mapRagDocumentToSource(doc);
          setUploadedFiles((current) => [pending, ...current.filter((item) => item.id !== pending.id)]);
        },
      });
      setUploadedFiles((current) => [source, ...current.filter((item) => item.id !== source.id)]);
      onSelect(source);
      close();
    } catch (err) {
      if (err instanceof PdfUploadCancelledError) return;
      setUploadError(getApiErrorMessage(err, "Upload failed"));
      void loadUploadedFiles();
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pickerTab) close();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [pickerTab, close]);

  const pickerModal =
    pickerTab && !locked ? (
      <SourceListModal
        title={pickerTab === "materials" ? "Study Materials" : "Uploaded Files"}
        sources={pickerTab === "materials" ? studyMaterials : uploadedFiles}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelect={(source) => {
          onSelect(source);
          close();
        }}
        close={close}
        onUpload={pickerTab === "files" ? handleUpload : undefined}
        uploading={uploading}
        uploadProgress={uploadProgress}
        uploadError={uploadError}
      />
    ) : null;

  if (selectedSource) {
    const processing =
      selectedSource.status === "processing" || selectedSource.status === "pending";
    const visual = sourceVisual(selectedSource.type);
    const SelectedIcon = visual.icon;
    return (
      <>
        <div className="mb-2 flex items-center gap-1.5">
          {locked ? (
            <span className="inline-flex items-center gap-1 border border-foreground/10 bg-foreground/[0.03] py-1 pl-2 pr-2 rounded-md">
              <SelectedIcon className={cn("h-2.5 w-2.5", visual.chipClass)} />
              <span className="text-[10px] font-medium text-foreground/80 max-w-[150px] truncate">
                {selectedSource.name}
              </span>
              {processing && <Loader2 className="h-2.5 w-2.5 animate-spin text-orange-500" />}
            </span>
          ) : (
            <button
              onClick={() => onSelect(null)}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-md bg-foreground/[0.03] border border-foreground/10 hover:border-destructive/40 hover:bg-destructive/5 transition-all group"
            >
              <SelectedIcon className={cn("h-2.5 w-2.5", visual.chipClass)} />
              <span className="text-[10px] font-medium text-foreground/80 max-w-[150px] truncate">
                {selectedSource.name}
              </span>
              {processing && <Loader2 className="h-2.5 w-2.5 animate-spin text-orange-500" />}
              <X className="h-2.5 w-2.5 text-muted-foreground group-hover:text-destructive ml-0.5 transition-colors" />
            </button>
          )}
        </div>
        {pickerModal}
      </>
    );
  }

  return pickerModal;
}
