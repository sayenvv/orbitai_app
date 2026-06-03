"use client";

import type { ReactNode } from "react";
import { Check, X, type LucideIcon } from "lucide-react";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const FORMAT_LABELS = {
  diagram: "Diagram",
  document: "Document",
  matrix: "Matrix",
} as const;

/** Shared surfaces and control styles for Project Studio. */
export const studioSurfaces = {
  page: "bg-background",
  panel: "rounded-xl border border-border/50 bg-card shadow-sm",
  mutedStrip: "border-t border-border/40 bg-muted/20",
  input:
    "h-9 rounded-lg border border-border/50 bg-background text-sm shadow-sm placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
} as const;

/** Black & white accent tokens (no brand color). */
export const studioMono = {
  accent: "bg-foreground text-background",
  accentSoft: "bg-foreground/[0.06]",
  accentRing: "ring-foreground/15",
  progress: "bg-foreground",
  progressMuted: "bg-foreground/35",
  metricBar: "bg-foreground/40",
  hoverTitle: "group-hover:text-foreground",
} as const;

type DashboardMetricProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
};

export function DashboardMetric({ label, value, hint, icon: Icon }: DashboardMetricProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-0.5 bg-foreground/25" aria-hidden />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

type DashboardProgressProps = {
  label: string;
  reviewed: number;
  total: number;
  className?: string;
};

export function DashboardProgress({ label, reviewed, total, className }: DashboardProgressProps) {
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{reviewed}</span>
          <span className="text-muted-foreground/80"> / {total}</span>
          <span className="ml-2 text-xs">({pct}%)</span>
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={reviewed}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", studioMono.progress)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type DashboardSectionTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function DashboardSectionTitle({
  eyebrow,
  title,
  description,
  action,
}: DashboardSectionTitleProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cn(
            "text-lg font-semibold tracking-tight text-foreground sm:text-xl",
            eyebrow ? "mt-1" : "",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type DashboardPhaseCardProps = {
  step: number;
  phaseLabel: string;
  icon: LucideIcon;
  itemCount: number;
  reviewedCount: number;
  complete: boolean;
  onOpen: () => void;
};

export function DashboardPhaseCard({
  step,
  phaseLabel,
  icon: PhaseIcon,
  itemCount,
  reviewedCount,
  complete,
  onOpen,
}: DashboardPhaseCardProps) {
  const pct = itemCount > 0 ? Math.round((reviewedCount / itemCount) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex h-full flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
        complete ? "border-foreground/25" : "border-border/50 hover:border-foreground/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-semibold tabular-nums text-foreground">
          {step}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-background">
          <PhaseIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        </span>
      </div>
      <h3 className={cn("mt-3 line-clamp-2 text-sm font-semibold leading-snug text-foreground", studioMono.hoverTitle)}>
        {phaseLabel}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">{itemCount} deliverables</p>
      <div className="mt-4 space-y-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              complete ? studioMono.progress : studioMono.progressMuted,
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="tabular-nums text-muted-foreground">
            {reviewedCount}/{itemCount} reviewed
          </span>
          {complete ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Check className="h-3 w-3" strokeWidth={2.5} />
              Complete
            </span>
          ) : (
            <span className="tabular-nums text-muted-foreground">{pct}%</span>
          )}
        </div>
      </div>
    </button>
  );
}

export function SegmentedTabList({
  children,
  className,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={cn("flex shrink-0 items-center", className)}>
      <div
        role="tablist"
        className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-border/40 bg-muted/30 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </nav>
  );
}

type DashboardTabProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
};

export function DashboardTab({ active, onClick, children, className, title }: DashboardTabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all duration-200",
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
          : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

type DocumentTabProps = {
  active: boolean;
  onClick: () => void;
  onClose?: () => void;
  children: ReactNode;
  title?: string;
};

/** Closable project tab — sits beside Home, not inside the view switcher group. */
export function DocumentTab({ active, onClick, onClose, children, title }: DocumentTabProps) {
  return (
    <div
      className={cn(
        "group flex h-8 max-w-[13rem] shrink-0 items-center rounded-lg border pr-0.5 transition-colors sm:max-w-[15rem]",
        active
          ? "border-border/60 bg-background shadow-sm"
          : "border-transparent bg-transparent hover:border-border/40 hover:bg-muted/25",
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active}
        title={title}
        onClick={onClick}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 py-1 pl-2.5 text-left text-xs font-medium",
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {children}
      </button>
      {onClose ? (
        <button
          type="button"
          aria-label={title ? `Close ${title}` : "Close tab"}
          title={title ? `Close ${title}` : "Close tab"}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="mr-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" strokeWidth={2.25} />
        </button>
      ) : null}
    </div>
  );
}

export function TabDivider() {
  return <div className="mx-1 hidden h-5 w-px shrink-0 bg-border/50 sm:block" aria-hidden />;
}

export function DashboardContentFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto bg-muted/10">
      <div className="mx-auto w-full max-w-6xl px-5 py-7 md:px-8 md:py-9">{children}</div>
    </div>
  );
}

export function DashboardPanel({
  children,
  className,
  noPadding = false,
}: {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={cn(
        studioSurfaces.panel,
        "overflow-hidden",
        !noPadding && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

type DashboardButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

export function DashboardButton({
  children,
  onClick,
  disabled,
  variant = "secondary",
  className,
}: DashboardButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" &&
          cn(studioMono.accent, "shadow-sm hover:opacity-90"),
        variant === "secondary" &&
          "border border-border/50 bg-background shadow-sm hover:bg-muted/40",
        variant === "ghost" && "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DashboardEmptyCanvas({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-[14rem] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/15 p-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-card shadow-sm">
        <span className="text-xl font-light text-muted-foreground/80">◇</span>
      </div>
      <p className="mt-5 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
        {description ??
          "Structured canvas and templates for this deliverable will appear here."}
      </p>
    </div>
  );
}

/** Compact program completion — sits in a corner of the progress strip. */
export function ProgramCompletionCorner({
  reviewed,
  total,
  className,
  compact = false,
}: {
  reviewed: number;
  total: number;
  className?: string;
  compact?: boolean;
}) {
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
  return (
    <div
      className={cn(
        "pointer-events-none flex items-center gap-2 rounded-md border border-border/50 bg-card/95 backdrop-blur-sm",
        compact ? "px-2 py-1" : "flex-col items-end px-3 py-2 shadow-sm",
        className,
      )}
      aria-label={`Program completion ${pct} percent, ${reviewed} of ${total} deliverables reviewed`}
    >
      {compact ? (
        <>
          <span className="text-[10px] font-medium text-muted-foreground">Program</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">{pct}%</span>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {reviewed}/{total}
          </span>
        </>
      ) : (
        <>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Program
          </span>
          <span className="text-xl font-semibold tabular-nums leading-none text-foreground">
            {pct}%
          </span>
          <span className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
            {reviewed}/{total}
          </span>
        </>
      )}
    </div>
  );
}

export function StatusBadge({
  children,
  variant = "muted",
}: {
  children: ReactNode;
  variant?: "muted" | "primary" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        variant === "muted" && "bg-muted text-muted-foreground",
        variant === "primary" && "bg-foreground/10 text-foreground",
        variant === "success" && "bg-muted text-foreground",
      )}
    >
      {children}
    </span>
  );
}
