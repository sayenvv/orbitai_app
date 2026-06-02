"use client";

import { useEffect, useMemo, useRef } from "react";
import { FileText, FolderOpen, Loader2, Paperclip, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type LibraryComposerItem = {
  id: string;
  title: string;
  subtitle: string;
  kind: "upload" | "generated";
  disabled?: boolean;
};

type LibraryComposerFieldProps = {
  items: LibraryComposerItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelectItem: (id: string) => void;
  onCancel: () => void;
  onUploadNew?: () => void;
  loading?: boolean;
  error?: string;
  size?: "md" | "lg";
  className?: string;
};

export function LibraryComposerField({
  items,
  search,
  onSearchChange,
  onSelectItem,
  onCancel,
  onUploadNew,
  loading = false,
  error,
  size = "md",
  className,
}: LibraryComposerFieldProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => searchRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [loading, onCancel]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.subtitle.toLowerCase().includes(term),
    );
  }, [items, search]);

  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-violet-500/35 bg-gradient-to-r from-violet-500/8 to-indigo-500/5 transition-all focus-within:border-violet-500/55 focus-within:ring-4 focus-within:ring-violet-500/12",
          size === "lg" ? "sm:rounded-[22px]" : "",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-1.5 border-b border-violet-500/15 px-2",
            size === "lg" ? "h-12 sm:h-14 sm:px-2.5" : "min-h-[44px] py-1 pl-1.5 pr-2",
          )}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-violet-500/10 hover:text-foreground disabled:opacity-50"
            aria-label="Cancel library mode"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>

          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <FolderOpen className="h-4 w-4" />
          </span>

          <Search className="h-4 w-4 shrink-0 text-violet-500/60" />

          <input
            ref={searchRef}
            type="search"
            value={search}
            disabled={loading}
            placeholder="Search your library…"
            onChange={(event) => onSearchChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-violet-700/45 dark:placeholder:text-violet-300/45 sm:text-base"
          />
        </div>

        <div className="max-h-52 overflow-y-auto p-1.5 sm:max-h-56">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
              Loading library…
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              {search.trim() ? `Nothing matches “${search.trim()}”` : "No files in your library yet."}
            </p>
          ) : (
            filtered.map((item) => {
              const Icon = item.kind === "upload" ? Paperclip : FileText;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled || loading}
                  onClick={() => onSelectItem(item.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    item.disabled
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-violet-500/8 active:bg-violet-500/12",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      item.kind === "upload"
                        ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                        : "bg-violet-500/15 text-violet-600 dark:text-violet-400",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        {onUploadNew ? (
          <div className="border-t border-violet-500/15 px-3 py-2">
            <button
              type="button"
              onClick={onUploadNew}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 transition-colors hover:text-violet-900 disabled:opacity-50 dark:text-violet-300 dark:hover:text-violet-100"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Upload from device instead
            </button>
          </div>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 px-1 text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
