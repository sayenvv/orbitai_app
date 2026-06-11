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
  type ApiCodeWorkspaceWorkflowEvent,
  type WorkflowEventStatus,
} from "@/lib/clovops-workflow-events";
import { cn } from "@/lib/utils";

type ClovopsWorkflowPanelProps = {
  events: ApiCodeWorkspaceWorkflowEvent[];
  className?: string;
  live?: boolean;
  embedded?: boolean;
  muted?: boolean;
};

const STATUS_ICONS: Record<WorkflowEventStatus, LucideIcon> = {
  info: Activity,
  running: Loader2,
  success: Check,
  error: X,
  warning: Activity,
};

function StatusIcon({ status, muted = false }: { status: WorkflowEventStatus; muted?: boolean }) {
  const Icon = STATUS_ICONS[status];
  if (status === "running") {
    return (
      <Loader2
        className={cn(
          "shrink-0 animate-spin",
          muted ? "h-2.5 w-2.5 text-muted-foreground/50" : "h-3.5 w-3.5 text-muted-foreground",
        )}
      />
    );
  }
  if (status === "error") {
    return (
      <X
        className={cn(
          "shrink-0",
          muted ? "h-2.5 w-2.5 text-destructive/70" : "h-3.5 w-3.5 text-destructive/90",
        )}
      />
    );
  }
  if (status === "warning") {
    return (
      <Activity
        className={cn(
          "shrink-0",
          muted ? "h-2.5 w-2.5 text-amber-500/60" : "h-3.5 w-3.5 text-amber-500/90",
        )}
      />
    );
  }
  if (status === "success") {
    return (
      <Check
        className={cn(
          "shrink-0",
          muted ? "h-2.5 w-2.5 text-muted-foreground/35" : "h-3.5 w-3.5 text-muted-foreground/70",
        )}
      />
    );
  }
  return (
    <Icon
      className={cn(
        "shrink-0",
        muted ? "h-2.5 w-2.5 text-muted-foreground/35" : "h-3.5 w-3.5 text-muted-foreground/60",
      )}
    />
  );
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
  muted = false,
}: {
  event: ApiCodeWorkspaceWorkflowEvent;
  expanded: boolean;
  onToggle: () => void;
  muted?: boolean;
}) {
  const hasDetail = Boolean(event.detail?.trim());
  const title = event.message ? `${event.title} — ${event.message}` : event.title;

  return (
    <div
      className={cn(
        "group/row rounded-md transition-colors",
        !muted && event.status === "running" && "bg-muted/30",
        !muted && hasDetail && "hover:bg-muted/25",
        muted && hasDetail && "hover:bg-muted/10",
      )}
    >
      <button
        type="button"
        onClick={hasDetail ? onToggle : undefined}
        disabled={!hasDetail}
        className={cn(
          "flex w-full items-start gap-2 px-2 py-1 text-left",
          muted ? "gap-1.5 py-0.5" : "gap-2.5 px-2 py-1.5",
          !hasDetail && "cursor-default",
        )}
      >
        <div className={cn("flex shrink-0 justify-center", muted ? "mt-0.5 w-3" : "mt-0.5 w-3.5")}>
          <StatusIcon status={event.status} muted={muted} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {!muted ? <CategoryIcon event={event} /> : null}
            <span
              className={cn(
                "truncate leading-snug",
                muted ? "text-[11px]" : "text-[12px]",
                muted
                  ? event.status === "running"
                    ? "text-muted-foreground/70"
                    : event.status === "error"
                      ? "text-destructive/75"
                      : "text-muted-foreground/45"
                  : event.status === "running"
                    ? "text-foreground"
                    : event.status === "error"
                      ? "text-destructive"
                      : "text-foreground/85",
              )}
            >
              {title}
            </span>
          </div>
        </div>
        {hasDetail ? (
          <ChevronDown
            className={cn(
              "mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/30 transition-transform",
              !muted && "h-3.5 w-3.5 text-muted-foreground/40",
              expanded && "rotate-180",
            )}
          />
        ) : null}
      </button>
      {hasDetail && expanded ? (
        <div
          className={cn(
            "mx-2 mb-1.5 ml-[22px] overflow-hidden rounded-md",
            muted
              ? "bg-transparent"
              : "border border-border/30 bg-muted/20",
          )}
        >
          <pre
            className={cn(
              "max-h-32 overflow-auto whitespace-pre-wrap p-2 font-mono leading-relaxed [scrollbar-width:thin]",
              muted
                ? "text-[10px] text-muted-foreground/40"
                : "text-[10.5px] text-foreground/75",
            )}
          >
            {event.detail}
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

export function ClovopsWorkflowPanel({
  events,
  className,
  live = false,
  embedded = false,
  muted: mutedProp,
}: ClovopsWorkflowPanelProps) {
  const muted = mutedProp ?? embedded;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const routing = useMemo(() => extractRoutingMeta(events), [events]);
  const steps = useMemo(() => collapseTaskEvents(events), [events]);

  const stats = useMemo(() => {
    const running = steps.some((event) => event.status === "running");
    const failed = steps.some((event) => event.status === "error");
    return { running, failed, total: steps.length };
  }, [steps]);

  const headerLabel = useMemo(() => {
    if (stats.running) return "Running…";
    if (stats.failed) return "Finished with errors";
    if (stats.total > 0) return `${stats.total} step${stats.total === 1 ? "" : "s"}`;
    return "Agent steps";
  }, [stats]);

  useEffect(() => {
    if (live) setPanelOpen(true);
  }, [live]);

  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set(current);
      let changed = false;
      for (const event of steps) {
        if ((event.status === "running" || event.detail) && !next.has(event.id)) {
          next.add(event.id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [steps]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !live) return;
    container.scrollTop = container.scrollHeight;
  }, [steps, expandedIds, live]);

  if (!steps.length) return null;

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className={cn("mt-1 w-full", className)} aria-label="Execution log">
      <div
        className={cn(
          "overflow-hidden",
          muted
            ? "rounded-md bg-transparent"
            : embedded
              ? "rounded-md bg-muted/15"
              : "rounded-lg border border-border/35 bg-muted/10",
          !muted && !embedded && live && stats.running && "border-border/50",
        )}
      >
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          className={cn(
            "flex w-full items-center gap-2 text-left transition-colors",
            muted ? "px-2 py-1 hover:bg-muted/10" : "px-2.5 py-2 hover:bg-muted/20",
          )}
        >
          {panelOpen ? (
            <ChevronDown
              className={cn(
                "shrink-0 text-muted-foreground/40",
                muted ? "h-3 w-3" : "h-3.5 w-3.5 text-muted-foreground/60",
              )}
            />
          ) : (
            <ChevronRight
              className={cn(
                "shrink-0 text-muted-foreground/40",
                muted ? "h-3 w-3" : "h-3.5 w-3.5 text-muted-foreground/60",
              )}
            />
          )}
          {live && stats.running ? (
            <Loader2
              className={cn(
                "shrink-0 animate-spin text-muted-foreground/50",
                muted ? "h-2.5 w-2.5" : "h-3 w-3 text-muted-foreground",
              )}
            />
          ) : muted ? null : (
            <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          )}
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              muted
                ? "text-[10px] font-medium uppercase tracking-wider text-muted-foreground/45"
                : "text-[12px] text-muted-foreground",
            )}
          >
            {muted ? "Execution log" : headerLabel}
          </span>
          {!muted && routing?.requestType ? (
            <span className="shrink-0 rounded bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {String(routing.requestType).replace(/_/g, " ")}
            </span>
          ) : null}
          {muted && stats.total > 0 ? (
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/35">
              {stats.running ? headerLabel : `${stats.total} step${stats.total === 1 ? "" : "s"}`}
            </span>
          ) : null}
        </button>

        {panelOpen ? (
          <>
            {!muted && routing?.pipeline?.length ? (
              <PipelineStrip pipeline={routing.pipeline} />
            ) : null}
            <div
              ref={scrollRef}
              className={cn(
                "overflow-y-auto px-1 [scrollbar-width:thin]",
                muted ? "max-h-36 py-0.5" : "max-h-52 py-1",
              )}
            >
              {steps.map((event, index) => (
                <div
                  key={event.id}
                  className={cn(index > 0 && !muted && "border-t border-border/20")}
                >
                  <WorkflowRow
                    event={event}
                    expanded={expandedIds.has(event.id)}
                    onToggle={() => toggleExpanded(event.id)}
                    muted={muted}
                  />
                </div>
              ))}
            </div>
          </>
        ) : null}

        {live && stats.running && !muted ? (
          <div className="h-px w-full bg-border/30">
            <div className="h-full w-1/3 animate-pulse bg-foreground/10" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
