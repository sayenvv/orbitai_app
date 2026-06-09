"use client";

import { FilePlus, FolderPlus } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type FileTreeContextMenuState = {
  x: number;
  y: number;
  parentId: string | null;
};

type IdeFileTreeContextMenuProps = {
  menu: FileTreeContextMenuState | null;
  onClose: () => void;
  onCreateFile: (parentId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
};

export function IdeFileTreeContextMenu({
  menu,
  onClose,
  onCreateFile,
  onCreateFolder,
}: IdeFileTreeContextMenuProps) {
  useEffect(() => {
    if (!menu) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menu, onClose]);

  if (!menu) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 cursor-default bg-transparent"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="ide-file-tree-menu glass-surface fixed z-[60] min-w-[11rem] overflow-hidden rounded-lg py-1 shadow-lg"
        style={{ left: menu.x, top: menu.y }}
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-foreground/90",
            "transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)]",
          )}
          onClick={() => {
            onCreateFile(menu.parentId);
            onClose();
          }}
        >
          <FilePlus className="h-3.5 w-3.5 shrink-0 opacity-80" />
          New File
        </button>
        <button
          type="button"
          role="menuitem"
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-foreground/90",
            "transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)]",
          )}
          onClick={() => {
            onCreateFolder(menu.parentId);
            onClose();
          }}
        >
          <FolderPlus className="h-3.5 w-3.5 shrink-0 opacity-80" />
          New Folder
        </button>
      </div>
    </>
  );
}
