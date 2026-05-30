import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Shared surface styles for AI Board / study views */
export const studyPanelClass =
  "overflow-hidden rounded-2xl border border-border/45 bg-card/75 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] backdrop-blur-sm dark:bg-card/60";

export const studyPanelHeaderClass =
  "flex items-start justify-between gap-3 border-b border-border/40 px-5 py-4";

export function StudyPageBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora opacity-70" />
        <div className="grid-dots absolute inset-0 opacity-[0.35]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/[0.06] to-transparent" />
      </div>
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

export function StudySectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function StudyTabStrip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-0.5 overflow-x-auto rounded-xl border border-border/40 bg-muted/25 p-1 [scrollbar-width:thin]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StudyTabButton({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
      )}
    >
      {children}
      {count != null && count > 0 && (
        <span
          className={cn(
            "min-w-[1.125rem] rounded-full px-1.5 py-px text-[10px] tabular-nums leading-none",
            active ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function StudyContentCard({
  children,
  className,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "muted" | "accent";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-4 md:px-5 md:py-5",
        variant === "default" && "border-border/40 bg-background/50",
        variant === "muted" && "border-border/35 bg-muted/20",
        variant === "accent" && "border-primary/15 bg-primary/[0.04]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StudyEmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/10 px-8 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40">
        <Icon className="h-5 w-5 text-muted-foreground/70" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">{message}</p>
    </div>
  );
}

export function StudyMetaPill({
  children,
  accent,
}: {
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        accent
          ? "border-primary/25 bg-primary/8 text-primary"
          : "border-border/40 bg-background/60 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
