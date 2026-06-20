"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type WorkspaceMenuLeafItem = {
  type?: "item";
  label: string;
  disabled?: boolean;
  checked?: boolean;
  onClick?: () => void;
};

export type WorkspaceMenuItem =
  | WorkspaceMenuLeafItem
  | { type: "divider" }
  | { type: "submenu"; label: string; items: WorkspaceMenuLeafItem[] };

export type WorkspaceMenuDefinition = {
  label: string;
  items: WorkspaceMenuItem[];
};

type MenuPosition = {
  top: number;
  left: number;
};

const menuItemClass = cn(
  "mx-1 flex w-[calc(100%-0.5rem)] items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-foreground/88",
  "transition-colors duration-150",
  "hover:bg-[var(--workspace-tab-inactive-bg-hover)]",
  "focus-visible:bg-[var(--workspace-tab-inactive-bg-hover)] focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-40",
);

function MenuDivider() {
  return (
    <div
      className="mx-2.5 my-1 h-px bg-[color:var(--workspace-tab-border)]"
      role="separator"
    />
  );
}

function WorkspaceSubmenu({
  label,
  items,
  onSelect,
}: {
  label: string;
  items: WorkspaceMenuLeafItem[];
  onSelect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 140);
  }, [clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth ?? 200;
    const viewportPadding = 8;
    let left = rect.right - 6;
    const top = rect.top - 4;

    if (left + menuWidth > window.innerWidth - viewportPadding) {
      left = Math.max(viewportPadding, rect.left - menuWidth + 6);
    }

    setPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = window.requestAnimationFrame(() => updatePosition());
    return () => window.cancelAnimationFrame(raf);
  }, [open, updatePosition]);

  return (
    <div className="relative" onMouseEnter={clearCloseTimer} onMouseLeave={scheduleClose}>
      <button
        ref={triggerRef}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        className={menuItemClass}
        onMouseEnter={() => {
          clearCloseTimer();
          setOpen(true);
        }}
        onClick={() => {
          clearCloseTimer();
          setOpen((current) => !current);
        }}
      >
        <span>{label}</span>
        <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              data-workspace-menu-surface=""
              className="ide-file-menu-dropdown glass-surface fixed z-[1210] min-w-[11.5rem] overflow-hidden rounded-xl py-1.5 pl-2"
              style={{ top: position.top, left: position.left }}
              role="menu"
              aria-label={`${label} submenu`}
              onMouseEnter={clearCloseTimer}
              onMouseLeave={scheduleClose}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick?.();
                    onSelect();
                    setOpen(false);
                  }}
                  className={menuItemClass}
                >
                  <span>{item.label}</span>
                  {item.checked ? (
                    <Check className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function WorkspaceMenuDropdown({
  label,
  items,
  open,
  onOpenChange,
}: {
  label: string;
  items: WorkspaceMenuItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth ?? 200;
    const viewportPadding = 8;
    let left = rect.left;
    const top = rect.bottom + 4;

    if (left + menuWidth > window.innerWidth - viewportPadding) {
      left = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
    }

    setPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();
    const raf = window.requestAnimationFrame(() => updatePosition());

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-workspace-menu-surface]")) return;
      onOpenChange(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    const handleLayout = () => updatePosition();

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleLayout);
    window.addEventListener("scroll", handleLayout, true);

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleLayout);
      window.removeEventListener("scroll", handleLayout, true);
    };
  }, [onOpenChange, open, updatePosition]);

  const dropdown =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            data-workspace-menu-surface=""
            className="ide-file-menu-dropdown glass-surface fixed z-[1200] min-w-[11.5rem] overflow-hidden rounded-xl py-1.5"
            style={{ top: position.top, left: position.left }}
            role="menu"
            aria-label={`${label} menu`}
          >
            {items.map((item, index) => {
              if (item.type === "divider") {
                return <MenuDivider key={`divider-${index}`} />;
              }

              if (item.type === "submenu") {
                return (
                  <WorkspaceSubmenu
                    key={item.label}
                    label={item.label}
                    items={item.items}
                    onSelect={() => onOpenChange(false)}
                  />
                );
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick?.();
                    onOpenChange(false);
                  }}
                  className={menuItemClass}
                >
                  <span>{item.label}</span>
                  {item.checked ? (
                    <Check className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "ide-file-menu-trigger inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150",
          open
            ? "ide-file-menu-trigger-active text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        {label}
      </button>
      {dropdown}
    </>
  );
}

export function WorkspaceMenuBar({
  menus,
  className,
}: {
  menus: WorkspaceMenuDefinition[];
  className?: string;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <nav
      className={cn("flex min-w-0 shrink-0 items-center gap-0.5", className)}
      aria-label="Workspace menu"
    >
      {menus.map((menu) => (
        <WorkspaceMenuDropdown
          key={menu.label}
          label={menu.label}
          items={menu.items}
          open={openMenu === menu.label}
          onOpenChange={(next) => setOpenMenu(next ? menu.label : null)}
        />
      ))}
    </nav>
  );
}
