"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type IdeFileMenuProps = {
  canSave: boolean;
  saving?: boolean;
  onNewFile: () => void;
  onNewFolder: () => void;
  onSave: () => void;
  onSaveAs: () => void;
};

type MenuPosition = {
  top: number;
  left: number;
};

const menuItemClass = cn(
  "mx-1 flex w-[calc(100%-0.5rem)] rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-foreground/88",
  "transition-colors duration-150",
  "hover:bg-[var(--workspace-tab-inactive-bg-hover)]",
  "focus-visible:bg-[var(--workspace-tab-inactive-bg-hover)] focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-40",
);

function MenuItem({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={menuItemClass}
    >
      {label}
    </button>
  );
}

function MenuDivider() {
  return (
    <div
      className="mx-2.5 my-1 h-px bg-[color:var(--workspace-tab-border)]"
      role="separator"
    />
  );
}

export function IdeFileMenu({
  canSave,
  saving = false,
  onNewFile,
  onNewFolder,
  onSave,
  onSaveAs,
}: IdeFileMenuProps) {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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
  }, [open, updatePosition]);

  const dropdown =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            className="ide-file-menu-dropdown glass-surface fixed z-[1200] min-w-[11.5rem] overflow-hidden rounded-xl py-1.5"
            style={{ top: position.top, left: position.left }}
            role="menu"
            aria-label="File menu"
          >
            <MenuItem
              label="New File"
              onClick={() => {
                onNewFile();
                setOpen(false);
              }}
            />
            <MenuItem
              label="New Folder"
              onClick={() => {
                onNewFolder();
                setOpen(false);
              }}
            />
            <MenuDivider />
            <MenuItem
              label={saving ? "Saving…" : "Save"}
              disabled={!canSave || saving}
              onClick={() => {
                onSave();
                setOpen(false);
              }}
            />
            <MenuItem
              label="Save As…"
              disabled={!canSave}
              onClick={() => {
                onSaveAs();
                setOpen(false);
              }}
            />
            <MenuDivider />
            <Link
              href={routes.codeSettings}
              role="menuitem"
              className={menuItemClass}
              onClick={() => setOpen(false)}
            >
              Settings…
            </Link>
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
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        File
      </button>
      {dropdown}
    </>
  );
}
