"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  ListChecks,
  Loader2,
  Route,
  Terminal,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  collapseTaskEvents,
  extractRoutingMeta,
  filterWorkflowByCategory,
  type ApiCodeWorkspaceWorkflowEvent,
  type WorkflowEventStatus,
} from "@/lib/clovops-workflow-events";
import { cn } from "@/lib/utils";

type WorkflowTab = "tasks" | "tools" | "activity";

type ClovopsWorkflowPanelProps = {
  events: ApiCodeWorkspaceWorkflowEvent[];
  className?: string;
  live?: boolean;
};

const TAB_LABELS: Record<WorkflowTab, string> = {
  tasks: "Tasks",
  tools: "Tools",
  activity: "Activity",
};

const STATUS_ICONS: Record<WorkflowEventStatus, LucideIcon> = {
  info: Activity,
  running: Loader2,
  success: Check,
  error: X,
  warning: Activity,
};

function StatusIcon({ status }: { status: WorkflowEventStatus }) {
  const Icon = STATUS_ICONS[status];
  if (status === "running") {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />;
  }
  if (status === "error") {
    return <X className="h-3.5 w-3.5 shrink-0 text-destructive/90" />;
  }
  if (status === "warning") {
    return <Activity className="h-3.5 w-3.5 shrink-0 text-amber-500/90" />;
  }
  if (status === "success") {
    return <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />;
  }
  return <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />;
}

function CategoryIcon({ event }: { event: ApiCodeWorkspaceWorkflowEvent }) {
  if (event.category === "tool") {
    return event.meta?.tool === "terminal" ? (
      <Terminal className="h-3 w-3 shrink-0 text-muted-foreground/60" />
    ) : (
      <Wrench className="h-3 w-3 shrink-0 text-muted-foreground/60" />
    );
  }
  if (event.category === "plan") {
    return <ListChecks className="h-3 w-3 shrink-0 text-muted-foreground/60" />;
  }
  if (event.category === "routing") {
    return <Route className="h-3 w-3 shrink-0 text-muted-foreground/60" />;
  }
  return <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground/60" />;
}

function WorkflowRow({
  event,
  expanded,
  onToggle,
  compact = false,
}: {
  event: ApiCodeWorkspaceWorkflowEvent;
  expanded: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const hasDetail = Boolean(event.detail?.trim() || event.message?.trim());
  const subtitle = compact ? event.message : event.message;

  return (
    <div
      className={cn(
        "group/row rounded-md transition-colors",
        event.status === "running" && "bg-muted/30",
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
          <StatusIcon status={event.status} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <CategoryIcon event={event} />
            <span
              className={cn(
                "truncate text-[12px] leading-snug",
                event.status === "running"
                  ? "text-foreground"
                  : event.status === "error"
                    ? "text-destructive"
                    : "text-foreground/85",
              )}
            >
              {event.title}
            </span>
            {!compact ? (
              <span className="shrink-0 rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground/70">
                {event.kind.replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 truncate pl-[18px] text-[11px] leading-snug text-muted-foreground/80">
              {subtitle}
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
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap p-2.5 font-mono text-[10.5px] leading-relaxed text-foreground/75 [scrollbar-width:thin]">
            {event.detail?.trim() || event.message}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function PipelineStrip({ pipeline }: { pipeline: string[] }) {
  if (!pipeline.length) return null;
  return (
    <div className="border-b border-border/25 px-2.5 py-2">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Pipeline
      </p>
      <div className="flex flex-wrap gap-1">
        {pipeline.map((step) => (
          <span
            key={step}
            className="rounded-md border border-border/30 bg-background/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
          >
            {step.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ClovopsWorkflowPanel({ events, className, live = false }: ClovopsWorkflowPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<WorkflowTab>("tasks");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const routing = useMemo(() => extractRoutingMeta(events), [events]);
  const tasks = useMemo(() => collapseTaskEvents(events), [events]);
  const tools = useMemo(() => filterWorkflowByCategory(events, "tools"), [events]);
  const activity = events;

  const tabEvents = tab === "tasks" ? tasks : tab === "tools" ? tools : activity;

  const stats = useMemo(() => {
    const running = events.some((event) => event.status === "running");
    const failed = events.some((event) => event.status === "error");
    return { running, failed, total: events.length };
  }, [events]);

  const headerLabel = useMemo(() => {
    if (stats.running) return "Workflow running…";
    if (stats.failed) return "Workflow finished with errors";
    if (stats.total > 0) return "Workflow complete";
    return "Workflow";
  }, [stats]);

  useEffect(() => {
    if (live) setPanelOpen(true);
  }, [live]);

  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set(current);
      let changed = false;
      for (const event of tabEvents) {
        if ((event.status === "running" || event.detail) && !next.has(event.id)) {
          next.add(event.id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [tabEvents]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !live) return;
    container.scrollTop = container.scrollHeight;
  }, [tabEvents, expandedIds, live, tab]);

  if (!events.length) return null;

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className={cn("mt-1 w-full", className)} aria-label="Workflow">
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-border/35 bg-muted/10",
          live && stats.running && "border-border/50",
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
          ) : (
            <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          )}
          <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">{headerLabel}</span>
          {routing?.requestType ? (
            <span className="shrink-0 rounded bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {String(routing.requestType).replace(/_/g, " ")}
            </span>
          ) : null}
        </button>

        {panelOpen ? (
          <>
            {routing?.pipeline?.length ? <PipelineStrip pipeline={routing.pipeline} /> : null}

            <div className="flex border-b border-border/25 px-1 pt-1">
              {(Object.keys(TAB_LABELS) as WorkflowTab[]).map((key) => {
                const count =
                  key === "tasks"
                    ? tasks.length
                    : key === "tools"
                      ? tools.length
                      : activity.length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={cn(
                      "relative px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                      tab === key
                        ? "text-foreground"
                        : "text-muted-foreground/70 hover:text-muted-foreground",
                    )}
                  >
                    {TAB_LABELS[key]}
                    <span className="ml-1 font-mono text-[10px] tabular-nums text-muted-foreground/60">
                      {count}
                    </span>
                    {tab === key ? (
                      <span className="absolute inset-x-1.5 bottom-0 h-px bg-foreground/70" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div
              ref={scrollRef}
              className="max-h-64 overflow-y-auto px-1 py-1 [scrollbar-width:thin]"
            >
              {tabEvents.length === 0 ? (
                <p className="px-2 py-3 text-[11px] text-muted-foreground/70">
                  No {TAB_LABELS[tab].toLowerCase()} yet.
                </p>
              ) : (
                tabEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className={cn(index > 0 && "border-t border-border/20")}
                  >
                    <WorkflowRow
                      event={event}
                      expanded={expandedIds.has(event.id)}
                      onToggle={() => toggleExpanded(event.id)}
                      compact={tab === "activity"}
                    />
                  </div>
                ))
              )}
            </div>
          </>
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
