"use client";

import { Globe, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WebpageDraft } from "@/lib/web-url-import";

export function WebpageContextChip({
  draft,
  onRemove,
  compact = false,
}: {
  draft: WebpageDraft;
  onRemove: () => void;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-sky-400/30 bg-gradient-to-r from-sky-500/12 to-cyan-500/8 text-sky-700 dark:text-sky-300",
        compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-xs shadow-mac backdrop-blur",
      )}
    >
      <Globe className={cn("shrink-0", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      <span className="truncate">{draft.label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-sky-700/70 transition-colors hover:text-destructive dark:text-sky-300/80"
        title="Remove webpage"
        aria-label="Remove webpage"
      >
        <X className={cn("shrink-0", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      </button>
    </span>
  );
}
