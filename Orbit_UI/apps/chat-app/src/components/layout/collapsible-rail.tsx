"use client";

import type { ReactNode } from "react";
import { PanelLeftClose, PanelRightClose } from "lucide-react";

import { cn } from "@/lib/utils";

export const COLLAPSIBLE_RAIL_EXPANDED_WIDTH = "w-[260px]";
export const COLLAPSIBLE_RAIL_COLLAPSED_WIDTH = "w-[3.25rem]";
export const COLLAPSIBLE_RAIL_INNER_WIDTH = "w-[260px]";
export const COLLAPSIBLE_RAIL_EXPANDED_WIDTH_PX = "260px";
export const COLLAPSIBLE_RAIL_COLLAPSED_WIDTH_PX = "3.25rem";

type CollapsibleRailSide = "left" | "right";

type CollapsibleRailProps = {
  side: CollapsibleRailSide;
  open: boolean;
  hydrated?: boolean;
  onToggle: () => void;
  ariaLabel: string;
  className?: string;
  renderBrand?: (expanded: boolean, onExpand: () => void) => ReactNode;
  header?: ReactNode;
  renderContent?: (expanded: boolean) => ReactNode;
  expandedBody?: ReactNode;
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

export function CollapsibleRail({
  side,
  open,
  hydrated = true,
  onToggle,
  ariaLabel,
  className,
  renderBrand,
  header,
  renderContent,
  expandedBody,
  loading = false,
  loadingFallback,
}: CollapsibleRailProps) {
  const collapseLabel = side === "left" ? "Collapse sidebar" : "Collapse panel";
  const showExpanded = !hydrated || open;
  const body = renderContent ? renderContent(showExpanded) : expandedBody;

  const handleExpand = () => {
    if (!showExpanded) onToggle();
  };

  return (
    <aside
      className={cn("flex h-full min-h-0 w-full flex-col overflow-hidden", className)}
      aria-label={ariaLabel}
      aria-expanded={open}
    >
      <div
        className={cn(
          "flex shrink-0 overflow-hidden bg-sidebar py-3",
          showExpanded ? "items-center gap-1 px-2" : "justify-center px-0",
        )}
      >
        <div
          className={cn(
            "min-w-0 overflow-hidden",
            showExpanded ? "flex-1" : "flex justify-center",
          )}
        >
          {renderBrand ? renderBrand(showExpanded, handleExpand) : header}
        </div>
        {showExpanded && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            title={collapseLabel}
            aria-label={collapseLabel}
          >
            <CollapseIcon side={side} />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:thin]",
            showExpanded ? COLLAPSIBLE_RAIL_INNER_WIDTH : "w-full",
          )}
        >
          {loading && loadingFallback ? loadingFallback : body}
        </div>
      </div>
    </aside>
  );
}
