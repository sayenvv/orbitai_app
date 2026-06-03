"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Group as GroupIcon,
  MoreHorizontal,
  Trash2,
  Ungroup,
  type LucideIcon,
} from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

type SelectionPanelAction = {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
};

export const CANVAS_SELECTION_PANEL_COMPACT_WIDTH = 44;
export const CANVAS_SELECTION_PANEL_COMPACT_HEIGHT = 220;
export const CANVAS_SELECTION_PANEL_MORE_WIDTH = 200;
export const CANVAS_SELECTION_PANEL_MORE_HEIGHT = 260;
export const CANVAS_SELECTION_PANEL_PADDING = 8;

/** @deprecated Use compact dimensions for in-canvas clamping. */
export const CANVAS_SELECTION_PANEL_WIDTH = CANVAS_SELECTION_PANEL_COMPACT_WIDTH;
export const CANVAS_SELECTION_PANEL_HEIGHT = CANVAS_SELECTION_PANEL_COMPACT_HEIGHT;

export type PhotoStudioCanvasSelectionPanelProps = {
  anchor: { top: number; left: number } | null;
  canvasHostRef: RefObject<HTMLElement | null>;
  selectionCount: number;
  canGroup: boolean;
  canUngroup: boolean;
  moreOpen?: boolean;
  onMoreOpenChange?: (open: boolean) => void;
  onDuplicate: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDelete: () => void;
};

function IconButton({
  action,
  active = false,
}: {
  action: SelectionPanelAction;
  active?: boolean;
}) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      title={`${action.label} — ${action.hint}`}
      aria-label={action.label}
      disabled={action.disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!action.disabled) action.onClick();
      }}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150",
        action.disabled && "cursor-not-allowed opacity-35",
        !action.disabled &&
          active &&
          "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20",
        !action.disabled &&
          !active &&
          action.variant === "danger" &&
          "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
        !action.disabled &&
          !active &&
          action.variant !== "danger" &&
          "text-foreground hover:bg-muted/80",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

function DetailButton({ action }: { action: SelectionPanelAction }) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      title={action.hint}
      disabled={action.disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!action.disabled) action.onClick();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold transition-colors",
        action.disabled && "cursor-not-allowed opacity-40",
        !action.disabled &&
          action.variant === "danger" &&
          "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
        !action.disabled &&
          action.variant !== "danger" &&
          "text-foreground hover:bg-muted/70",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          action.variant === "danger" ? "bg-muted/50" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <span className="min-w-0 truncate">{action.label}</span>
    </button>
  );
}

export function PhotoStudioCanvasSelectionPanel({
  anchor,
  canvasHostRef,
  selectionCount,
  canGroup,
  canUngroup,
  moreOpen: moreOpenProp,
  onMoreOpenChange,
  onDuplicate,
  onGroup,
  onUngroup,
  onDelete,
}: PhotoStudioCanvasSelectionPanelProps) {
  const [moreOpenInternal, setMoreOpenInternal] = useState(false);
  const moreOpen = moreOpenProp ?? moreOpenInternal;
  const setMoreOpen = onMoreOpenChange ?? setMoreOpenInternal;
  const toolbarRef = useRef<HTMLDivElement>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);
  const [morePanelPosition, setMorePanelPosition] = useState<{ left: number; top: number } | null>(
    null,
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [selectionCount, setMoreOpen]);

  const updateMorePanelPosition = () => {
    const host = canvasHostRef.current;
    if (!host || !anchor) {
      setMorePanelPosition(null);
      return;
    }

    const canvasRect = host.getBoundingClientRect();
    const gap = 10;
    const viewportPad = 12;

    let left = canvasRect.left + anchor.left + CANVAS_SELECTION_PANEL_COMPACT_WIDTH + gap;
    let top = canvasRect.top + anchor.top;

    if (left + CANVAS_SELECTION_PANEL_MORE_WIDTH > window.innerWidth - viewportPad) {
      left =
        canvasRect.left +
        anchor.left -
        gap -
        CANVAS_SELECTION_PANEL_MORE_WIDTH;
    }

    left = Math.max(
      viewportPad,
      Math.min(left, window.innerWidth - CANVAS_SELECTION_PANEL_MORE_WIDTH - viewportPad),
    );
    top = Math.max(
      viewportPad,
      Math.min(top, window.innerHeight - CANVAS_SELECTION_PANEL_MORE_HEIGHT - viewportPad),
    );

    setMorePanelPosition({ left, top });
  };

  useLayoutEffect(() => {
    if (!moreOpen) {
      setMorePanelPosition(null);
      return;
    }
    updateMorePanelPosition();
  }, [moreOpen, anchor?.left, anchor?.top, canGroup, selectionCount]);

  useEffect(() => {
    if (!moreOpen) return;

    const handleReposition = () => updateMorePanelPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [moreOpen, anchor?.left, anchor?.top]);

  useEffect(() => {
    if (!moreOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (toolbarRef.current?.contains(target)) return;
      if (morePanelRef.current?.contains(target)) return;
      setMoreOpen(false);
    };

    window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    }, 0);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [moreOpen, setMoreOpen]);

  if (!anchor || selectionCount === 0) return null;

  const detailActions: SelectionPanelAction[] = [
    {
      id: "duplicate",
      label: "Duplicate",
      hint: "Ctrl+D",
      icon: Copy,
      onClick: () => {
        onDuplicate();
        setMoreOpen(false);
      },
    },
    {
      id: "group",
      label: "Group",
      hint: "Move shapes together",
      icon: GroupIcon,
      onClick: () => {
        onGroup();
        setMoreOpen(false);
      },
      disabled: !canGroup,
    },
    {
      id: "ungroup",
      label: "Ungroup",
      hint: "Split grouped shapes",
      icon: Ungroup,
      onClick: () => {
        onUngroup();
        setMoreOpen(false);
      },
      disabled: !canUngroup,
    },
    {
      id: "delete",
      label: "Delete",
      hint: "Delete key",
      icon: Trash2,
      onClick: () => {
        onDelete();
        setMoreOpen(false);
      },
      variant: "danger",
    },
  ];

  const quickActions: SelectionPanelAction[] = [
    detailActions[0],
    ...(canGroup ? [detailActions[1]] : []),
    ...(canUngroup ? [detailActions[2]] : []),
    detailActions[3],
    {
      id: "more",
      label: "More options",
      hint: "Opens outside the canvas",
      icon: MoreHorizontal,
      onClick: () => setMoreOpen((open) => !open),
    },
  ];

  const morePanel =
    moreOpen && morePanelPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={morePanelRef}
            role="dialog"
            aria-label="Shape actions"
            className="fixed z-[200] w-[12.5rem] rounded-xl border border-border/50 bg-background p-2 shadow-[0_16px_40px_rgba(15,23,42,0.18)] ring-1 ring-black/5 backdrop-blur-md dark:bg-card"
            style={{
              left: morePanelPosition.left,
              top: morePanelPosition.top,
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-1.5 border-b border-border/40 px-1 pb-2 text-[11px] font-semibold text-foreground">
              {selectionCount > 1 ? `${selectionCount} shapes selected` : "Shape options"}
            </p>
            <div className="flex flex-col gap-0.5">
              {detailActions.map((action) => (
                <DetailButton key={action.id} action={action} />
              ))}
            </div>
            <p className="mt-2 border-t border-border/40 pt-2 text-[10px] leading-relaxed text-muted-foreground">
              Ctrl+click to multi-select. The quick toolbar stays on the canvas; this
              panel floats beside it.
            </p>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label={
          selectionCount > 1
            ? `${selectionCount} shapes selected`
            : "Shape actions"
        }
        className="pointer-events-auto absolute z-[35] flex w-11 flex-col gap-0.5 rounded-xl border border-violet-500/20 bg-background/98 p-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)] ring-1 ring-violet-500/10 backdrop-blur-md dark:bg-card/98"
        style={{
          left: anchor.left,
          top: anchor.top,
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="px-1 pb-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
          {selectionCount > 1 ? `${selectionCount}` : "Edit"}
        </p>
        {quickActions.map((action) => (
          <IconButton
            key={action.id}
            action={action}
            active={action.id === "more" && moreOpen}
          />
        ))}
      </div>
      {morePanel}
    </>
  );
}
