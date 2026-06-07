"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  FileCode2,
  GitBranch,
  X,
} from "lucide-react";
import { CodeEditor } from "@/components/code/code-editor";
import { IdeBottomConsole } from "@/components/code/ide-bottom-console";
import {
  IDE_SIDEBAR_ICON_RAIL_WIDTH_PX,
  IdeCollapsibleSidebar,
} from "@/components/code/ide-collapsible-sidebar";
import {
  IdeLeftSidebar,
  LEFT_SIDEBAR_TABS,
  type LeftSidebarTab,
} from "@/components/code/ide-left-sidebar";
import { IdeResizableBottomPanel } from "@/components/code/ide-resizable-bottom-panel";
import { IdeResizablePanel } from "@/components/code/ide-resizable-panel";
import {
  IdeRightSidebar,
  RIGHT_SIDEBAR_TABS,
  type RightSidebarTab,
} from "@/components/code/ide-right-sidebar";
import { IdeStatusBar } from "@/components/code/ide-status-bar";
import {
  CODE_PROJECT_NAME,
  CODE_PROJECT_TREE,
  CODE_WORKSPACE_FILES,
  DEFAULT_OPEN_FILES,
  breadcrumbSegments,
  type CodeTreeNode,
} from "@/lib/code-workspace-demo";
import type { IdeCursorPosition } from "@/lib/ide-cursor";
import { useResizableHeight } from "@/hooks/use-resizable-height";
import { useResizableWidth } from "@/hooks/use-resizable-width";
import { cn } from "@/lib/utils";

function flattenFiles(nodes: CodeTreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.kind === "file" ? [node.path] : flattenFiles(node.children),
  );
}

const ALL_FILE_PATHS = flattenFiles(CODE_PROJECT_TREE);

function buildInitialFileContents(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(CODE_WORKSPACE_FILES).map(([path, file]) => [path, file.content]),
  );
}

function languageLabel(language: string): string {
  if (language === "typescript") return "TypeScript";
  if (language === "json") return "JSON";
  if (language === "markdown") return "Markdown";
  return language;
}

export function CodeWorkspace() {
  const [activePath, setActivePath] = useState<string>(DEFAULT_OPEN_FILES[0]);
  const [openTabs, setOpenTabs] = useState<string[]>([...DEFAULT_OPEN_FILES]);
  const [fileContents, setFileContents] = useState<Record<string, string>>(buildInitialFileContents);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(["src"]));
  const [copied, setCopied] = useState(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState<LeftSidebarTab>("files");
  const [rightSidebarTab, setRightSidebarTab] = useState<RightSidebarTab>("ask");
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [consoleMaximized, setConsoleMaximized] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);
  const [cursor, setCursor] = useState<IdeCursorPosition>({ line: 1, column: 1 });
  const [selectionChars, setSelectionChars] = useState(0);

  const leftPanel = useResizableWidth(240, 180, 480, "left");
  const rightPanel = useResizableWidth(320, 260, 560, "right");
  const leftSidebarWidth = leftSidebarCollapsed
    ? IDE_SIDEBAR_ICON_RAIL_WIDTH_PX
    : leftPanel.width;
  const rightSidebarWidth = rightSidebarCollapsed
    ? IDE_SIDEBAR_ICON_RAIL_WIDTH_PX
    : rightPanel.width;
  const consolePanel = useResizableHeight(180, 120, 420);
  const consoleMaxHeight = 420;

  const activeMeta = CODE_WORKSPACE_FILES[activePath];
  const activeContent = fileContents[activePath] ?? "";
  const lineCount = Math.max(activeContent.split("\n").length, 1);
  const crumbs = useMemo(() => breadcrumbSegments(activePath), [activePath]);
  const activeFileLabel = activePath.split("/").pop();

  const openFile = useCallback((path: string) => {
    setActivePath(path);
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }, []);

  const closeTab = useCallback(
    (path: string) => {
      setOpenTabs((prev) => {
        const next = prev.filter((tab) => tab !== path);
        if (path === activePath && next.length > 0) {
          const closedIndex = prev.indexOf(path);
          const fallback = next[Math.min(closedIndex, next.length - 1)];
          setActivePath(fallback);
        }
        return next.length > 0 ? next : prev;
      });
    },
    [activePath],
  );

  const updateActiveFile = useCallback(
    (content: string) => {
      setFileContents((prev) => ({ ...prev, [activePath]: content }));
    },
    [activePath],
  );

  const toggleFolder = useCallback((folder: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [activeContent]);

  useEffect(() => {
    if (!activeMeta) {
      openFile(DEFAULT_OPEN_FILES[0]);
    }
  }, [activeMeta, openFile]);

  useEffect(() => {
    setCursor({ line: 1, column: 1 });
    setSelectionChars(0);
  }, [activePath]);

  const toggleConsole = useCallback(() => {
    setConsoleOpen((prev) => {
      if (!prev) setConsoleMaximized(false);
      return !prev;
    });
  }, []);

  return (
    <div className="ide-workspace flex h-full min-h-0 flex-1 flex-col overflow-hidden backdrop-blur-xl">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <IdeResizablePanel
          side="left"
          width={leftSidebarWidth}
          onResizeStart={leftPanel.onResizeStart}
          resizable={!leftSidebarCollapsed}
        >
          <IdeCollapsibleSidebar
            side="left"
            tabs={LEFT_SIDEBAR_TABS}
            activeTab={leftSidebarTab}
            onTabChange={setLeftSidebarTab}
            collapsed={leftSidebarCollapsed}
            onCollapsedChange={setLeftSidebarCollapsed}
          >
            <IdeLeftSidebar
              activeTab={leftSidebarTab}
              activePath={activePath}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
              onSelectFile={openFile}
            />
          </IdeCollapsibleSidebar>
        </IdeResizablePanel>

        <section className="ide-editor-panel relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="ide-tab-bar flex shrink-0 items-end justify-between gap-1.5 px-1.5 md:px-2">
            <select
              value={activePath}
              onChange={(e) => openFile(e.target.value)}
              className="glass-input mb-1.5 max-w-[10rem] truncate rounded-lg px-2 py-1.5 text-[13px] md:hidden"
              aria-label="Select file"
            >
              {ALL_FILE_PATHS.map((path) => (
                <option key={path} value={path}>
                  {path}
                </option>
              ))}
            </select>

            <div
              className="ide-tab-strip hidden min-w-0 flex-1 items-end overflow-x-auto [scrollbar-width:thin] md:flex"
              role="tablist"
              aria-label="Open files"
            >
              {openTabs.map((tabPath) => {
                const active = tabPath === activePath;
                const label = tabPath.split("/").pop() ?? tabPath;
                return (
                  <div
                    key={tabPath}
                    role="tab"
                    aria-selected={active}
                    className={cn("ide-tab group", active && "ide-tab-active")}
                  >
                    <button
                      type="button"
                      onClick={() => setActivePath(tabPath)}
                      className="ide-tab-label flex min-w-0 flex-1 items-center gap-1.5"
                    >
                      <FileCode2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{label}</span>
                    </button>
                    {openTabs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => closeTab(tabPath)}
                        className="ide-tab-close"
                        aria-label={`Close ${label}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="ide-tab-actions mb-1 flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="ide-toolbar-btn inline-flex items-center gap-1.5"
              >
                <ClipboardCopy className="h-3 w-3 opacity-70" />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                className="ide-toolbar-btn inline-flex items-center gap-1.5"
              >
                <GitBranch className="h-3 w-3 opacity-70" />
                main
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </div>
          </div>

          <div className="ide-breadcrumb-bar flex shrink-0 items-center gap-1 px-2 py-1 text-muted-foreground">
            {crumbs.map((segment, index) => (
              <span key={`${segment}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
                <span className={index === crumbs.length - 1 ? "text-foreground/80" : undefined}>
                  {segment}
                </span>
              </span>
            ))}
          </div>

          <div className="relative min-h-0 flex-1 overflow-auto [scrollbar-width:thin]">
            {activeMeta ? (
              <CodeEditor
                value={activeContent}
                language={activeMeta.language}
                onChange={updateActiveFile}
                onCursorChange={(nextCursor, nextSelection) => {
                  setCursor(nextCursor);
                  setSelectionChars(nextSelection);
                }}
              />
            ) : null}
          </div>

          {consoleOpen && (
            <IdeResizableBottomPanel
              height={consoleMaximized ? consoleMaxHeight : consolePanel.height}
              onResizeStart={consolePanel.onResizeStart}
            >
              <IdeBottomConsole
                maximized={consoleMaximized}
                onMaximize={() => setConsoleMaximized((prev) => !prev)}
                onClose={() => setConsoleOpen(false)}
              />
            </IdeResizableBottomPanel>
          )}
        </section>

        <IdeResizablePanel
          side="right"
          width={rightSidebarWidth}
          onResizeStart={rightPanel.onResizeStart}
          resizable={!rightSidebarCollapsed}
        >
          <IdeCollapsibleSidebar
            side="right"
            tabs={RIGHT_SIDEBAR_TABS}
            activeTab={rightSidebarTab}
            onTabChange={setRightSidebarTab}
            collapsed={rightSidebarCollapsed}
            onCollapsedChange={setRightSidebarCollapsed}
          >
            <IdeRightSidebar
              activeTab={rightSidebarTab}
              activeFileLabel={activeFileLabel}
            />
          </IdeCollapsibleSidebar>
        </IdeResizablePanel>
      </div>

      <IdeStatusBar
        consoleOpen={consoleOpen}
        onToggleConsole={toggleConsole}
        workspaceName={CODE_PROJECT_NAME}
        language={activeMeta ? languageLabel(activeMeta.language) : undefined}
        lineCount={lineCount}
        cursor={cursor}
        selectionChars={selectionChars}
      />
    </div>
  );
}
