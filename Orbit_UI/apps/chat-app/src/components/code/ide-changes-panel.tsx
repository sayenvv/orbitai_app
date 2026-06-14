"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileDiff,
  RotateCcw,
} from "lucide-react";
import {
  countDiffStats,
  formatDiffStats,
} from "@/lib/agent-change-diff";
import { AgentChangeDiffView } from "@/components/code/ide-agent-change-diff-view";
import type { AgentChangeRecord } from "@/lib/orbit-api";
import { cn } from "@/lib/utils";

type IdeChangesPanelProps = {
  changes: AgentChangeRecord[];
  selectedId?: string | null;
  onSelect?: (change: AgentChangeRecord) => void;
  onOpenFile?: (fileId: string) => void;
  onAccept?: (change: AgentChangeRecord) => void;
  onReject?: (change: AgentChangeRecord) => void;
  busyFileId?: string | null;
};

function reviewBadge(status: AgentChangeRecord["reviewStatus"]) {
  if (status === "accepted") {
    return (
      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
        Accepted
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        Rejected
      </span>
    );
  }
  return (
    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
      Pending
    </span>
  );
}

export function IdeChangesPanel({
  changes,
  selectedId,
  onSelect,
  onOpenFile,
  onAccept,
  onReject,
  busyFileId,
}: IdeChangesPanelProps) {
  if (changes.length === 0) {
    return (
      <p className="px-2 py-3 text-[12px] text-muted-foreground">
        No file changes from the agent yet.
      </p>
    );
  }

  return (
    <ul className="space-y-1 p-2 [scrollbar-width:thin]">
      {changes.map((change) => {
        const expanded = selectedId === change.fileId;
        const previousContent = change.previousContent ?? "";
        const newContent = change.newContent ?? "";
        const stats =
          change.linesAdded != null && change.linesRemoved != null
            ? { added: change.linesAdded, removed: change.linesRemoved }
            : countDiffStats(previousContent, newContent);
        const busy = busyFileId === change.fileId;

        return (
          <li
            key={change.fileId}
            className={cn(
              "overflow-hidden rounded-lg border transition-colors",
              expanded
                ? "border-border/50 bg-muted/15"
                : "border-border/30 bg-background/40 hover:border-border/45",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect?.(change)}
              className="flex w-full items-start gap-2.5 px-2.5 py-2 text-left"
            >
              {expanded ? (
                <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <FileDiff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-mono text-[12px] text-foreground">
                    {change.filePath}
                  </span>
                  {reviewBadge(change.reviewStatus)}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{change.created ? "Created" : "Modified"}</span>
                  <span className="font-mono text-emerald-600/90 dark:text-emerald-400/90">
                    {formatDiffStats(stats.added, stats.removed)}
                  </span>
                  {!change.syntaxOk ? <span>· syntax check failed</span> : null}
                </span>
                {change.summary ? (
                  <span className="mt-1 block line-clamp-2 text-[11px] leading-relaxed text-foreground/75">
                    {change.summary}
                  </span>
                ) : null}
              </span>
            </button>

            {expanded ? (
              <div className="space-y-2 border-t border-border/25 px-2.5 pb-2.5 pt-2">
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Why this changed
                  </p>
                  <p className="text-[12px] leading-relaxed text-foreground/85">
                    {change.summary?.trim() ||
                      (change.created
                        ? "The agent created this file as part of its plan."
                        : "The agent updated this file to implement the requested change.")}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Diff
                  </p>
                  <AgentChangeDiffView
                    filePath={change.filePath}
                    previousContent={previousContent}
                    newContent={newContent}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenFile?.(change.fileId)}
                    className="inline-flex items-center gap-1 rounded-md border border-border/40 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/30"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in editor
                  </button>
                  {change.reviewStatus === "pending" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onReject?.(change)}
                        className="inline-flex items-center gap-1 rounded-md border border-border/40 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onAccept?.(change)}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-emerald-500"
                      >
                        <Check className="h-3 w-3" />
                        Accept
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
