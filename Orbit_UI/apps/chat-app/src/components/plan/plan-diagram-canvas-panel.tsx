"use client";

import type { ReactNode } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export const PLAN_DIAGRAM_PANEL_COLLAPSED_WIDTH = 44;

type PlanDiagramCanvasPanelProps = {
  side: "left" | "right";
  title: string;
  icon: LucideIcon;
  width: number;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onResizeStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
  resizable?: boolean;
  children: ReactNode;
};

export function PlanDiagramCanvasPanel({
  side,
  title,
  icon: Icon,
  width,
  collapsed,
  onCollapsedChange,
  onResizeStart,
  resizable = true,
  children,
}: PlanDiagramCanvasPanelProps) {
  const CollapseIcon = side === "left" ? PanelLeftClose : PanelRightClose;
  const ExpandIcon = side === "left" ? PanelLeftOpen : PanelRightOpen;

  if (collapsed) {
    return (
      <aside
        className={cn(
          "flex shrink-0 flex-col border-border/60 bg-muted/15",
          side === "left" ? "border-r" : "border-l",
        )}
        style={{ width: PLAN_DIAGRAM_PANEL_COLLAPSED_WIDTH }}
      >
        <div className="flex flex-col items-center gap-1 border-b border-border/50 p-1.5">
          <button
            type="button"
            title={title}
            onClick={() => onCollapsedChange(false)}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            aria-label={`Expand ${title}`}
          >
            <Icon className="size-4" />
          </button>
        </div>
        <div className="mt-auto flex justify-center p-1.5">
          <button
            type="button"
            onClick={() => onCollapsedChange(false)}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            aria-label={`Expand ${title}`}
          >
            <ExpandIcon className="size-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden border-border/60 bg-muted/15",
        side === "left" ? "border-r" : "border-l",
      )}
      style={{ width }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-[11px] font-semibold text-foreground">{title}</span>
        </div>
        <button
          type="button"
          onClick={() => onCollapsedChange(true)}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          aria-label={`Collapse ${title}`}
        >
          <CollapseIcon className="size-3.5" />
        </button>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      {resizable && onResizeStart ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${title}`}
          onPointerDown={onResizeStart}
          className={cn(
            "absolute top-0 z-10 h-full w-1.5 cursor-col-resize touch-none hover:bg-primary/25",
            side === "left" ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2",
          )}
        />
      ) : null}
    </aside>
  );
}
