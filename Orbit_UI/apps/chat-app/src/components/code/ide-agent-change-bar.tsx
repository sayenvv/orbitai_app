"use client";

import { Check, ChevronDown, ChevronUp, GitCompare, RotateCcw } from "lucide-react";
import {
  formatDiffStats,
  formatLineRange,
  groupLineNumbers,
} from "@/lib/agent-change-diff";
import type { AgentChangeRecord } from "@/lib/orbit-api";
import { cn } from "@/lib/utils";

type IdeAgentChangeBarProps = {
  change: AgentChangeRecord;
  addedLines: number[];
  activeAddedLine?: number | null;
  onNavigateAddedLine?: (line: number) => void;
  onNextAddition?: () => void;
  onPreviousAddition?: () => void;
  onAccept: () => void;
  onReject: () => void;
  busy?: boolean;
  className?: string;
};

export function IdeAgentChangeBar({
  change,
  addedLines,
  activeAddedLine = null,
  onNavigateAddedLine,
  onNextAddition,
  onPreviousAddition,
  onAccept,
  onReject,
  busy = false,
  className,
}: IdeAgentChangeBarProps) {
  if (change.reviewStatus !== "pending") return null;

  const added = change.linesAdded ?? addedLines.length;
  const removed = change.linesRemoved ?? 0;
  const statsLabel = formatDiffStats(added, removed);
  const lineRanges = groupLineNumbers(addedLines);
  const visibleRanges = lineRanges.slice(0, 6);
  const hiddenRangeCount = Math.max(0, lineRanges.length - visibleRanges.length);
  const hasAdditions = addedLines.length > 0;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 border-b border-[color:var(--ide-border-subtle)] bg-[#f6f8fa] px-3 py-2.5 dark:bg-[#161b22]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <GitCompare className="mt-0.5 h-4 w-4 shrink-0 text-[#1a7f37] dark:text-[#3fb950]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[12px] font-semibold text-foreground">Review agent changes</p>
            <span className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-[10px] text-[#1a7f37] dark:text-[#3fb950]">
              {statsLabel}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {change.summary?.trim() ||
              (change.created
                ? "All highlighted lines are new. Use the navigator to jump between additions."
                : "Green + rows are new code. Red − rows show removed code.")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-[#cf222e]/25 bg-[#ffebe9]/60 px-2.5 py-1.5 text-[11px] font-medium text-[#82071e] transition-colors hover:bg-[#ffebe9] disabled:opacity-50 dark:border-[#f85149]/30 dark:bg-[#442222]/40 dark:text-[#ffaba8] dark:hover:bg-[#442222]/70"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reject
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-[#2da44e]/30 bg-[#2da44e] px-2.5 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-92 disabled:opacity-50 dark:border-[#3fb950]/35 dark:bg-[#238636]"
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-7">
        <div className="flex items-center gap-1.5 rounded-md border border-border/35 bg-background/50 px-2 py-1 text-[10px]">
          <span className="inline-flex items-center gap-1 font-medium text-[#1a7f37] dark:text-[#3fb950]">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#dafbe1] font-bold dark:bg-[#033a16]">
              +
            </span>
            New lines
          </span>
          <span className="text-muted-foreground/35">|</span>
          <span className="inline-flex items-center gap-1 font-medium text-[#cf222e] dark:text-[#f85149]">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#ffebe9] font-bold dark:bg-[#442222]">
              −
            </span>
            Removed
          </span>
        </div>

        {hasAdditions ? (
          <>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                Additions
              </span>
              {visibleRanges.map((range) => {
                const label = formatLineRange(range.start, range.end);
                const isActive =
                  activeAddedLine != null &&
                  activeAddedLine >= range.start &&
                  activeAddedLine <= range.end;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onNavigateAddedLine?.(range.start)}
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors",
                      isActive
                        ? "border-[#2da44e]/40 bg-[#dafbe1] text-[#116329] dark:border-[#3fb950]/35 dark:bg-[#033a16] dark:text-[#7ee787]"
                        : "border-[#2da44e]/20 bg-[#dafbe1]/50 text-[#1a7f37] hover:bg-[#dafbe1] dark:border-[#3fb950]/20 dark:bg-[#033a16]/40 dark:text-[#3fb950] dark:hover:bg-[#033a16]/70",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
              {hiddenRangeCount > 0 ? (
                <span className="text-[10px] text-muted-foreground">+{hiddenRangeCount} more</span>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPreviousAddition}
                disabled={!onPreviousAddition}
                className="inline-flex items-center gap-0.5 rounded-md border border-border/40 px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-40"
                aria-label="Previous addition"
              >
                <ChevronUp className="h-3 w-3" />
                Prev
              </button>
              <button
                type="button"
                onClick={onNextAddition}
                disabled={!onNextAddition}
                className="inline-flex items-center gap-0.5 rounded-md border border-border/40 px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-40"
                aria-label="Next addition"
              >
                Next
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground">No new lines detected in this change.</span>
        )}
      </div>
    </div>
  );
}
