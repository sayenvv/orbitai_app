"use client";

import type { ReactNode } from "react";
import { PanelLeft, PanelLeftClose, PanelRight, PanelRightClose } from "lucide-react";

import { cn } from "@/lib/utils";

export const COLLAPSIBLE_RAIL_EXPANDED_WIDTH = "w-[300px]";
export const COLLAPSIBLE_RAIL_COLLAPSED_WIDTH = "w-[3.25rem]";

type CollapsibleRailSide = "left" | "right";

type CollapsibleRailProps = {
  side: CollapsibleRailSide;
  open: boolean;
  hydrated?: boolean;
  onToggle: () => void;
  ariaLabel: string;
  className?: string;
  header?: ReactNode;
  expandedBody: ReactNode;
  collapsedBody?: ReactNode;
  loading?: boolean;
  loadingFallback?: ReactNode;
};

function CollapseIcon({ side }: { side: CollapsibleRailSide }) {
  return side === "left" ? (
    <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
  ) : (
    <PanelRightClose className="h-4 w-4" strokeWidth={2} />
  );
}

function ExpandIcon({ side }: { side: CollapsibleRailSide }) {
  return side === "left" ? (
    <PanelRight className="h-4 w-4" strokeWidth={2} />
  ) : (
    <PanelLeft className="h-4 w-4" strokeWidth={2} />
  );
}

export function CollapsibleRail({
  side,
  open,
  hydrated = true,
  onToggle,
  ariaLabel,
  className,
  header,
  expandedBody,
  collapsedBody,
  loading = false,
  loadingFallback,
}: CollapsibleRailProps) {
  const collapseLabel = side === "left" ? "Collapse sidebar" : "Collapse panel";
  const expandLabel = side === "left" ? "Expand sidebar" : "Expand panel";

  return (
    <aside
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden bg-background transition-[width] duration-300 ease-out",
        open ? COLLAPSIBLE_RAIL_EXPANDED_WIDTH : COLLAPSIBLE_RAIL_COLLAPSED_WIDTH,
        !hydrated && COLLAPSIBLE_RAIL_EXPANDED_WIDTH,
        className,
      )}
      aria-label={ariaLabel}
      aria-expanded={open}
    >
      {open ? (
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col bg-muted/20">
          <header className="flex shrink-0 items-center justify-between gap-3 bg-background px-4 py-3">
            <div className="min-w-0 flex-1">{header}</div>
            <button
              type="button"
              onClick={onToggle}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              title={collapseLabel}
              aria-label={collapseLabel}
            >
              <CollapseIcon side={side} />
            </button>
          </header>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin]">
            {loading && loadingFallback ? loadingFallback : expandedBody}
          </div>
        </div>
      ) : (
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col items-center bg-muted/20 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            title={expandLabel}
            aria-label={expandLabel}
          >
            <ExpandIcon side={side} />
          </button>
          {collapsedBody}
        </div>
      )}
    </aside>
  );
}
