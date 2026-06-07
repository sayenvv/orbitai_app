"use client";

import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  GitBranch,
  ListTree,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CODE_PROJECT_NAME,
  CODE_PROJECT_TREE,
  type CodeTreeNode,
} from "@/lib/code-workspace-demo";
import { cn } from "@/lib/utils";

type LeftSidebarTab = "files" | "branch" | "search" | "outline";

export const LEFT_SIDEBAR_TABS: Array<{ id: LeftSidebarTab; label: string; icon: LucideIcon }> = [
  { id: "files", label: "Files", icon: Folder },
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

function FileTreeNode({
  node,
  depth,
  activePath,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
}: {
  node: CodeTreeNode;
  depth: number;
  activePath: string;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
}) {
  if (node.kind === "file") {
    const active = activePath === node.path;
    return (
      <button
        type="button"
        onClick={() => onSelectFile(node.path)}
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

  const folderPath = node.name;
  const expanded = expandedFolders.has(folderPath);

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggleFolder(folderPath)}
        className="ide-tree-item flex w-full items-center gap-1 px-1.5 py-1 text-left font-medium text-foreground/80 hover:bg-[var(--workspace-tab-inactive-bg-hover)]"
        style={{ paddingLeft: `${depth * 8 + 6}px` }}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <Folder className="h-3 w-3 shrink-0 text-primary/70" />
        <span>{node.name}</span>
      </button>
      {expanded &&
        node.children.map((child) => (
          <FileTreeNode
            key={child.kind === "file" ? child.path : child.name}
            node={child}
            depth={depth + 1}
            activePath={activePath}
            expandedFolders={expandedFolders}
            onToggleFolder={onToggleFolder}
            onSelectFile={onSelectFile}
          />
        ))}
    </div>
  );
}

type IdeLeftSidebarProps = {
  activeTab: LeftSidebarTab;
  activePath: string;
  expandedFolders: Set<string>;
  onToggleFolder: (folder: string) => void;
  onSelectFile: (path: string) => void;
};

export function IdeLeftSidebar({
  activeTab,
  activePath,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
}: IdeLeftSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {activeTab === "files" && (
          <>
            <div className="px-2 py-2">
              <p className="ide-section-label">{CODE_PROJECT_NAME}</p>
            </div>
            <nav className="px-1.5 pb-2">
              {CODE_PROJECT_TREE.map((node) => (
                <FileTreeNode
                  key={node.kind === "file" ? node.path : node.name}
                  node={node}
                  depth={0}
                  activePath={activePath}
                  expandedFolders={expandedFolders}
                  onToggleFolder={onToggleFolder}
                  onSelectFile={onSelectFile}
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

        {activeTab === "search" && (
          <div className="space-y-3 p-3">
            <input
              type="search"
              placeholder="Search in project..."
              className="glass-input w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            />
            <p className="px-1 text-[12px] text-muted-foreground">
              No results. Try searching for <span className="font-mono">AxiomClient</span> or{" "}
              <span className="font-mono">RateLimiter</span>.
            </p>
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
    </div>
  );
}

export type { LeftSidebarTab };
