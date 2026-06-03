"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, Loader2, Search, X } from "lucide-react";
import {
  isPhotoStudioSupportedImageFilename,
  isPhotoStudioSupportedImageMime,
} from "@orbit/clovai-apps";
import { getApiErrorMessage, photoStudioApi, publicApi, type ApiLibraryGenerated, type ApiRagDocument } from "@/lib/orbit-api";

type PickerUpload = {
  id: string;
  name: string;
  status: ApiRagDocument["status"];
};

type PhotoStudioAssetPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: { id: string; name: string; kind: "upload" | "generated" }) => void;
};

function isPhotoStudioLibraryUpload(doc: ApiRagDocument): boolean {
  if (isPhotoStudioSupportedImageMime(doc.mime_type)) {
    return true;
  }
  return isPhotoStudioSupportedImageFilename(doc.name || doc.original_filename);
}

function isVisualGenerated(item: ApiLibraryGenerated): boolean {
  const type = item.type.toLowerCase();
  const slug = item.agent_slug?.toLowerCase() ?? "";
  return (
    type.includes("image") ||
    type.includes("visual") ||
    type.includes("photo") ||
    slug.includes("photo") ||
    slug.includes("logo") ||
    slug.includes("creative")
  );
}

function AssetRow({
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
      className="flex w-full items-center gap-3 rounded-xl border border-border/30 bg-background/70 px-3 py-2.5 text-left transition-all hover:border-violet-300/50 hover:bg-violet-50/50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-violet-500/30 dark:hover:bg-violet-950/20"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-md shadow-violet-500/20">
        <ImageIcon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

export function PhotoStudioAssetPicker({ open, onClose, onSelect }: PhotoStudioAssetPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [uploads, setUploads] = useState<PickerUpload[]>([]);
  const [generated, setGenerated] = useState<ApiLibraryGenerated[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setLoadError("");
      return;
    }

    setLoading(true);
    setLoadError("");
    Promise.all([
      photoStudioApi.assets(),
      publicApi.library().catch(() => ({ uploads: [] as ApiRagDocument[], generated: [] as ApiLibraryGenerated[] })),
    ])
      .then(([assets, library]) => {
        const photoStudioUploads: PickerUpload[] = assets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          status: "ready",
        }));
        const libraryUploads: PickerUpload[] = (library.uploads || [])
          .filter(isPhotoStudioLibraryUpload)
          .map((doc) => ({
            id: doc.id,
            name: doc.name || doc.original_filename,
            status: doc.status,
          }));
        const mergedUploads = new Map<string, PickerUpload>();
        for (const doc of [...photoStudioUploads, ...libraryUploads]) {
          mergedUploads.set(doc.id, doc);
        }
        setUploads(Array.from(mergedUploads.values()));
        setGenerated((library.generated || []).filter(isVisualGenerated));
      })
      .catch((err) => setLoadError(getApiErrorMessage(err, "Failed to load library")))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  const handleSelectUpload = useCallback(
    (doc: PickerUpload) => {
      if (doc.status !== "ready") return;
      onSelect({
        id: doc.id,
        name: doc.name,
        kind: "upload",
      });
      onClose();
    },
    [onClose, onSelect],
  );

  const handleSelectGenerated = useCallback(
    (item: ApiLibraryGenerated) => {
      onSelect({
        id: item.id,
        name: item.title,
        kind: "generated",
      });
      onClose();
    },
    [onClose, onSelect],
  );

  if (!mounted || !open) return null;

  const query = search.trim().toLowerCase();
  const filteredUploads = uploads.filter((doc) => {
    const name = doc.name.toLowerCase();
    return !query || name.includes(query);
  });
  const filteredGenerated = generated.filter((item) => {
    const haystack = `${item.title} ${item.type} ${item.agent_name ?? ""}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  const hasResults = filteredUploads.length > 0 || filteredGenerated.length > 0;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close library"
        className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Clovai Canvas library"
        className="fixed left-1/2 top-1/2 z-[9999] flex max-h-[min(80vh,36rem)] w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-violet-200/50 bg-card shadow-[0_24px_60px_rgba(124,58,237,0.18)] dark:border-violet-500/20"
      >
        <div className="relative flex items-center justify-between border-b border-border/40 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-cyan-500/10 px-4 py-3">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500" />
          <div>
            <p className="text-sm font-semibold text-foreground">Library</p>
            <p className="text-[11px] text-muted-foreground">Open a JPG, PNG, or JPEG image</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border/30 px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search images and visuals…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              autoFocus
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading library…
            </div>
          ) : loadError ? (
            <p className="py-8 text-center text-sm text-destructive">{loadError}</p>
          ) : !hasResults ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No images or visuals found in your library yet.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredUploads.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Uploaded images
                  </p>
                  {filteredUploads.map((doc) => (
                    <AssetRow
                      key={doc.id}
                      title={doc.name}
                      subtitle={doc.status === "ready" ? "Ready to open" : doc.status}
                      disabled={doc.status !== "ready"}
                      onClick={() => handleSelectUpload(doc)}
                    />
                  ))}
                </div>
              ) : null}

              {filteredGenerated.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Generated visuals
                  </p>
                  {filteredGenerated.map((item) => (
                    <AssetRow
                      key={item.id}
                      title={item.title}
                      subtitle={item.agent_name ? `${item.type} · ${item.agent_name}` : item.type}
                      onClick={() => handleSelectGenerated(item)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
