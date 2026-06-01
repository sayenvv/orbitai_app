"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Highlighter,
  MessageCircleQuestion,
  MousePointer2,
  NotebookPen,
  PanelRight,
  PanelRightClose,
  Pencil,
  StickyNote,
  TextSearch,
  type LucideIcon,
} from "lucide-react";

export type ResearchCompanionAppProps = {
  sourceId?: string | null;
  sourceName?: string | null;
  insightId?: string | null;
  pageCount?: number;
  initialTab?: WorkspaceTab;
  onOpenDifferentFile?: () => void;
  onOpenFile?: () => void;
  renderDocumentView?: (props: {
    sourceId: string;
    documentTitle: string;
    activePage: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    renderToolsPanel: () => ReactNode;
  }) => ReactNode;
  renderPageThumbnail?: (page: number, active: boolean) => ReactNode;
  renderAssistPanel?: (props: {
    panel: "chat" | "summary" | "flashcards" | "note";
    sourceId?: string | null;
    activePage: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    onClose: () => void;
  }) => ReactNode;
};

type WorkspaceTab = "overview" | "workspace";
type WorkspaceTool = "select" | "pencil" | "highlight" | "note" | "comment";
type LeftPanelTab = "file" | "insights";
type InsightTab = "keywords" | "concepts" | "summary" | "evidence" | "questions" | "notes";
type AssistPanel = "chat" | "summary" | "flashcards" | "note";

const workflowSteps = [
  "Review generated insights",
  "Build evidence notes",
  "Create study questions",
  "Prepare source-aware chat",
] as const;

const tools: Array<{ id: WorkspaceTool; label: string; shortcut: string; icon: LucideIcon }> = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { id: "pencil", label: "Pencil", shortcut: "P", icon: Pencil },
  { id: "highlight", label: "Highlight", shortcut: "H", icon: Highlighter },
  { id: "note", label: "Note", shortcut: "N", icon: StickyNote },
  { id: "comment", label: "Comment", shortcut: "C", icon: MessageCircleQuestion },
];

const insightTabs: Array<{
  id: InsightTab;
  label: string;
  description: string;
  count: number;
}> = [
  {
    id: "keywords",
    label: "Keyword cloud",
    description: "Important terms and repeated topics",
    count: 18,
  },
  {
    id: "concepts",
    label: "Concept summary",
    description: "Main concepts grouped by theme",
    count: 7,
  },
  {
    id: "summary",
    label: "Insights summary",
    description: "Priority takeaways from the source",
    count: 8,
  },
  {
    id: "evidence",
    label: "Evidence map",
    description: "Claims, methods, and citations",
    count: 12,
  },
  {
    id: "questions",
    label: "Study Q&A",
    description: "Review prompts and answers",
    count: 6,
  },
  {
    id: "notes",
    label: "Important notes",
    description: "Your highlights and pencil marks",
    count: 4,
  },
];

const rightToolbarItems: Array<{
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
}> = [
  { id: "chat", icon: MessageCircleQuestion, label: "Ask", description: "Ask about selection" },
  { id: "summary", icon: TextSearch, label: "Summary", description: "Summarize current view" },
  { id: "flashcards", icon: NotebookPen, label: "Flashcards", description: "Create revision cards" },
  { id: "export", icon: Download, label: "Export", description: "Export notes" },
];

const RIGHT_SIDEBAR_COLLAPSED_WIDTH = 72;
const RIGHT_SIDEBAR_DEFAULT_WIDTH = 288;
const RIGHT_SIDEBAR_MIN_WIDTH = 240;
const RIGHT_SIDEBAR_MAX_WIDTH = 480;
const RIGHT_SIDEBAR_WIDTH_STORAGE_KEY = "rc-right-sidebar-width";

function readStoredSidebarWidth(): number {
  if (typeof window === "undefined") return RIGHT_SIDEBAR_DEFAULT_WIDTH;
  const raw = localStorage.getItem(RIGHT_SIDEBAR_WIDTH_STORAGE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(parsed)) return RIGHT_SIDEBAR_DEFAULT_WIDTH;
  return Math.min(RIGHT_SIDEBAR_MAX_WIDTH, Math.max(RIGHT_SIDEBAR_MIN_WIDTH, parsed));
}

function writeStoredSidebarWidth(width: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RIGHT_SIDEBAR_WIDTH_STORAGE_KEY, String(width));
}

function SidebarResizeHandle({
  onDrag,
  onDragEnd,
}: {
  onDrag: (deltaX: number) => void;
  onDragEnd: () => void;
}) {
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(true);
      let lastX = event.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = lastX - moveEvent.clientX;
        lastX = moveEvent.clientX;
        if (delta !== 0) onDrag(delta);
      };

      const handleMouseUp = () => {
        setDragging(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        onDragEnd();
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onDrag, onDragEnd],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute inset-y-0 left-0 z-20 w-2 -translate-x-1/2 cursor-col-resize touch-none",
        dragging ? "bg-primary/15" : "hover:bg-primary/10",
      )}
    >
      <span
        className={cn(
          "absolute left-1/2 top-1/2 h-10 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border/70 transition-colors",
          dragging && "bg-primary/60",
        )}
      />
    </div>
  );
}

function ResearchCompanionWorkspaceShell({
  chrome,
  children,
  toolsPanel,
}: {
  chrome: ReactNode;
  children: ReactNode;
  toolsPanel: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {chrome}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
        {toolsPanel}
      </div>
    </div>
  );
}

function WorkspaceSidebarExpandButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-0 top-1/2 z-20 hidden h-16 w-5 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-border/30 bg-white text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground lg:inline-flex dark:bg-background"
      aria-label="Show file sidebar"
      title="Show file sidebar"
    >
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  );
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function WorkspaceTooltip({
  label,
  hint,
  enabled = true,
  children,
}: {
  label: string;
  hint?: string;
  enabled?: boolean;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const showTooltip = useCallback(() => {
    if (!enabled) return;
    const node = triggerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setPosition({
      top: rect.top + rect.height / 2,
      left: rect.left - 10,
    });
  }, [enabled]);

  const hideTooltip = useCallback(() => {
    setPosition(null);
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        className="relative w-full"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {enabled &&
        position &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: position.top, left: position.left }}
            className="pointer-events-none fixed z-[200] max-w-[14rem] -translate-x-full -translate-y-1/2 rounded-xl border border-border/30 bg-popover px-2.5 py-1.5 text-popover-foreground backdrop-blur-sm"
          >
            <span className="block text-xs font-semibold text-foreground">{label}</span>
            {hint ? (
              <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{hint}</span>
            ) : null}
          </div>,
          document.body,
        )}
    </>
  );
}

function ToolbarNewMenu({
  onNewWorkspace,
  onNewFile,
}: {
  onNewWorkspace: () => void;
  onNewFile?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 6,
      left: rect.left,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuPanelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const handleReposition = () => updateMenuPosition();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updateMenuPosition]);

  const items = [
    { id: "workspace", label: "Workspace", hint: "Create a study workspace", onClick: onNewWorkspace },
    { id: "file", label: "File", hint: "Upload or open a document", onClick: onNewFile, disabled: !onNewFile },
  ] as const;

  return (
    <div className="relative z-[120]">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors",
          open ? "bg-muted/70 text-foreground" : "text-foreground hover:bg-muted/60",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        New
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open &&
        menuPosition &&
        createPortal(
          <div
            ref={menuPanelRef}
            role="menu"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            className="fixed z-[120] min-w-[11rem] overflow-hidden rounded-xl border border-border/30 bg-white p-1 shadow-lg dark:bg-background"
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-xs font-semibold text-foreground">{item.label}</span>
                <span className="mt-0.5 text-[10px] text-muted-foreground">{item.hint}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function ResearchCompanionApp({
  sourceId,
  sourceName,
  insightId,
  pageCount,
  initialTab = "overview",
  onOpenDifferentFile,
  onOpenFile,
  renderDocumentView,
  renderPageThumbnail,
  renderAssistPanel,
}: ResearchCompanionAppProps) {
  const documentTitle = sourceName?.trim() || "Selected document";
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [activeTool, setActiveTool] = useState<WorkspaceTool>("pencil");
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>("file");
  const [activePage, setActivePage] = useState(1);
  const [activeInsightTab, setActiveInsightTab] = useState<InsightTab>("summary");
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightToolbarExpanded, setRightToolbarExpanded] = useState(false);
  const [activeAssistPanel, setActiveAssistPanel] = useState<AssistPanel | null>(null);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(RIGHT_SIDEBAR_DEFAULT_WIDTH);

  useEffect(() => {
    setRightSidebarWidth(readStoredSidebarWidth());
  }, []);

  const handleRightSidebarResize = useCallback((deltaX: number) => {
    setRightSidebarWidth((current) =>
      Math.min(RIGHT_SIDEBAR_MAX_WIDTH, Math.max(RIGHT_SIDEBAR_MIN_WIDTH, current + deltaX)),
    );
  }, []);

  const handleRightSidebarResizeEnd = useCallback(() => {
    setRightSidebarWidth((current) => {
      writeStoredSidebarWidth(current);
      return current;
    });
  }, []);

  const sourcePages = useMemo(() => {
    if (!pageCount || pageCount <= 0) return [];
    return Array.from({ length: pageCount }, (_, index) => ({
      page: index + 1,
      label: `Page ${index + 1}`,
    }));
  }, [pageCount]);

  const hasDocumentViewer = Boolean(sourceId && renderDocumentView);

  const workspaceGridColumns = useMemo(() => {
    if (leftSidebarCollapsed) {
      return "lg:[grid-template-columns:minmax(0,1fr)]";
    }
    return "lg:[grid-template-columns:17rem_minmax(0,1fr)]";
  }, [leftSidebarCollapsed]);

  const openAssistPanel = (panel: AssistPanel) => {
    setActiveAssistPanel((current) => {
      if (current === panel) return null;
      return panel;
    });
    setRightToolbarExpanded(true);
    if (panel === "note") {
      setActiveTool("note");
    }
  };

  const openMarkupTool = (toolId: WorkspaceTool) => {
    setActiveTool(toolId);
    if (toolId === "note" && renderAssistPanel) {
      openAssistPanel("note");
    }
  };

  const closeAssistPanel = () => {
    setActiveAssistPanel(null);
  };

  const toggleRightToolbar = useCallback(() => {
    setRightToolbarExpanded((current) => {
      if (current) {
        setActiveAssistPanel(null);
      }
      return !current;
    });
  }, []);

  const renderWorkspaceToolsPanel = () => (
    <div
      className="relative hidden min-h-0 shrink-0 lg:flex"
      style={{
        width: rightToolbarExpanded ? rightSidebarWidth : RIGHT_SIDEBAR_COLLAPSED_WIDTH,
      }}
    >
      {rightToolbarExpanded && (
        <SidebarResizeHandle onDrag={handleRightSidebarResize} onDragEnd={handleRightSidebarResizeEnd} />
      )}
      <aside className="flex min-h-0 w-full flex-col overflow-hidden bg-white dark:bg-background">
        <div
          className={cn(
            "shrink-0 border-b border-border/30",
            rightToolbarExpanded ? "px-3 py-2.5" : "px-2 py-2",
          )}
        >
          {rightToolbarExpanded ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">Tools</p>
              <button
                type="button"
                onClick={toggleRightToolbar}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                aria-label="Collapse tools"
                title="Collapse tools"
              >
                <PanelRightClose className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={toggleRightToolbar}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                aria-label="Expand tools"
                title="Expand tools"
              >
                <PanelRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      {rightToolbarExpanded && activeAssistPanel && renderAssistPanel ? (
        renderAssistPanel({
          panel: activeAssistPanel,
          sourceId,
          activePage,
          pageCount: sourcePages.length || 1,
          onPageChange: setActivePage,
          onClose: closeAssistPanel,
        })
      ) : (
        <>
      <div className={cn("min-h-0 flex-1 overflow-y-auto", rightToolbarExpanded ? "p-3" : "p-2")}>
        <section className="space-y-2">
          {rightToolbarExpanded && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Markup
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Select, annotate, and capture notes from the current page.
              </p>
            </div>
          )}

          <div className="grid gap-1.5">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const active =
                activeTool === tool.id ||
                (tool.id === "note" && activeAssistPanel === "note");
              return (
                <WorkspaceTooltip
                  key={tool.id}
                  label={tool.label}
                  hint={`Shortcut ${tool.shortcut}`}
                  enabled={!rightToolbarExpanded}
                >
                  <button
                    type="button"
                    onClick={() => openMarkupTool(tool.id)}
                    className={cn(
                      "flex w-full items-center rounded-xl border text-left transition-all duration-200",
                      rightToolbarExpanded ? "gap-3 px-3 py-2.5" : "justify-center p-2.5",
                      active
                        ? "border-primary/25 bg-primary/10 text-primary ring-2 ring-primary/10"
                        : "border-border/30 bg-background/55 text-foreground hover:bg-background",
                    )}
                    aria-label={tool.label}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {rightToolbarExpanded && (
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-foreground">{tool.label}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          Shortcut {tool.shortcut}
                        </span>
                      </span>
                    )}
                  </button>
                </WorkspaceTooltip>
              );
            })}
          </div>
        </section>

        <section className="mt-5 space-y-2 pt-4">
          {rightToolbarExpanded && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              AI assist
            </p>
          )}
          {rightToolbarItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const isAssistAction = item.id === "chat" || item.id === "summary" || item.id === "flashcards";
            const assistPanel = isAssistAction ? (item.id as AssistPanel) : null;
            const active = assistPanel !== null && activeAssistPanel === assistPanel;
            return (
              <WorkspaceTooltip
                key={item.id}
                label={item.label}
                hint={item.description}
                enabled={!rightToolbarExpanded}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (assistPanel && renderAssistPanel) {
                      openAssistPanel(assistPanel);
                    }
                  }}
                  disabled={assistPanel !== null && !renderAssistPanel}
                  className={cn(
                    "flex w-full items-center rounded-xl border text-left transition-all duration-200",
                    rightToolbarExpanded ? "gap-3 px-3 py-2.5" : "justify-center p-2.5",
                    active
                      ? "border-primary/25 bg-primary/10 text-primary ring-2 ring-primary/10"
                      : "border-border/30 bg-background/55 text-foreground hover:bg-background",
                  )}
                  aria-label={item.label}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  {rightToolbarExpanded && (
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-foreground">{item.label}</span>
                      <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  )}
                </button>
              </WorkspaceTooltip>
            );
          })}
        </section>
      </div>

      <div className={cn(rightToolbarExpanded ? "p-3" : "p-2")}>
        <div className={cn("grid gap-2", rightToolbarExpanded ? "grid-cols-2" : "grid-cols-1")}>
          <WorkspaceTooltip label="Export" hint="Export workspace" enabled={!rightToolbarExpanded}>
            <button
              type="button"
              className={cn(
                "inline-flex h-10 w-full items-center justify-center rounded-xl border border-border/30 bg-background/70 text-xs font-semibold text-foreground transition-all duration-200 hover:bg-muted/50",
                rightToolbarExpanded && "gap-2",
              )}
              aria-label="Export workspace"
            >
              <Download className="h-4 w-4" />
              {rightToolbarExpanded && <span>Export</span>}
            </button>
          </WorkspaceTooltip>
          <WorkspaceTooltip label="Save notes" hint="Save your annotations" enabled={!rightToolbarExpanded}>
            <button
              type="button"
              className={cn(
                "inline-flex h-10 w-full items-center justify-center rounded-xl border border-primary/20 bg-primary text-xs font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90",
                rightToolbarExpanded && "gap-2",
              )}
              aria-label="Save notes"
            >
              <NotebookPen className="h-4 w-4" />
              {rightToolbarExpanded && <span>Save</span>}
            </button>
          </WorkspaceTooltip>
        </div>
      </div>
        </>
      )}
      </aside>
    </div>
  );

  const createWorkspace = () => {
    setActiveTab("workspace");
  };

  const activeInsight = insightTabs.find((tab) => tab.id === activeInsightTab) ?? insightTabs[0];

  const renderInsightWorkspace = () => (
    <ResearchCompanionWorkspaceShell
      chrome={
        <div className="rc-viewer-chrome w-full shrink-0 bg-white px-4 py-2 backdrop-blur-xl dark:bg-background md:px-5">
          <div className="flex w-full items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <TextSearch className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {activeInsight.label}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {activeInsight.description}
                </p>
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                Autosaved
              </span>
            </div>
          </div>
        </div>
      }
      toolsPanel={renderWorkspaceToolsPanel()}
    >
      <div className="rc-pdf-stage h-full w-full overflow-auto p-6 md:p-10">
        <div className="mx-auto grid min-h-full w-full max-w-6xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex min-h-0 flex-col rounded-sm bg-white p-5 shadow-sm ring-1 ring-border/20 dark:bg-background md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {activeInsight.label}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">
              {activeInsightTab === "keywords" && "Keyword cloud"}
              {activeInsightTab === "concepts" && "Concept summary"}
              {activeInsightTab === "summary" && "Priority findings"}
              {activeInsightTab === "evidence" && "Evidence and source map"}
              {activeInsightTab === "questions" && "Study questions"}
              {activeInsightTab === "notes" && "Marked notes"}
            </h2>
            {activeInsightTab === "keywords" ? (
              <div className="mt-6 flex flex-1 flex-wrap content-start gap-2">
                {["learning", "evidence", "method", "analysis", "citation", "summary", "concept", "review"].map(
                  (word, index) => (
                    <span
                      key={word}
                      className={cn(
                        "rounded-full bg-primary/10 px-3 py-1.5 font-semibold text-primary",
                        index < 3 ? "text-sm" : "text-xs",
                      )}
                    >
                      {word}
                    </span>
                  ),
                )}
              </div>
            ) : (
              <div className="mt-6 flex-1 space-y-3">
                <div className="h-3 w-11/12 rounded-full bg-muted" />
                <div className="h-3 w-full rounded-full bg-muted" />
                <div className="h-3 w-4/5 rounded-full bg-muted" />
                <div className="rounded-2xl bg-yellow-400/18 p-4 ring-1 ring-yellow-400/25">
                  <p className="text-sm font-medium text-foreground">
                    Highlighted passage for key findings and methodology notes.
                  </p>
                </div>
                <div className="h-3 w-full rounded-full bg-muted" />
                <div className="h-3 w-9/12 rounded-full bg-muted" />
                <div className="h-3 w-full rounded-full bg-muted" />
                <div className="h-3 w-10/12 rounded-full bg-muted" />
              </div>
            )}
          </section>

          <div className="flex min-h-0 flex-col gap-4">
            <section className="flex flex-1 flex-col rounded-sm bg-white p-5 shadow-sm ring-1 ring-border/20 dark:bg-background md:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Context notes
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                Review AI insights while keeping the source document open in the File tab.
              </p>
            </section>
            <section className="flex flex-1 flex-col rounded-sm bg-primary/[0.04] p-5 shadow-sm ring-1 ring-primary/10 md:p-6">
              <p className="text-sm font-semibold text-foreground">Important note</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Capture claims, evidence, and citations here while reviewing the source.
              </p>
            </section>
          </div>
        </div>
      </div>
    </ResearchCompanionWorkspaceShell>
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="relative z-[110] shrink-0 bg-background/90 px-4 py-2.5 backdrop-blur-xl md:px-6">
        <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-border/30 bg-white p-1 dark:bg-background">
          {(["overview", "workspace"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "h-8 rounded-lg px-3 text-xs font-semibold capitalize transition-colors",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}

          <span className="mx-0.5 hidden h-5 w-px shrink-0 bg-border/40 sm:block" aria-hidden="true" />

          <ToolbarNewMenu onNewWorkspace={createWorkspace} onNewFile={onOpenFile} />
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-600 via-emerald-600 to-lime-700 p-6 text-white md:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.32),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_48%)]" />
              <div className="relative grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-end">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
                    Study workspace
                  </p>
                  <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
                    Research Companion
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/86 md:text-base">
                    Continue from your Library insight generation with paper summaries, evidence
                    organization, and study questions grounded in the selected source.
                  </p>
                </div>

                <div className="rounded-3xl bg-white/16 p-4 ring-1 ring-white/20 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                    Current file
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold">{documentTitle}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-semibold uppercase tracking-wide text-white/78">
                    <span className="rounded-xl bg-white/14 px-2 py-2 text-center">Insights</span>
                    <span className="rounded-xl bg-white/14 px-2 py-2 text-center">Q&A</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-[1.75rem] bg-card/75 p-5 shadow-sm backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Source
                </p>
                <h2 className="mt-2 line-clamp-2 text-xl font-semibold tracking-tight">
                  {documentTitle}
                </h2>
                <div className="mt-4 space-y-2 rounded-2xl bg-muted/35 p-4 text-xs text-muted-foreground">
                  {sourceId && <p>Document ID: {sourceId}</p>}
                  {insightId && <p>Insight ID: {insightId}</p>}
                  {!sourceId && !insightId && <p>No Library source was attached.</p>}
                </div>
                <button
                  type="button"
                  onClick={onOpenDifferentFile}
                  disabled={!onOpenDifferentFile}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-border/30 bg-background/60 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Open a different file
                </button>
              </section>

              <section className="rounded-[1.75rem] bg-card/75 p-5 shadow-sm backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Workflow
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {workflowSteps.map((step, index) => (
                    <div key={step} className="rounded-2xl bg-muted/30 p-4">
                      <span className="text-xs font-semibold text-primary">0{index + 1}</span>
                      <p className="mt-1 text-sm font-medium text-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1",
            workspaceGridColumns,
          )}
        >
          {!leftSidebarCollapsed && (
          <aside className="hidden min-h-0 min-w-0 overflow-hidden bg-white lg:flex lg:flex-col dark:bg-background">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
              <div className="shrink-0 flex items-center gap-2">
                <div className="grid flex-1 grid-cols-2 gap-0.5 rounded-lg bg-muted/35 p-0.5">
                {(["file", "insights"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setLeftPanelTab(tab)}
                    className={cn(
                      "h-8 rounded-md border border-transparent text-xs font-semibold capitalize transition-all duration-200",
                      leftPanelTab === tab
                        ? "border-primary/30 bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:border-border/30 hover:bg-background/60 hover:text-foreground",
                    )}
                  >
                    {tab}
                  </button>
                ))}
                </div>
                <button
                  type="button"
                  onClick={() => setLeftSidebarCollapsed(true)}
                  className="h-8 shrink-0 rounded-lg border border-border/30 bg-muted/25 px-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  aria-label="Collapse file sidebar"
                  title="Collapse file sidebar"
                >
                  Hide
                </button>
              </div>

              <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
              {leftPanelTab === "file" ? (
                <>
                  <div className="shrink-0 min-w-0 pb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Source
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold tracking-tight text-foreground">
                      {documentTitle}
                    </p>
                  </div>
                  <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                    {sourcePages.length === 0 ? (
                      <div className="rounded-lg bg-muted/35 px-3 py-8 text-center text-[11px] text-muted-foreground">
                        Loading pages…
                      </div>
                    ) : (
                      sourcePages.map((page) => (
                        <button
                          key={page.page}
                          type="button"
                          onClick={() => {
                            setActivePage(page.page);
                            setLeftPanelTab("file");
                          }}
                          className={cn(
                            "group flex w-full gap-2.5 rounded-xl border p-2 text-left transition-all duration-200",
                            activePage === page.page
                              ? "border-primary/25 bg-background ring-2 ring-primary/15"
                              : "border-border/30 bg-background/55 hover:bg-background",
                          )}
                        >
                          {renderPageThumbnail ? (
                            renderPageThumbnail(page.page, activePage === page.page)
                          ) : (
                            <span className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-background text-[11px] font-semibold text-muted-foreground">
                              {page.page}
                            </span>
                          )}
                          <span className="min-w-0 flex-1 self-center">
                            <span className="text-xs font-semibold text-foreground">
                              Page {page.page}
                            </span>
                            {activePage === page.page && (
                              <span className="mt-0.5 block text-[10px] font-medium text-primary">
                                Active
                              </span>
                            )}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onOpenFile ?? onOpenDifferentFile}
                    className="mt-3 shrink-0 h-9 w-full rounded-lg border border-border/30 bg-background/80 text-xs font-semibold text-foreground transition-all duration-200 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!onOpenFile && !onOpenDifferentFile}
                  >
                    Switch file
                  </button>
                </>
              ) : (
                <>
                  <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    AI insights
                  </p>
                  <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {insightTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveInsightTab(tab.id);
                          setLeftPanelTab("insights");
                        }}
                        className={cn(
                          "w-full rounded-xl border p-3 text-left transition-all duration-200",
                          activeInsightTab === tab.id
                            ? "border-primary/25 bg-background ring-2 ring-primary/10"
                            : "border-border/30 bg-background/55 hover:bg-background",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground">{tab.label}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {tab.count}
                          </span>
                        </span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                          {tab.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              </div>
            </div>
          </aside>
          )}

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            {leftPanelTab === "file" && hasDocumentViewer ? (
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {leftSidebarCollapsed && (
                  <WorkspaceSidebarExpandButton onClick={() => setLeftSidebarCollapsed(false)} />
                )}
                {renderDocumentView!({
                  sourceId: sourceId!,
                  documentTitle,
                  activePage,
                  pageCount: sourcePages.length,
                  onPageChange: setActivePage,
                  renderToolsPanel: renderWorkspaceToolsPanel,
                })}
              </div>
            ) : leftPanelTab === "insights" ? (
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {leftSidebarCollapsed && (
                  <WorkspaceSidebarExpandButton onClick={() => setLeftSidebarCollapsed(false)} />
                )}
                {renderInsightWorkspace()}
              </div>
            ) : (
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {leftSidebarCollapsed && (
                  <WorkspaceSidebarExpandButton onClick={() => setLeftSidebarCollapsed(false)} />
                )}
                <div className="flex h-full items-center justify-center p-6">
                  <div className="max-w-md rounded-[2rem] bg-card/90 p-6 text-center backdrop-blur-md">
                    <p className="text-sm font-semibold text-foreground">No source file attached</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Open a PDF from your Library to view the document here.
                    </p>
                    {onOpenDifferentFile && (
                      <button
                        type="button"
                        onClick={onOpenDifferentFile}
                        className="mt-4 inline-flex h-10 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Open from Library
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
