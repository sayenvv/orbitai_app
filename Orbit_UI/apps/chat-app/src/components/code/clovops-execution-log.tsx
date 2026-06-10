"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Circle,
  Code2,
  FileText,
  FolderTree,
  ListChecks,
  Loader2,
  MessageSquare,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
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
  label: string;
  accent: string;
};

const AGENT_VISUALS: Record<string, AgentVisual> = {
  gateway: { icon: Route, label: "Gateway", accent: "text-violet-500" },
  index_project: { icon: FolderTree, label: "Indexer", accent: "text-sky-500" },
  search_files: { icon: Search, label: "Search", accent: "text-amber-500" },
  build_context: { icon: FileText, label: "Context", accent: "text-cyan-500" },
  plan_changes: { icon: ListChecks, label: "Planner", accent: "text-indigo-500" },
  write_code: { icon: Code2, label: "Writer", accent: "text-emerald-500" },
  review_code: { icon: ShieldCheck, label: "Review", accent: "text-orange-500" },
  validate_code: { icon: Check, label: "Validator", accent: "text-teal-500" },
  chat_response: { icon: MessageSquare, label: "Assistant", accent: "text-blue-500" },
  explain_response: { icon: MessageSquare, label: "Assistant", accent: "text-blue-500" },
  terminal: { icon: Terminal, label: "Terminal", accent: "text-rose-500" },
};

const DEFAULT_VISUAL: AgentVisual = {
  icon: Sparkles,
  label: "Agent",
  accent: "text-primary",
};

function getAgentVisual(agentId: string, agentName: string): AgentVisual {
  const known = AGENT_VISUALS[agentId];
  if (known) return known;
  return { ...DEFAULT_VISUAL, label: agentName };
}

function StatusBadge({ status }: { status: ApiCodeWorkspaceAgentLogEntry["status"] }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        Running
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
        <X className="h-2.5 w-2.5" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
      <Check className="h-2.5 w-2.5" />
      Done
    </span>
  );
}

function TimelineNode({
  status,
  icon: Icon,
  accent,
}: {
  status: ApiCodeWorkspaceAgentLogEntry["status"];
  icon: LucideIcon;
  accent: string;
}) {
  if (status === "running") {
    return (
      <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-[0_0_0_4px_hsl(var(--background))]">
        <Loader2 className={cn("h-3.5 w-3.5 animate-spin", accent)} />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 shadow-[0_0_0_4px_hsl(var(--background))]">
        <X className="h-3.5 w-3.5 text-destructive" />
      </div>
    );
  }
  return (
    <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/50 shadow-[0_0_0_4px_hsl(var(--background))]">
      <Icon className={cn("h-3.5 w-3.5", accent)} />
    </div>
  );
}

function LogStep({
  entry,
  isLast,
  expanded,
  onToggle,
  compact,
}: {
  entry: ApiCodeWorkspaceAgentLogEntry;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
  compact: boolean;
}) {
  const visual = getAgentVisual(entry.agentId, entry.agent);
  const hasDetail = Boolean(entry.detail?.trim());

  return (
    <li className="relative flex gap-3 pb-0">
      {!isLast ? (
        <span
          aria-hidden
          className="absolute left-[13px] top-7 bottom-0 w-px bg-border/70"
        />
      ) : null}

      <TimelineNode status={entry.status} icon={visual.icon} accent={visual.accent} />

      <div className="min-w-0 flex-1 pb-4">
        <button
          type="button"
          onClick={hasDetail ? onToggle : undefined}
          disabled={!hasDetail}
          className={cn(
            "group flex w-full items-start justify-between gap-2 rounded-lg text-left transition-colors",
            hasDetail && "hover:bg-muted/30",
            compact ? "px-1.5 py-1" : "px-2 py-1.5",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[12px] font-semibold tracking-tight text-foreground">
                {visual.label}
              </span>
              <StatusBadge status={entry.status} />
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{entry.message}</p>
          </div>
          {hasDetail ? (
            <ChevronDown
              className={cn(
                "mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform",
                expanded && "rotate-180",
              )}
            />
          ) : null}
        </button>

        {hasDetail && expanded ? (
          <div
            className={cn(
              "mt-1.5 overflow-hidden rounded-md border border-border/40 bg-muted/25",
              compact ? "mx-1.5" : "mx-2",
            )}
          >
            <pre className="max-h-28 overflow-auto p-2.5 font-mono text-[10.5px] leading-relaxed text-foreground/85 [scrollbar-width:thin]">
              {entry.detail}
            </pre>
          </div>
        ) : null}
      </div>
    </li>
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

  const stats = useMemo(() => {
    const done = logs.filter((entry) => entry.status === "done").length;
    const running = logs.some((entry) => entry.status === "running");
    const failed = logs.some((entry) => entry.status === "error");
    return { done, total: logs.length, running, failed };
  }, [logs]);

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
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [logs, expandedIds]);

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
    <section
      className={cn(
        "w-full",
        !compact && "pl-11 sm:pl-12",
        className,
      )}
      aria-label="Agent activity"
    >
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm",
          live && "border-primary/20 shadow-[0_0_0_1px_hsl(var(--primary)/0.08)]",
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/20 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-tight text-foreground">
                Agent activity
              </p>
              <p className="text-[10px] text-muted-foreground">
                {stats.running
                  ? "Working through your request…"
                  : stats.failed
                    ? "Completed with errors"
                    : "Run complete"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {stats.running ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                <Circle className="h-2 w-2 fill-current animate-pulse" />
                Live
              </span>
            ) : null}
            <span className="rounded-md bg-background/80 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {stats.done}/{stats.total}
            </span>
          </div>
        </header>

        <div
          ref={scrollRef}
          className={cn(
            "px-3 pt-3 [scrollbar-width:thin]",
            compact ? "max-h-52 overflow-y-auto" : "max-h-72 overflow-y-auto",
          )}
        >
          <ol className="relative m-0 list-none p-0">
            {logs.map((entry, index) => (
              <LogStep
                key={entry.id}
                entry={entry}
                isLast={index === logs.length - 1}
                expanded={expandedIds.has(entry.id)}
                onToggle={() => toggleExpanded(entry.id)}
                compact={compact}
              />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
