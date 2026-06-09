"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FilePlus,
  Folder,
  FolderPlus,
  GitBranch,
  ListTree,
  Search,
  Settings,
} from "lucide-react";
import { routes } from "@/lib/routes";
import type { LucideIcon } from "lucide-react";
import {
  IdeFileTreeContextMenu,
  type FileTreeContextMenuState,
} from "@/components/code/ide-file-tree-context-menu";
import {
  IdeProjectSearch,
  type PrepareProjectSearch,
} from "@/components/code/ide-project-search";
import {
  buildTree,
  getCreateParentId,
  isExplorerFocused,
  isRootExplorerFocus,
  nodePath,
} from "@/lib/code-workspace-model";
import type { CodeWorkspaceNode, CodeWorkspaceUiState } from "@/lib/code-workspace-types";
import { cn } from "@/lib/utils";

type LeftSidebarTab = "files" | "branch" | "search" | "outline";

export const LEFT_SIDEBAR_TABS: Array<{ id: LeftSidebarTab; label: string; icon: LucideIcon }> = [
  { id: "files", label: "File", icon: Folder },
  { id: "branch", label: "Branch", icon: GitBranch },
  { id: "search", label: "Search", icon: Search },
  { id: "outline", label: "Outline", icon: ListTree },
];

const BRANCHES = [
  { name: "main", current: true, ahead: 0, behind: 0 },
  { name: "develop", current: false, ahead: 2, behind: 1 },
  { name: "feature/rate-limiter", current: false, ahead: 5, behind: 0 },
];

const OUTLINE_SYMBOLS = [
  { kind: "class", name: "AxiomClient" },
  { kind: "method", name: "constructor" },
  { kind: "method", name: "complete" },
  { kind: "method", name: "embed" },
];

type CreateDraft = {
  type: "file" | "folder";
  parentId: string | null;
};

function InlineCreateRow({
  type,
  depth,
  value,
  hasError,
  onChange,
  onSubmit,
  onCancel,
}: {
  type: CreateDraft["type"];
  depth: number;
  value: string;
  hasError: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div
      className="ide-tree-item ide-tree-create-row flex w-full items-center gap-1.5 px-1.5 py-1"
      style={{ paddingLeft: `${depth * 8 + 6}px` }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {type === "file" ? (
        <FileCode2 className="h-3 w-3 shrink-0 text-primary/80" />
      ) : (
        <Folder className="h-3 w-3 shrink-0 text-primary/70" />
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        placeholder={type === "file" ? "filename.ts" : "folder-name"}
        className={cn(
          "ide-tree-create-input min-w-0 flex-1 font-mono text-[12px] outline-none",
          hasError && "border-destructive",
        )}
        aria-label={type === "file" ? "New file name" : "New folder name"}
      />
    </div>
  );
}

function FileTreeNode({
  item,
  depth,
  nodes,
  ui,
  createDraft,
  createName,
  createError,
  onCreateNameChange,
  onSubmitCreate,
  onCancelCreate,
  onSelectFolder,
  onToggleFolder,
  onSelectFile,
  onContextMenu,
}: {
  item: ReturnType<typeof buildTree>[number];
  depth: number;
  nodes: CodeWorkspaceNode[];
  ui: CodeWorkspaceUiState;
  createDraft: CreateDraft | null;
  createName: string;
  createError: string | null;
  onCreateNameChange: (value: string) => void;
  onSubmitCreate: () => void;
  onCancelCreate: () => void;
  onSelectFolder: (folderId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onSelectFile: (fileId: string) => void;
  onContextMenu: (event: React.MouseEvent, parentId: string | null) => void;
}) {
  const { node, children } = item;

  if (node.kind === "file") {
    const active = isExplorerFocused(node.id, ui.explorerFocusId);
    return (
      <button
        type="button"
        onClick={() => onSelectFile(node.id)}
        onContextMenu={(event) => onContextMenu(event, node.parentId)}
        className={cn(
          "ide-tree-item flex w-full items-center gap-1.5 px-1.5 py-1 text-left",
          active
            ? "ide-tree-item-active"
            : "text-muted-foreground hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground",
        )}
        style={{ paddingLeft: `${depth * 8 + 6}px` }}
      >
        <FileCode2 className="h-3 w-3 shrink-0 text-primary/80" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  const expanded = ui.expandedFolderIds.includes(node.id);
  const selected = isExplorerFocused(node.id, ui.explorerFocusId);
  const showInlineCreate = createDraft?.parentId === node.id;
  const showChildren = expanded || showInlineCreate;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "ide-tree-item flex w-full cursor-pointer items-center gap-0.5 px-1 py-1 text-left",
          selected ? "ide-tree-folder-selected" : "hover:bg-[var(--workspace-tab-inactive-bg-hover)]",
        )}
        style={{ paddingLeft: `${depth * 8 + 2}px` }}
        onClick={() => onSelectFolder(node.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelectFolder(node.id);
          }
        }}
        onContextMenu={(event) => onContextMenu(event, node.id)}
        aria-selected={selected}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFolder(node.id);
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
        >
          {showChildren ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        <span className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 font-medium text-foreground/80">
          <Folder className="h-3 w-3 shrink-0 text-primary/70" />
          <span className="truncate">{node.name}</span>
        </span>
      </div>
      {showChildren && (
        <>
          {children.map((child) => (
            <FileTreeNode
              key={child.node.id}
              item={child}
              depth={depth + 1}
              nodes={nodes}
              ui={ui}
              createDraft={createDraft}
              createName={createName}
              createError={createError}
              onCreateNameChange={onCreateNameChange}
              onSubmitCreate={onSubmitCreate}
              onCancelCreate={onCancelCreate}
              onSelectFolder={onSelectFolder}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
              onContextMenu={onContextMenu}
            />
          ))}
          {showInlineCreate && (
            <InlineCreateRow
              type={createDraft.type}
              depth={depth + 1}
              value={createName}
              hasError={Boolean(createError)}
              onChange={onCreateNameChange}
              onSubmit={onSubmitCreate}
              onCancel={onCancelCreate}
            />
          )}
        </>
      )}
    </div>
  );
}

type IdeLeftSidebarProps = {
  activeTab: LeftSidebarTab;
  projectTitle: string;
  nodes: CodeWorkspaceNode[];
  ui: CodeWorkspaceUiState;
  onSelectFolder: (folderId: string) => void;
  onSelectRoot: () => void;
  onToggleFolder: (folderId: string) => void;
  onSelectFile: (fileId: string) => void;
  onPrepareCreateParent: (parentId: string | null) => void;
  onCreateFile: (parentId: string | null, name: string) => string | null | Promise<string | null>;
  onCreateFolder: (parentId: string | null, name: string) => string | null | Promise<string | null>;
  onPrepareSearch: PrepareProjectSearch;
  onOpenSearchResult: (fileId: string, line: number) => void;
};

export function IdeLeftSidebar({
  activeTab,
  projectTitle,
  nodes,
  ui,
  onSelectFolder,
  onSelectRoot,
  onToggleFolder,
  onSelectFile,
  onPrepareCreateParent,
  onCreateFile,
  onCreateFolder,
  onPrepareSearch,
  onOpenSearchResult,
}: IdeLeftSidebarProps) {
  const [contextMenu, setContextMenu] = useState<FileTreeContextMenuState | null>(null);
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const tree = buildTree(nodes);
  const rootSelected = isRootExplorerFocus(ui.explorerFocusId);
  const createParentId = getCreateParentId(ui.explorerFocusId, nodes);
  const createTargetLabel = createParentId
    ? nodePath(createParentId, nodes)
    : "/ (root)";

  const cancelCreate = useCallback(() => {
    setCreateDraft(null);
    setCreateName("");
    setCreateError(null);
  }, []);

  const startCreate = useCallback(
    (type: CreateDraft["type"], parentId: string | null) => {
      if (parentId === null) {
        onSelectRoot();
      } else {
        onPrepareCreateParent(parentId);
      }
      setCreateDraft({ type, parentId });
      setCreateName("");
      setCreateError(null);
    },
    [onPrepareCreateParent, onSelectRoot],
  );

  const handleContextMenu = useCallback((event: React.MouseEvent, parentId: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, parentId });
  }, []);

  const submitCreate = useCallback(async () => {
    if (!createDraft || creating) return;

    const trimmed = createName.trim();
    if (!trimmed) {
      cancelCreate();
      return;
    }

    setCreating(true);
    try {
      const error =
        createDraft.type === "file"
          ? await onCreateFile(createDraft.parentId, trimmed)
          : await onCreateFolder(createDraft.parentId, trimmed);

      if (error) {
        setCreateError(error);
        return;
      }

      cancelCreate();
    } finally {
      setCreating(false);
    }
  }, [cancelCreate, createDraft, createName, creating, onCreateFile, onCreateFolder]);

  useEffect(() => {
    if (!createDraft) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (document.querySelector(".ide-tree-create-row")?.contains(target)) return;
      if (!createName.trim()) cancelCreate();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [cancelCreate, createDraft, createName]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {activeTab === "search" ? (
        <IdeProjectSearch
          nodes={nodes}
          onPrepareSearch={onPrepareSearch}
          onOpenResult={onOpenSearchResult}
        />
      ) : (
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {activeTab === "files" && (
          <>
            <div className="space-y-1 px-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onSelectRoot}
                  className={cn(
                    "ide-section-label min-w-0 truncate rounded-md px-1.5 py-1 text-left transition-colors",
                    rootSelected
                      ? "ide-tree-folder-selected text-foreground"
                      : "text-muted-foreground hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground",
                  )}
                  title="Select project root"
                  aria-selected={rootSelected}
                >
                  {projectTitle}
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => startCreate("file", createParentId)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground"
                  aria-label="New file"
                  title="New file in selected folder"
                >
                  <FilePlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => startCreate("folder", createParentId)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground"
                  aria-label="New folder"
                  title="New folder in selected folder"
                >
                  <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <Link
                  href={routes.codeSettings}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground"
                  aria-label="Workspace settings"
                  title="Workspace settings"
                >
                  <Settings className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Link>
                </div>
              </div>
              <p className="truncate px-1.5 text-[10px] text-muted-foreground">
                New items in <span className="font-mono text-foreground/75">{createTargetLabel}</span>
              </p>
            </div>

            <nav className="px-1.5 pb-2" onContextMenu={(event) => handleContextMenu(event, null)}>
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "ide-tree-item mb-0.5 flex w-full cursor-pointer items-center gap-1.5 px-1.5 py-1 text-left",
                  rootSelected
                    ? "ide-tree-folder-selected"
                    : "text-muted-foreground hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground",
                )}
                onClick={onSelectRoot}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectRoot();
                  }
                }}
                onContextMenu={(event) => {
                  event.stopPropagation();
                  handleContextMenu(event, null);
                }}
                aria-selected={rootSelected}
                title="Project root — new files and folders are created here when selected"
              >
                <Folder className="h-3 w-3 shrink-0 text-primary/70" />
                <span className="min-w-0 flex-1 truncate font-medium">/</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">root</span>
              </div>

              {createDraft?.parentId === null && (
                <InlineCreateRow
                  type={createDraft.type}
                  depth={1}
                  value={createName}
                  hasError={Boolean(createError)}
                  onChange={(value) => {
                    setCreateName(value);
                    if (createError) setCreateError(null);
                  }}
                  onSubmit={() => void submitCreate()}
                  onCancel={cancelCreate}
                />
              )}

              {tree.map((item) => (
                <FileTreeNode
                  key={item.node.id}
                  item={item}
                  depth={0}
                  nodes={nodes}
                  ui={ui}
                  createDraft={createDraft}
                  createName={createName}
                  createError={createError}
                  onCreateNameChange={(value) => {
                    setCreateName(value);
                    if (createError) setCreateError(null);
                  }}
                  onSubmitCreate={() => void submitCreate()}
                  onCancelCreate={cancelCreate}
                  onSelectFolder={onSelectFolder}
                  onToggleFolder={onToggleFolder}
                  onSelectFile={onSelectFile}
                  onContextMenu={handleContextMenu}
                />
              ))}
            </nav>
          </>
        )}

        {activeTab === "branch" && (
          <div className="space-y-1 p-3">
            <p className="ide-section-label px-1">Branches</p>
            {BRANCHES.map((branch) => (
              <button
                key={branch.name}
                type="button"
                className={cn(
                  "ide-tree-item flex w-full items-center gap-2 px-2 py-2 text-left",
                  branch.current
                    ? "ide-tree-item-active"
                    : "text-muted-foreground hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground",
                )}
              >
                <GitBranch className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate font-medium">{branch.name}</span>
                {!branch.current && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    +{branch.ahead}/-{branch.behind}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {activeTab === "outline" && (
          <div className="space-y-0.5 p-3">
            <p className="ide-section-label mb-2 px-1">client.ts</p>
            {OUTLINE_SYMBOLS.map((symbol) => (
              <button
                key={symbol.name}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground"
                style={{ paddingLeft: symbol.kind === "method" ? "1.25rem" : undefined }}
              >
                <span className="font-mono text-[11px] text-primary/70">{symbol.kind}</span>
                <span>{symbol.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      <IdeFileTreeContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onCreateFile={(parentId) => startCreate("file", parentId)}
        onCreateFolder={(parentId) => startCreate("folder", parentId)}
      />
    </div>
  );
}

export type { LeftSidebarTab };
