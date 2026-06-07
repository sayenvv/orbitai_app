"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IdeResizableBottomPanelProps = {
  height: number;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  className?: string;
  children: ReactNode;
};

export function IdeResizableBottomPanel({
  height,
  onResizeStart,
  className,
  children,
}: IdeResizableBottomPanelProps) {
  return (
    <div
      className={cn("ide-console-panel relative flex shrink-0 flex-col overflow-hidden backdrop-blur-xl", className)}
      style={{ height }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize bottom console"
        onPointerDown={onResizeStart}
        className="ide-resize-handle-horizontal absolute left-0 right-0 top-0 z-10 h-1.5 -translate-y-1/2 cursor-row-resize touch-none"
      />
      {children}
    </div>
  );
}
