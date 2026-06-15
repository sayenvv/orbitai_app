"use client";

import { useCallback } from "react";

function attachWorkspaceDragListeners({
  cursor,
  onMove,
}: {
  cursor: string;
  onMove: (moveEvent: MouseEvent) => void;
}) {
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText = `position:fixed;inset:0;z-index:9999;cursor:${cursor};background:transparent`;
  document.body.appendChild(overlay);

  const handleMouseMove = (moveEvent: MouseEvent) => {
    moveEvent.preventDefault();
    onMove(moveEvent);
  };

  const handleMouseUp = () => {
    overlay.remove();
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  document.body.style.cursor = cursor;
  document.body.style.userSelect = "none";
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
}

export function WorkspaceResizeHandle({
  onDrag,
  side = "right",
  ariaLabel = "Resize panel",
}: {
  onDrag: (deltaX: number) => void;
  side?: "left" | "right";
  ariaLabel?: string;
}) {
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      let lastX = event.clientX;

      attachWorkspaceDragListeners({
        cursor: "col-resize",
        onMove: (moveEvent) => {
          const rawDelta = moveEvent.clientX - lastX;
          lastX = moveEvent.clientX;
          const delta = side === "left" ? rawDelta : -rawDelta;
          if (delta !== 0) onDrag(delta);
        },
      });
    },
    [onDrag, side],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      onMouseDown={handleMouseDown}
      className="group relative hidden w-1 shrink-0 cursor-col-resize bg-border/40 lg:block hover:bg-primary/30"
    />
  );
}

export function WorkspaceVerticalResizeHandle({
  onDrag,
  ariaLabel = "Resize panel",
}: {
  onDrag: (deltaY: number) => void;
  ariaLabel?: string;
}) {
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      let lastY = event.clientY;

      attachWorkspaceDragListeners({
        cursor: "row-resize",
        onMove: (moveEvent) => {
          const delta = moveEvent.clientY - lastY;
          lastY = moveEvent.clientY;
          if (delta !== 0) onDrag(delta);
        },
      });
    },
    [onDrag],
  );

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={ariaLabel}
      onMouseDown={handleMouseDown}
      className="group relative h-1 shrink-0 cursor-row-resize bg-border/40 hover:bg-primary/30"
    />
  );
}

export const WORKSPACE_RESIZE_HANDLE_HEIGHT = 4;
