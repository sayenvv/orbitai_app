"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  FolderTree,
  ListChecks,
  Loader2,
  MessageSquare,
  Search,
  ShieldCheck,
  Terminal,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ApiCodeWorkspaceAgentLogEntry } from "@/lib/orbit-api";
import { cn } from "@/lib/utils";

type ClovopsExecutionLogProps = {
  logs: ApiCodeWorkspaceAgentLogEntry[];
  className?: string;
  compact?: boolean;
  live?: boolean;
};

type AgentVisual = {
  icon: LucideIcon;
  verb: string;
};

const AGENT_VISUALS: Record<string, AgentVisual> = {
  gateway: { icon: MessageSquare, verb: "Understanding request" },
  index_project: { icon: FolderTree, verb: "Indexed project" },
  search_files: { icon: Search, verb: "Searched files" },
  build_context: { icon: FileText, verb: "Read context" },
  plan_changes: { icon: ListChecks, verb: "Planned changes" },
  write_code: { icon: Code2, verb: "Edited code" },
  review_code: { icon: ShieldCheck, verb: "Reviewed changes" },
  validate_code: { icon: Check, verb: "Validated" },
  chat_response: { icon: MessageSquare, verb: "Responded" },
  explain_response: { icon: MessageSquare, verb: "Explained" },
  terminal: { icon: Terminal, verb: "Ran command" },
};

function getAgentVisual(agentId: string, agentName: string): AgentVisual {
  return AGENT_VISUALS[agentId] ?? { icon: MessageSquare, verb: agentName };
}

const RUNNING_VERBS: Record<string, string> = {
  gateway: "Understanding request",
  index_project: "Indexing project",
  search_files: "Searching files",
  build_context: "Reading context",
  plan_changes: "Planning changes",
  write_code: "Editing code",
  review_code: "Reviewing changes",
  validate_code: "Validating",
  chat_response: "Responding",
  explain_response: "Explaining",
  terminal: "Running command",
};

function stepTitle(entry: ApiCodeWorkspaceAgentLogEntry): string {
  const visual = getAgentVisual(entry.agentId, entry.agent);
  if (entry.status === "running") {
    return RUNNING_VERBS[entry.agentId] ?? visual.verb;
  }
  if (entry.status === "error") {
    return `${visual.verb} failed`;
  }
  return visual.verb;
}

function StatusGlyph({ status }: { status: ApiCodeWorkspaceAgentLogEntry["status"] }) {
  if (status === "running") {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />;
  }
  if (status === "error") {
    return <X className="h-3.5 w-3.5 shrink-0 text-destructive/90" />;
  }
  return <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />;
}

function StepRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: ApiCodeWorkspaceAgentLogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const visual = getAgentVisual(entry.agentId, entry.agent);
  const Icon = visual.icon;
  const hasDetail = Boolean(entry.detail?.trim());
  const title = stepTitle(entry);

  return (
    <div
      className={cn(
        "group/step rounded-md transition-colors",
        entry.status === "running" && "bg-muted/30",
        hasDetail && "hover:bg-muted/25",
      )}
    >
      <button
        type="button"
        onClick={hasDetail ? onToggle : undefined}
        disabled={!hasDetail}
        className={cn(
          "flex w-full items-start gap-2.5 px-2 py-1.5 text-left",
          !hasDetail && "cursor-default",
        )}
      >
        <div className="mt-0.5 flex w-3.5 shrink-0 justify-center">
          <StatusGlyph status={entry.status} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
            <span
              className={cn(
                "truncate text-[12px] leading-snug",
                entry.status === "running"
                  ? "text-foreground"
                  : entry.status === "error"
                    ? "text-destructive"
                    : "text-foreground/85",
              )}
            >
              {title}
            </span>
          </div>
          {entry.message ? (
            <p className="mt-0.5 truncate pl-[18px] text-[11px] leading-snug text-muted-foreground/80">
              {entry.message}
            </p>
          ) : null}
        </div>

        {hasDetail ? (
          <ChevronDown
            className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform",
              expanded && "rotate-180",
            )}
          />
        ) : null}
      </button>

      {hasDetail && expanded ? (
        <div className="mx-2 mb-2 ml-[26px] overflow-hidden rounded-md border border-border/30 bg-muted/20">
          <pre className="max-h-32 overflow-auto p-2.5 font-mono text-[10.5px] leading-relaxed text-foreground/75 [scrollbar-width:thin]">
            {entry.detail}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export function ClovopsExecutionLog({
  logs,
  className,
  compact = false,
  live = false,
}: ClovopsExecutionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(true);

  const stats = useMemo(() => {
    const done = logs.filter((entry) => entry.status === "done").length;
    const runningEntries = logs.filter((entry) => entry.status === "running");
    const runningEntry = runningEntries[0] ?? null;
    const failed = logs.some((entry) => entry.status === "error");
    return {
      done,
      total: logs.length,
      running: runningEntries.length > 0,
      runningEntry,
      failed,
    };
  }, [logs]);

  const headerLabel = useMemo(() => {
    if (stats.running && stats.runningEntry) {
      return stepTitle(stats.runningEntry);
    }
    if (stats.failed) {
      return "Finished with errors";
    }
    if (stats.total > 0 && !stats.running) {
      return `${stats.done} step${stats.done === 1 ? "" : "s"}`;
    }
    return "Working…";
  }, [stats]);

  useEffect(() => {
    if (live) setPanelOpen(true);
  }, [live]);

  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set(current);
      let changed = false;
      for (const entry of logs) {
        if ((entry.status === "running" || entry.detail) && !next.has(entry.id)) {
          next.add(entry.id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [logs]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !live) return;
    container.scrollTop = container.scrollHeight;
  }, [logs, expandedIds, live]);

  if (!logs.length) return null;

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className={cn("mt-1 w-full", className)} aria-label="Agent steps">
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-border/35 bg-muted/10",
          live && "border-border/50",
        )}
      >
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-muted/20"
        >
          {panelOpen ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          )}

          {live && stats.running ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
          ) : null}

          <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
            {headerLabel}
          </span>

          {!live && stats.total > 0 ? (
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/60">
              {stats.done}/{stats.total}
            </span>
          ) : null}
        </button>

        {panelOpen ? (
          <div
            ref={scrollRef}
            className={cn(
              "border-t border-border/25 px-1 py-1 [scrollbar-width:thin]",
              compact ? "max-h-44 overflow-y-auto" : "max-h-60 overflow-y-auto",
            )}
          >
            {logs.map((entry, index) => (
              <div
                key={entry.id || `${entry.agentId}-${index}`}
                className={cn(index > 0 && "border-t border-border/20")}
              >
                <StepRow
                  entry={entry}
                  expanded={expandedIds.has(entry.id)}
                  onToggle={() => toggleExpanded(entry.id)}
                />
              </div>
            ))}
          </div>
        ) : null}

        {live && stats.running ? (
          <div className="h-px w-full bg-border/30">
            <div className="h-full w-1/3 animate-pulse bg-foreground/10" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
