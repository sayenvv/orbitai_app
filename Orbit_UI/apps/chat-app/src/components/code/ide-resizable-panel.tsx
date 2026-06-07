"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IdeResizablePanelProps = {
  side: "left" | "right";
  width: number;
  onResizeStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
  resizable?: boolean;
  className?: string;
  children: ReactNode;
};

export function IdeResizablePanel({
  side,
  width,
  onResizeStart,
  resizable = true,
  className,
  children,
}: IdeResizablePanelProps) {
  return (
    <aside
      data-side={side}
      className={cn(
        "ide-panel sidebar-glass relative hidden shrink-0 flex-col overflow-hidden md:flex",
        className,
      )}
      style={{ width }}
    >
      {children}
      {resizable && onResizeStart && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={side === "left" ? "Resize left sidebar" : "Resize right sidebar"}
          onPointerDown={onResizeStart}
          className={cn(
            "ide-resize-handle absolute top-0 z-10 h-full w-1.5 cursor-col-resize touch-none",
            side === "left" ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2",
          )}
        />
      )}
    </aside>
  );
}
