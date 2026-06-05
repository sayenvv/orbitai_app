"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { FolderOpen, ImageIcon, ImagePlus, Loader2, Search, Upload } from "lucide-react";
import {
  PHOTO_STUDIO_IMAGE_ACCEPT,
  PHOTO_STUDIO_IMAGE_FORMATS_LABEL,
} from "./image-formats";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export type PhotoStudioWorkspaceUpload = {
  id: string;
  name: string;
  status?: string;
  imageUrl?: string | null;
  createdAt?: string | null;
};

type PhotoStudioUploadsPanelProps = {
  uploads?: PhotoStudioWorkspaceUpload[];
  loading?: boolean;
  error?: string | null;
  uploading?: boolean;
  onOpenLibrary?: () => void;
  onUploadFile?: (file: File) => void | Promise<void>;
  onSelectUpload?: (upload: PhotoStudioWorkspaceUpload) => void;
};

export function PhotoStudioUploadsPanel({
  uploads = [],
  loading = false,
  error,
  uploading = false,
  onOpenLibrary,
  onUploadFile,
  onSelectUpload,
}: PhotoStudioUploadsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const filteredUploads = uploads.filter((item) => {
    const name = item.name.toLowerCase();
    return !query || name.includes(query);
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUploadFile) return;
    void onUploadFile(file);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!onUploadFile || uploading}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            <span>{uploading ? "Uploading…" : "Upload"}</span>
          </button>
          <button
            type="button"
            onClick={onOpenLibrary}
            disabled={!onOpenLibrary}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-background/80 px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Library</span>
          </button>
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {PHOTO_STUDIO_IMAGE_FORMATS_LABEL} images — click a tile to add it to the canvas.
        </p>
      </div>

      <div className="relative mb-3 mt-3 shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          role="searchbox"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search uploads…"
          aria-label="Search uploads"
          className="h-9 w-full rounded-lg border border-border/60 bg-background/80 pl-8 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-black/20 focus:ring-4 focus:ring-black/[0.06] dark:focus:border-white/20 dark:focus:ring-white/10"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading uploads…
          </div>
        ) : error ? (
          <p className="py-8 text-center text-xs text-destructive">{error}</p>
        ) : filteredUploads.length === 0 ? (
          <div className="rounded-[1.15rem] border border-dashed border-black/[0.1] bg-gradient-to-br from-stone-50/80 via-white to-zinc-50/70 px-4 py-8 text-center dark:border-white/[0.12] dark:from-zinc-950/25 dark:via-background dark:to-zinc-900/15">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
              <ImagePlus className="h-4 w-4" />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">No uploads yet</p>
            <p className="mx-auto mt-1 max-w-[14rem] text-[11px] leading-relaxed text-muted-foreground">
              Upload from your device or open an image from your library.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredUploads.map((item) => {
              const ready = !item.status || item.status === "ready";
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!ready || !onSelectUpload}
                  onClick={() => onSelectUpload?.(item)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border border-border/40 text-left transition-all duration-200 hover:border-black/[0.12] hover:shadow-sm dark:hover:border-white/[0.16]",
                    !ready && "cursor-not-allowed opacity-50",
                  )}
                >
                  <div className="aspect-square bg-muted/30">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                      </span>
                    )}
                  </div>
                  <div className="border-t border-border/30 bg-background/90 px-2 py-1.5">
                    <p className="truncate text-[10px] font-semibold text-foreground">{item.name}</p>
                    {ready ? (
                      <p className="mt-0.5 truncate text-[9px] text-muted-foreground">Add to canvas</p>
                    ) : (
                      <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{item.status}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={PHOTO_STUDIO_IMAGE_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
