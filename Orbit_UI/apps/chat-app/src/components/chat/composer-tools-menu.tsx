"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComposerTool = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconGradient: string;
  badge?: string;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

type ComposerToolsMenuProps = {
  tools: ComposerTool[];
  disabled?: boolean;
  placement?: "top" | "bottom";
  ariaLabel?: string;
  variant?: "inline" | "pill";
  size?: "sm" | "md" | "lg";
  className?: string;
};

type PanelCoords = {
  top: number;
  left: number;
  width: number;
  resolvedPlacement: "top" | "bottom";
};

const PANEL_WIDTH = 320;
const VIEWPORT_PADDING = 12;
const GAP = 8;

const sizeClasses = {
  sm: "h-8 w-8 rounded-lg [&_svg]:h-4 [&_svg]:w-4",
  md: "h-9 w-9 rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]",
  lg: "h-12 w-12 rounded-2xl sm:h-14 sm:w-14 sm:rounded-[22px] [&_svg]:h-5 [&_svg]:w-5",
};

function computePanelCoords(
  trigger: HTMLElement,
  panel: HTMLElement | null,
  preferredPlacement: "top" | "bottom",
): PanelCoords {
  const rect = trigger.getBoundingClientRect();
  const panelWidth = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
  const panelHeight = panel?.offsetHeight ?? 280;

  const left = Math.min(
    Math.max(VIEWPORT_PADDING, rect.left),
    window.innerWidth - panelWidth - VIEWPORT_PADDING,
  );

  const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_PADDING;
  const spaceAbove = rect.top - GAP - VIEWPORT_PADDING;

  let resolvedPlacement = preferredPlacement;
  if (preferredPlacement === "bottom" && spaceBelow < panelHeight && spaceAbove > spaceBelow) {
    resolvedPlacement = "top";
  } else if (preferredPlacement === "top" && spaceAbove < panelHeight && spaceBelow > spaceAbove) {
    resolvedPlacement = "bottom";
  }

  const top =
    resolvedPlacement === "bottom"
      ? rect.bottom + GAP
      : Math.max(VIEWPORT_PADDING, rect.top - panelHeight - GAP);

  return { top, left, width: panelWidth, resolvedPlacement };
}

export function ComposerToolsMenu({
  tools,
  disabled = false,
  placement = "bottom",
  ariaLabel = "Add tools",
  variant = "inline",
  size = "md",
  className,
}: ComposerToolsMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const [visible, setVisible] = useState(false);

  const hasActiveTool = tools.some((tool) => tool.active);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setCoords(computePanelCoords(trigger, panelRef.current, placement));
  }, [placement]);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    setVisible(true);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    updatePosition();
  }, [open, tools.length, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    setVisible(false);
    setCoords(null);
  }, [open]);

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      return;
    }

    const trigger = triggerRef.current;
    if (trigger) {
      setCoords(computePanelCoords(trigger, null, placement));
    }
    setVisible(false);
    setOpen(true);
  };

  const handleSelect = (tool: ComposerTool) => {
    if (tool.disabled) return;
    setOpen(false);
    tool.onSelect();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(
          "press group relative inline-flex shrink-0 items-center justify-center transition-all duration-200",
          sizeClasses[size],
          variant === "inline"
            ? cn(
                "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                open || hasActiveTool
                  ? "bg-primary/10 text-primary"
                  : "bg-transparent",
              )
            : cn(
                "border shadow-sm",
                open || hasActiveTool
                  ? "border-primary/35 bg-primary/10 text-primary shadow-primary/10"
                  : "border-border/50 bg-muted/40 text-foreground/80 hover:border-primary/25 hover:bg-muted/60 hover:text-foreground",
              ),
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <Plus
          className={cn(
            "shrink-0 transition-transform duration-200",
            open && "rotate-45",
          )}
          strokeWidth={2.25}
        />
        {hasActiveTool ? (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background" />
        ) : null}
      </button>

      {mounted &&
        open &&
        coords &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" aria-hidden />

            <div
              ref={panelRef}
              role="menu"
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
                opacity: visible ? 1 : 0,
                transform: visible
                  ? "translateY(0)"
                  : coords.resolvedPlacement === "bottom"
                    ? "translateY(-6px)"
                    : "translateY(6px)",
              }}
              className="glass-surface fixed z-[9999] overflow-hidden rounded-2xl transition-[opacity,transform] duration-150 ease-out"
            >
              <div className="relative border-b border-border/40 px-4 py-3.5">
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/8 via-violet-500/6 to-sky-500/8"
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold tracking-tight">Add context</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      Pick a tool to enrich your question
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Close tools menu"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid gap-2 p-3">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      role="menuitem"
                      disabled={tool.disabled}
                      onClick={() => handleSelect(tool)}
                      className={cn(
                        "group/tool shimmer hover-lift flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                        tool.active
                          ? "border-primary/30 bg-primary/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                          : "border-border/40 bg-transparent hover:border-primary/25 hover:bg-[var(--workspace-tab-inactive-bg-hover)]",
                        tool.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm ring-1 ring-white/10",
                          tool.iconGradient,
                        )}
                      >
                        <Icon className="h-[18px] w-[18px] text-white drop-shadow-sm" />
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold tracking-tight">{tool.label}</span>
                          {tool.badge ? (
                            <span className="rounded-full bg-gradient-to-r from-sky-500/15 to-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                              {tool.badge}
                            </span>
                          ) : null}
                          {tool.active ? (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                              Active
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                          {tool.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
