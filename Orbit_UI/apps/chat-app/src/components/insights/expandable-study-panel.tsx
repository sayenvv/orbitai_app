"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, X } from "lucide-react";
import { studyPanelClass, studyPanelHeaderClass } from "@/components/insights/insights-shell";
import { cn } from "@/lib/utils";

type ExpandableStudyPanelProps = {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  accent?: "document" | "insights" | "chat";
};

const accentStyles = {
  document: {
    icon: "bg-rose-500/10 text-rose-600 ring-rose-500/15 dark:text-rose-400",
    header: "bg-gradient-to-r from-rose-500/[0.04] to-transparent",
  },
  insights: {
    icon: "bg-primary/10 text-primary ring-primary/15",
    header: "bg-gradient-to-r from-primary/[0.06] to-transparent",
  },
  chat: {
    icon: "bg-violet-500/10 text-violet-600 ring-violet-500/15 dark:text-violet-400",
    header: "bg-gradient-to-r from-violet-500/[0.05] to-transparent",
  },
};

export function ExpandableStudyPanel({
  title,
  subtitle,
  icon,
  isExpanded,
  onExpand,
  onCollapse,
  children,
  className,
  bodyClassName,
  accent = "document",
}: ExpandableStudyPanelProps) {
  const [mounted, setMounted] = useState(false);
  const styles = accentStyles[accent];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isExpanded) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCollapse();
    };
    document.addEventListener("keydown", handleEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = prev;
    };
  }, [isExpanded, onCollapse]);

  const header = (
    <div className={cn(studyPanelHeaderClass, styles.header)}>
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
            styles.icon,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={isExpanded ? onCollapse : onExpand}
        title={isExpanded ? "Exit focus mode" : "Focus mode"}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border/45 bg-background/80 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground"
      >
        {isExpanded ? (
          <>
            <Minimize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </>
        ) : (
          <>
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Focus</span>
          </>
        )}
      </button>
    </div>
  );

  const body = (
    <div className={cn("min-h-0 flex-1 overflow-hidden", bodyClassName)}>
      {!isExpanded ? children : null}
    </div>
  );

  const panel = (
    <div
      className={cn(
        studyPanelClass,
        "flex min-h-0 flex-col",
        isExpanded && "ring-1 ring-primary/20",
        className,
      )}
    >
      {header}
      {isExpanded ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-muted/10 px-6 py-10 text-center">
          <p className="text-xs font-medium text-muted-foreground">Focus mode is active</p>
          <p className="text-[11px] text-muted-foreground/80">
            Press <kbd className="rounded-md border border-border/50 bg-background px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> or Exit to return
          </p>
        </div>
      ) : (
        body
      )}
    </div>
  );

  if (!isExpanded || !mounted) return panel;

  return (
    <>
      {panel}
      {createPortal(
        <div className="fixed inset-0 z-[10003] flex flex-col bg-background/95 backdrop-blur-md">
          <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-5 py-3.5 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
                  styles.icon,
                )}
              >
                {icon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                {subtitle && (
                  <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onCollapse}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/50 bg-background px-3.5 text-xs font-medium text-foreground hover:bg-muted/50"
            >
              <X className="h-3.5 w-3.5" />
              Close focus mode
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-4 md:p-6 lg:p-8">
            <div
              className={cn(
                "mx-auto h-full max-w-6xl min-h-0 overflow-hidden rounded-2xl border border-border/40 bg-card/50 shadow-lg",
                bodyClassName,
              )}
            >
              {children}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
