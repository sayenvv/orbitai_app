"use client";

import { FileText, Plus, X } from "lucide-react";

import type { PlanChatContextPin } from "@/lib/plan-chat-context";
import type { SynopsisDeliverable, SynopsisSection } from "@/lib/plan-synopsis-catalog";
import { cn } from "@/lib/utils";

function PlanContextFileIcon({
  format,
  badge,
}: {
  format: SynopsisDeliverable["format"];
  badge: string;
}) {
  const badgeColor =
    format === "diagram"
      ? "bg-violet-500"
      : format === "matrix"
        ? "bg-emerald-600"
        : "bg-[#3178c6]";

  return (
    <span className="relative inline-flex size-[15px] shrink-0 items-center justify-center" aria-hidden>
      <FileText className="size-3 text-muted-foreground/80" strokeWidth={1.75} />
      <span
        className={cn(
          "absolute -bottom-0.5 -right-1 rounded-[3px] px-[3px] py-px font-mono text-[7px] font-bold leading-none text-white not-italic",
          badgeColor,
        )}
      >
        {badge}
      </span>
    </span>
  );
}

export function PlanWsContextPicker({
  section,
  deliverable,
  pinnedContext,
  onPin,
  onClearPin,
}: {
  section: SynopsisSection;
  deliverable: SynopsisDeliverable;
  pinnedContext: PlanChatContextPin | null;
  onPin: () => void;
  onClearPin: () => void;
}) {
  const isPinned = pinnedContext?.sectionId === section.id;
  const contextLabel = deliverable.label;

  const chipBase =
    "inline-flex max-w-full min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-none transition-colors";

  if (isPinned) {
    return (
      <div className="mb-1">
        <span
          className={cn(
            chipBase,
            "border border-border/70 bg-muted/30 pr-1 text-foreground dark:border-white/12 dark:bg-white/[0.05]",
          )}
        >
          <PlanContextFileIcon format={deliverable.format} badge={section.number} />
          <span className="min-w-0 truncate italic">{contextLabel}</span>
          <button
            type="button"
            className="ml-0.5 inline-flex shrink-0 rounded p-0.5 text-muted-foreground/70 hover:bg-muted/60 hover:text-foreground"
            onClick={onClearPin}
            aria-label="Use whole plan as context"
          >
            <X className="size-2.5" strokeWidth={2} />
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        className={cn(
          chipBase,
          "border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/45 hover:text-foreground dark:border-white/14 dark:hover:border-white/22",
        )}
        onClick={onPin}
        title={`Add ${contextLabel} to context`}
        aria-label={`Add ${contextLabel} to context`}
      >
        <Plus className="size-3 shrink-0" strokeWidth={1.75} />
        <PlanContextFileIcon format={deliverable.format} badge={section.number} />
        <span className="min-w-0 truncate italic">{contextLabel}</span>
      </button>
    </div>
  );
}
