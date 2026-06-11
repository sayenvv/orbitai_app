"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Clock3, FolderPlus } from "lucide-react";
import {
  formatRecentCodeProjectTime,
  type RecentCodeProject,
} from "@/lib/code-workspace-recent-projects";
import { cn } from "@/lib/utils";

type MenuPosition = {
  top: number;
  left: number;
};

type IdeProjectMenuProps = {
  projectTitle: string;
  projectId?: string | null;
  recentProjects: RecentCodeProject[];
  loadingRecents?: boolean;
  onNewProject: () => void;
  onOpenRecent: (project: RecentCodeProject) => void;
  onRefreshRecents?: () => void;
};

const menuItemClass = cn(
  "mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors duration-150",
  "hover:bg-[var(--workspace-tab-inactive-bg-hover)]",
  "focus-visible:bg-[var(--workspace-tab-inactive-bg-hover)] focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-40",
);

export function IdeProjectMenu({
  projectTitle,
  projectId,
  recentProjects,
  loadingRecents = false,
  onNewProject,
  onOpenRecent,
  onRefreshRecents,
}: IdeProjectMenuProps) {
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
    const menuWidth = menuRef.current?.offsetWidth ?? 260;
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

    onRefreshRecents?.();
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
  }, [onRefreshRecents, open, updatePosition]);

  const dropdown =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            className="ide-file-menu-dropdown glass-surface fixed z-[1200] min-w-[16rem] max-w-[18rem] overflow-hidden rounded-xl py-1.5"
            style={{ top: position.top, left: position.left }}
            role="menu"
            aria-label="Project menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onNewProject();
                setOpen(false);
              }}
              className={menuItemClass}
            >
              <FolderPlus className="h-3.5 w-3.5 shrink-0 opacity-70" />
              New project…
            </button>

            <div
              className="mx-2.5 my-1 h-px bg-[color:var(--workspace-tab-border)]"
              role="separator"
            />

            <div className="px-3 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Recents
              </p>
            </div>

            {loadingRecents ? (
              <p className="px-3 py-2 text-[12px] text-muted-foreground/70">Loading…</p>
            ) : recentProjects.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-muted-foreground/70">
                No recent projects yet.
              </p>
            ) : (
              recentProjects.map((project) => {
                const active = project.id === projectId;
                return (
                  <button
                    key={project.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onOpenRecent(project);
                      setOpen(false);
                    }}
                    className={cn(
                      menuItemClass,
                      active && "bg-[var(--workspace-tab-inactive-bg-hover)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-foreground/90">{project.title}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-normal text-muted-foreground/70">
                        <Clock3 className="h-3 w-3 shrink-0" />
                        {formatRecentCodeProjectTime(project.openedAt)}
                      </span>
                    </span>
                    {active ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                    ) : null}
                  </button>
                );
              })
            )}
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
          "ide-file-menu-trigger inline-flex h-8 max-w-[11rem] items-center gap-1 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150 md:max-w-[14rem]",
          open
            ? "ide-file-menu-trigger-active text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{projectTitle}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </button>
      {dropdown}
    </>
  );
}
