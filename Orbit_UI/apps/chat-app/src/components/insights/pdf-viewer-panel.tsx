"use client";

import { useEffect, useState } from "react";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/orbit-api";
import { cn } from "@/lib/utils";

type PdfViewerPanelProps = {
  documentId: string;
  filename?: string | null;
  className?: string;
  embedded?: boolean;
};

export function PdfViewerPanel({
  documentId,
  filename,
  className,
  embedded = false,
}: PdfViewerPanelProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let blobUrl: string | null = null;

    setLoading(true);
    setError("");
    setObjectUrl(null);

    fetch(`${getApiBaseUrl()}/files/${documentId}/download`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const detail =
            payload && typeof payload === "object" && "detail" in payload
              ? String((payload as { detail?: unknown }).detail)
              : "Could not load PDF";
          throw new Error(detail);
        }
        return response.blob();
      })
      .then((blob) => {
        if (!active) return;
        blobUrl = URL.createObjectURL(blob);
        setObjectUrl(blobUrl);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load PDF");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [documentId]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        !embedded && "rounded-xl border border-border/50 bg-muted/20",
        className,
      )}
    >
      {!embedded && (
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
          <FileText className="h-4 w-4 shrink-0 text-red-500" />
          <p className="truncate text-sm font-medium text-foreground">
            {filename || "Source document"}
          </p>
        </div>
      )}

      <div className={cn("relative min-h-0 flex-1 bg-muted/30", embedded && "h-full")}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground/70" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && objectUrl && (
          <iframe
            title={filename ? `${filename} preview` : "PDF preview"}
            src={objectUrl}
            className="h-full w-full border-0"
          />
        )}
      </div>
    </div>
  );
}
