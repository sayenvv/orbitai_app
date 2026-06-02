"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  getMissingInsightTypes,
  isGeneratableInsightTab,
  normalizeResearchCompanionInsightTypes,
  type ResearchCompanionGeneratableInsightType,
} from "./insight-types";
import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  FolderOpen,
  Highlighter,
  Home,
  LayoutTemplate,
  Loader2,
  Lock,
  MessageCircleQuestion,
  MousePointer2,
  NotebookPen,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Pencil,
  Sparkles,
  StickyNote,
  TextSearch,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { ResearchCompanionWorkspaceShimmer } from "./research-companion-workspace-shimmer";

const WORKSPACE_PREPARE_DELAY_MS = 750;

export type ResearchCompanionView = "home" | "open" | "workspace";

export type RecentWorkspace = {
  key: string;
  title: string;
  sourceId: string;
  sourceName: string;
  insightId?: string | null;
  openedAt: number;
};

export type ResearchCompanionAppProps = {
  sourceId?: string | null;
  sourceName?: string | null;
  insightId?: string | null;
  pageCount?: number;
  initialTab?: ResearchCompanionView;
  onOpenDifferentFile?: () => void;
  onOpenFile?: () => void;
  onOpenLibrary?: () => void;
  onUploadFile?: () => void;
  onGenerateInsights?: () => void | Promise<void>;
  generatedInsightTypes?: ResearchCompanionGeneratableInsightType[];
  insightsGenerating?: boolean;
  insightsGenerateError?: string | null;
  fileUploading?: boolean;
  fileUploadProgress?: string | null;
  fileUploadError?: string | null;
  onNewWorkspace?: () => void;
  onResetDraftWorkspace?: () => void | Promise<void>;
  workspaceSessionKey?: number | string;
  recentWorkspaces?: RecentWorkspace[];
  onOpenRecentWorkspace?: (workspace: RecentWorkspace) => void;
  formatRecentWorkspaceTime?: (openedAt: number) => string;
  onOpenHelp?: () => void;
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
  initialAssistPanel?: AssistPanel | null;
};

type WorkspaceTool = "select" | "pencil" | "highlight" | "note" | "comment";
type LeftPanelTab = "file" | "insights";

const leftSidebarTabs: Array<{
  id: LeftPanelTab;
  label: string;
  shortLabel: string;
  hint: string;
  icon: LucideIcon;
}> = [
  {
    id: "file",
    label: "File",
    shortLabel: "File",
    hint: "Source document and page thumbnails",
    icon: FileText,
  },
  {
    id: "insights",
    label: "Insights",
    shortLabel: "Insights",
    hint: "AI-generated research insights",
    icon: Sparkles,
  },
];

type InsightTab = "keywords" | "concepts" | "summary" | "evidence" | "questions" | "notes";
type AssistPanel = "chat" | "summary" | "flashcards" | "note";

const workflowSteps = [
  "Attach a source document",
  "Generate AI insights",
  "Review findings and evidence",
  "Annotate, discuss, and export",
] as const;

const tools: Array<{ id: WorkspaceTool; label: string; shortcut: string; icon: LucideIcon }> = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { id: "pencil", label: "Pencil", shortcut: "P", icon: Pencil },
  { id: "highlight", label: "Highlight", shortcut: "H", icon: Highlighter },
  { id: "note", label: "Note", shortcut: "N", icon: StickyNote },
  { id: "comment", label: "Comment", shortcut: "C", icon: MessageCircleQuestion },
];

const NEW_WORKSPACE_TITLE = "New workspace";

function OverviewOptionCard({
  icon: Icon,
  title,
  description,
  badge,
  onClick,
  disabled,
  loading,
  loadingLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card to-card/80 p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary ring-1 ring-primary/10 transition-colors group-hover:bg-primary/[0.12]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            {badge ? (
              <span className="mb-1.5 inline-flex rounded-md bg-muted/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {badge}
              </span>
            ) : null}
            <span className="block text-[15px] font-semibold tracking-tight text-foreground">
              {loading && loadingLabel ? loadingLabel : title}
            </span>
          </span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary/70" />
        </span>
        <span className="mt-1.5 block text-[13px] leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function OverviewPanel({
  label,
  title,
  children,
  className,
}: {
  label: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm",
        className,
      )}
    >
      <div className="border-b border-border/30 px-5 py-4 md:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        {title ? <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{title}</h2> : null}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function SetupProgressPanel({
  sourceName,
  fileUploading,
  fileUploadProgress,
  insightsGenerating,
  error,
  onGenerate,
}: {
  sourceName?: string | null;
  fileUploading?: boolean;
  fileUploadProgress?: string | null;
  insightsGenerating?: boolean;
  error?: string | null;
  onGenerate?: () => void;
}) {
  const documentStep = fileUploading ? "active" : "done";
  const insightStep = error
    ? "error"
    : insightsGenerating
      ? "active"
      : documentStep === "done"
        ? "ready"
        : "pending";
  const workspaceStep = "pending";

  const steps = [
    {
      id: "document",
      label: "Attach document",
      detail: fileUploading
        ? fileUploadProgress || "Uploading…"
        : sourceName?.trim() || "Document ready",
      state: documentStep,
    },
    {
      id: "insights",
      label: "Generate AI insights",
      detail: insightsGenerating
        ? "Analyzing your document…"
        : error
          ? "Insight generation failed"
          : documentStep === "done"
            ? "Choose insight types in the confirmation dialog"
            : "Waiting for document…",
      state: insightStep,
    },
    {
      id: "workspace",
      label: "Open workspace",
      detail: "Opens automatically after insights are ready",
      state: workspaceStep,
    },
  ] as const;

  return (
    <OverviewPanel label="Setup" title="Prepare your workspace">
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-start gap-4 rounded-2xl border px-4 py-4",
              step.state === "active" && "border-primary/30 bg-primary/[0.04]",
              step.state === "done" && "border-border/40 bg-muted/20",
              step.state === "ready" && "border-primary/20 bg-primary/[0.03]",
              step.state === "error" && "border-destructive/30 bg-destructive/[0.04]",
              step.state === "pending" && "border-border/30 bg-background/50 opacity-70",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                step.state === "active" && "bg-primary text-primary-foreground",
                step.state === "done" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
                step.state === "ready" && "bg-primary/10 text-primary",
                step.state === "error" && "bg-destructive/15 text-destructive",
                step.state === "pending" && "bg-muted text-muted-foreground",
              )}
            >
              {step.state === "done" ? "✓" : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{step.label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{step.detail}</span>
            </span>
            {step.state === "active" && (
              <span className="mt-1 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
            )}
          </div>
        ))}
      </div>
      {!fileUploading && !insightsGenerating && onGenerate && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button
            type="button"
            onClick={() => void onGenerate()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            {error ? "Try again" : "Choose insights & generate"}
          </button>
        </div>
      )}
    </OverviewPanel>
  );
}

function WorkspaceStageEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionDisabled,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionDisabled?: boolean;
}) {
  const hasActions = Boolean(
    (actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction),
  );

  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="w-full max-w-md rounded-sm bg-white p-8 text-center shadow-sm ring-1 ring-border/20 dark:bg-background md:p-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="h-5 w-5" />
        </span>
        <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {hasActions && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {actionLabel && onAction && (
              <button
                type="button"
                onClick={onAction}
                disabled={actionDisabled}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {actionLabel}
              </button>
            )}
            {secondaryActionLabel && onSecondaryAction && (
              <button
                type="button"
                onClick={onSecondaryAction}
                disabled={secondaryActionDisabled}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FolderOpen className="h-4 w-4" />
                {secondaryActionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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
    label: "Discussion Q&A",
    description: "Review prompts and guided questions",
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
      <PanelLeft className="h-3.5 w-3.5" strokeWidth={2} />
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

function computeToolbarMenuPosition(
  trigger: HTMLElement,
  panel: HTMLElement | null,
  align: "start" | "end" = "end",
) {
  const rect = trigger.getBoundingClientRect();
  const gap = 6;
  const viewportPadding = 8;
  const menuWidth = panel?.offsetWidth ?? 224;
  const menuHeight = panel?.offsetHeight ?? 200;

  let left = align === "end" ? rect.right - menuWidth : rect.left;
  let top = rect.bottom + gap;

  left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

  if (top + menuHeight > window.innerHeight - viewportPadding) {
    top = Math.max(viewportPadding, rect.top - menuHeight - gap);
  }

  return { top, left };
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
    setMenuPosition(computeToolbarMenuPosition(trigger, menuPanelRef.current, "end"));
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
    const frame = requestAnimationFrame(updateMenuPosition);

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
      cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updateMenuPosition]);

  const items = [
    { id: "workspace", label: "Workspace", hint: "Create a new workspace", onClick: onNewWorkspace, disabled: false },
    { id: "file", label: "File", hint: "Upload or open a document", onClick: onNewFile, disabled: !onNewFile },
  ] as const;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors sm:px-5",
          open ? "bg-muted/20 text-foreground" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground",
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
            className="fixed z-[200] min-w-[11rem] overflow-hidden rounded-xl border border-border/30 bg-popover p-1 text-popover-foreground shadow-lg"
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

function ToolbarRecentMenu({
  workspaces,
  onOpenWorkspace,
  formatOpenedAt,
}: {
  workspaces: RecentWorkspace[];
  onOpenWorkspace?: (workspace: RecentWorkspace) => void;
  formatOpenedAt?: (openedAt: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const formatTime =
    formatOpenedAt ??
    ((openedAt: number) =>
      new Date(openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }));

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setMenuPosition(computeToolbarMenuPosition(trigger, menuPanelRef.current, "end"));
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
    const frame = requestAnimationFrame(updateMenuPosition);

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
      cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updateMenuPosition]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors sm:px-5",
          open ? "bg-muted/20 text-foreground" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Recent
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open &&
        menuPosition &&
        createPortal(
          <div
            ref={menuPanelRef}
            role="menu"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            className="fixed z-[200] min-w-[14rem] max-w-[18rem] overflow-hidden rounded-xl border border-border/30 bg-popover p-1 text-popover-foreground shadow-lg"
          >
            {workspaces.length === 0 ? (
              <div className="px-3 py-3">
                <p className="text-xs font-semibold text-foreground">No recent workspaces</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  Open a file in the workspace to see it here.
                </p>
              </div>
            ) : (
              workspaces.map((workspace) => (
                <button
                  key={workspace.key}
                  type="button"
                  role="menuitem"
                  disabled={!onOpenWorkspace}
                  onClick={() => {
                    onOpenWorkspace?.(workspace);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="truncate text-xs font-semibold text-foreground">{workspace.title}</span>
                  <span className="mt-0.5 text-[10px] text-muted-foreground">
                    Opened {formatTime(workspace.openedAt)}
                  </span>
                </button>
              ))
            )}
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
  initialTab = "home",
  onOpenDifferentFile,
  onOpenFile,
  onOpenLibrary,
  onUploadFile,
  onGenerateInsights,
  generatedInsightTypes,
  insightsGenerating = false,
  insightsGenerateError,
  fileUploading = false,
  fileUploadProgress,
  fileUploadError,
  onNewWorkspace,
  onResetDraftWorkspace,
  workspaceSessionKey = 0,
  recentWorkspaces = [],
  onOpenRecentWorkspace,
  formatRecentWorkspaceTime,
  onOpenHelp,
  renderDocumentView,
  renderPageThumbnail,
  renderAssistPanel,
  initialAssistPanel = null,
}: ResearchCompanionAppProps) {
  const isEmptyWorkspace = !sourceId;
  const workspaceTitle = sourceName?.trim() || (isEmptyWorkspace ? NEW_WORKSPACE_TITLE : "Selected document");
  const hasInsights = Boolean(insightId);
  const isPreparingWorkspace = Boolean(sourceId && !hasInsights);
  const [activeView, setActiveView] = useState<ResearchCompanionView>(
    initialTab === "workspace" || insightId
      ? "workspace"
      : initialTab === "open"
        ? "open"
        : "home",
  );
  const [isPreparingNewWorkspace, setIsPreparingNewWorkspace] = useState(false);
  const [draftSessionActive, setDraftSessionActive] = useState(
    Boolean(sourceId || insightId || initialTab === "workspace"),
  );
  const hasStartedDraftRef = useRef(Boolean(sourceId || insightId || initialTab === "workspace"));
  const [activeTool, setActiveTool] = useState<WorkspaceTool>("pencil");
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>("file");
  const [activePage, setActivePage] = useState(1);
  const [activeInsightTab, setActiveInsightTab] = useState<InsightTab>("summary");
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightToolbarExpanded, setRightToolbarExpanded] = useState(Boolean(initialAssistPanel));
  const [activeAssistPanel, setActiveAssistPanel] = useState<AssistPanel | null>(initialAssistPanel);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(RIGHT_SIDEBAR_DEFAULT_WIDTH);

  useEffect(() => {
    setRightSidebarWidth(readStoredSidebarWidth());
  }, []);

  useEffect(() => {
    if (sourceId || insightId) {
      setDraftSessionActive(true);
      hasStartedDraftRef.current = true;
    }
  }, [sourceId, insightId]);

  useEffect(() => {
    if (insightId) {
      setActiveView("workspace");
    }
  }, [insightId]);

  useEffect(() => {
    if (isPreparingWorkspace && activeView === "workspace") {
      setActiveView("home");
    }
  }, [activeView, isPreparingWorkspace]);

  useEffect(() => {
    if (!initialAssistPanel) return;
    setActiveAssistPanel(initialAssistPanel);
    setRightToolbarExpanded(true);
  }, [initialAssistPanel]);

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

  const activeGeneratedInsightTypes = useMemo(
    () =>
      hasInsights
        ? normalizeResearchCompanionInsightTypes(generatedInsightTypes)
        : [],
    [generatedInsightTypes, hasInsights],
  );
  const missingInsightTypes = useMemo(
    () => getMissingInsightTypes(activeGeneratedInsightTypes),
    [activeGeneratedInsightTypes],
  );

  const isInsightTabAvailable = useCallback(
    (tab: InsightTab) => {
      if (tab === "notes") return hasInsights;
      if (!hasInsights) return false;
      if (!isGeneratableInsightTab(tab)) return true;
      return activeGeneratedInsightTypes.includes(tab);
    },
    [activeGeneratedInsightTypes, hasInsights],
  );

  const visibleInsightTabs = useMemo(
    () =>
      insightTabs.map((tab) => ({
        ...tab,
        available: isEmptyWorkspace ? false : isInsightTabAvailable(tab.id),
        count: isEmptyWorkspace || !isInsightTabAvailable(tab.id) ? 0 : tab.count,
      })),
    [isEmptyWorkspace, isInsightTabAvailable],
  );
  const availableInsightCount = useMemo(
    () => visibleInsightTabs.filter((tab) => tab.available).length,
    [visibleInsightTabs],
  );

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

  const handleNewWorkspace = async () => {
    if (isPreparingNewWorkspace) return;

    const resetDraft = onResetDraftWorkspace ?? onNewWorkspace;

    if (activeView === "workspace" && draftSessionActive && isEmptyWorkspace) {
      return;
    }

    if (draftSessionActive && isEmptyWorkspace && activeView !== "workspace") {
      setActiveView("workspace");
      return;
    }

    const isFirstDraftStart = !hasStartedDraftRef.current;

    if (isFirstDraftStart) {
      setIsPreparingNewWorkspace(true);
    }

    try {
      if (isFirstDraftStart) {
        await Promise.all([
          Promise.resolve(typeof resetDraft === "function" ? resetDraft() : undefined),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, WORKSPACE_PREPARE_DELAY_MS);
          }),
        ]);
        hasStartedDraftRef.current = true;
      } else if (sourceId || insightId) {
        await Promise.resolve(typeof resetDraft === "function" ? resetDraft() : undefined);
      }

      setDraftSessionActive(true);
      resetWorkspacePanels();
      setActiveView("workspace");
    } finally {
      setIsPreparingNewWorkspace(false);
    }
  };

  const resetWorkspacePanels = () => {
    setLeftPanelTab("file");
    setLeftSidebarCollapsed(false);
    setActiveAssistPanel(null);
    setActivePage(1);
    setActiveInsightTab("summary");
  };

  const activeInsight =
    visibleInsightTabs.find((tab) => tab.id === activeInsightTab) ?? visibleInsightTabs[0];

  const renderEmptyFileWorkspace = () => (
    <ResearchCompanionWorkspaceShell
      chrome={
        <div className="rc-viewer-chrome w-full shrink-0 bg-white px-4 py-2 backdrop-blur-xl dark:bg-background md:px-5">
          <div className="flex w-full items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {workspaceTitle}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Upload a file to begin your analysis
                </p>
              </div>
            </div>
          </div>
        </div>
      }
      toolsPanel={renderWorkspaceToolsPanel()}
    >
      <div className="rc-pdf-stage h-full w-full overflow-auto p-6 md:p-10">
        <WorkspaceStageEmptyState
          icon={Upload}
          title="No file uploaded"
          description="Upload a PDF from your device or choose one from your library to open it in this workspace."
          actionLabel="Upload file"
          onAction={uploadFile}
          actionDisabled={!uploadFile || fileUploading}
          secondaryActionLabel="Open from library"
          onSecondaryAction={openLibrary}
          secondaryActionDisabled={!openLibrary}
        />
      </div>
    </ResearchCompanionWorkspaceShell>
  );

  const renderEmptyInsightWorkspace = () => (
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
                  No data found
                </p>
              </div>
            </div>
          </div>
        </div>
      }
      toolsPanel={renderWorkspaceToolsPanel()}
    >
      <div className="rc-pdf-stage h-full w-full overflow-auto p-6 md:p-10">
        <WorkspaceStageEmptyState
          icon={TextSearch}
          title="No data found"
          description="Upload a source file first, then generate AI insights to review them here."
          actionLabel={uploadFile ? "Upload file" : undefined}
          onAction={uploadFile}
          actionDisabled={!uploadFile || fileUploading}
        />
      </div>
    </ResearchCompanionWorkspaceShell>
  );

  const renderUnavailableInsightPanel = () => (
    <ResearchCompanionWorkspaceShell
      chrome={
        <div className="rc-viewer-chrome w-full shrink-0 bg-white px-4 py-2 backdrop-blur-xl dark:bg-background md:px-5">
          <div className="flex w-full items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground ring-1 ring-border/30">
                <Lock className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {activeInsight.label}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  Not generated yet
                </p>
              </div>
            </div>
          </div>
        </div>
      }
      toolsPanel={renderWorkspaceToolsPanel()}
    >
      <div className="rc-pdf-stage h-full w-full overflow-auto p-6 md:p-10">
        <div className="flex min-h-full items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-border/40 bg-card p-8 text-center shadow-sm md:p-10">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground ring-1 ring-border/30">
              <Lock className="h-5 w-5" />
            </span>
            <p className="mt-4 text-base font-semibold text-foreground">{activeInsight.label}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This insight type was not included in your last generation run. Generate it now to
              unlock this view in your workspace.
            </p>
            {onGenerateInsights && (
              <button
                type="button"
                onClick={() => void onGenerateInsights()}
                disabled={insightsGenerating}
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {insightsGenerating ? "Generating…" : "Generate this insight"}
              </button>
            )}
          </div>
        </div>
      </div>
    </ResearchCompanionWorkspaceShell>
  );

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
              {activeInsightTab === "questions" && "Discussion questions"}
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

  const formatRecentTime =
    formatRecentWorkspaceTime ??
    ((openedAt: number) =>
      new Date(openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }));

  const openLibrary = onOpenLibrary ?? onOpenFile;
  const uploadFile = onUploadFile ?? onOpenFile;

  const navTabs = [
    {
      id: "home" as const,
      label: "Home",
      hint: "Welcome and insight setup",
      icon: Home,
    },
    {
      id: "open" as const,
      label: "Open",
      hint: "Open a document from your library or recents",
      icon: FolderOpen,
    },
    {
      id: "new" as const,
      label: "New",
      hint: "Start a new draft workspace",
      icon: LayoutTemplate,
    },
  ];

  const renderHeroSection = () => (
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-800 via-slate-900 to-teal-950 p-6 text-white md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(45,212,191,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_48%)]" />
      <div className="relative max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
          Research Companion
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          {isEmptyWorkspace
            ? "Start your research"
            : isPreparingWorkspace
              ? "Setting up your workspace"
              : workspaceTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
          {isPreparingWorkspace
            ? insightsGenerating
              ? "Generating AI insights — your workspace will open when this finishes."
              : "Your document is attached. Generate AI insights to continue."
            : hasInsights
              ? "Insights are ready. Use New to return to the workspace and review findings."
              : isEmptyWorkspace
                ? "Use Open to attach a PDF or resume recent work. Choose New for a draft workspace."
                : "For case studies, research papers, reports, and document review — attach a source, generate insights, and work in one place."}
        </p>
      </div>
    </section>
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="relative z-[110] flex shrink-0 items-stretch border-b border-border/40 bg-gradient-to-b from-muted/25 to-transparent backdrop-blur-xl">
        <nav className="flex min-w-0 flex-1" role="tablist" aria-label="Research Companion views">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isNewTab = tab.id === "new";
            const selected = isNewTab ? activeView === "workspace" : activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={tab.label}
                title={tab.hint}
                disabled={isNewTab && isPreparingNewWorkspace}
                onClick={() => {
                  if (tab.id === "home") {
                    setActiveView("home");
                    return;
                  }
                  if (tab.id === "open") {
                    setActiveView("open");
                    return;
                  }
                  void handleNewWorkspace();
                }}
                className={cn(
                  "group relative flex min-w-0 items-center gap-2 border-b-2 px-4 py-3 transition-all duration-200 sm:px-5",
                  selected
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/20 hover:text-foreground",
                  isNewTab && isPreparingNewWorkspace && "cursor-wait opacity-70",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
                    selected
                      ? "bg-primary/12 ring-1 ring-primary/15"
                      : "bg-transparent group-hover:bg-muted/50",
                  )}
                >
                  {isNewTab && isPreparingNewWorkspace ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />
                  ) : (
                    <Icon className="h-3.5 w-3.5" strokeWidth={selected ? 2.25 : 2} />
                  )}
                </span>
                <span className="truncate text-xs font-semibold tracking-wide">
                  {isNewTab && isPreparingNewWorkspace ? "Preparing…" : tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => onOpenHelp?.()}
          disabled={!onOpenHelp}
          title="Research Companion help"
          className="flex shrink-0 items-center gap-1.5 border-l border-border/30 px-4 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
        >
          <CircleHelp className="h-3.5 w-3.5" strokeWidth={2.25} />
          <span className="hidden sm:inline">Help</span>
        </button>
      </header>

      {isPreparingNewWorkspace ? (
        <ResearchCompanionWorkspaceShimmer label="Preparing new workspace…" />
      ) : (
        <>
          {activeView === "home" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
                {renderHeroSection()}

                {isPreparingWorkspace ? (
                  <SetupProgressPanel
                    sourceName={sourceName}
                    fileUploading={fileUploading}
                    fileUploadProgress={fileUploadProgress}
                    insightsGenerating={insightsGenerating}
                    error={insightsGenerateError}
                    onGenerate={onGenerateInsights}
                  />
                ) : null}

                {hasInsights && sourceId ? (
                  <OverviewPanel label="Current document" title={workspaceTitle}>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Your workspace is ready with AI-generated summaries, keyword maps, evidence notes, and discussion prompts.
                    </p>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setActiveView("workspace")}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Open workspace
                      </button>
                    </div>
                  </OverviewPanel>
                ) : null}

                {!isPreparingWorkspace ? (
                  <OverviewPanel label="Workflow" title="How Research Companion works">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {workflowSteps.map((step, index) => (
                        <div
                          key={step}
                          className="rounded-xl border border-border/30 bg-background/60 p-4"
                        >
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/10 px-1.5 text-[11px] font-bold text-primary">
                            {index + 1}
                          </span>
                          <p className="mt-3 text-sm font-medium leading-snug text-foreground">{step}</p>
                        </div>
                      ))}
                    </div>
                  </OverviewPanel>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeView === "open" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
                <OverviewPanel label="Recent" title="Continue where you left off">
                  {recentWorkspaces.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {recentWorkspaces.slice(0, 6).map((workspace) => (
                        <button
                          key={workspace.key}
                          type="button"
                          onClick={() => onOpenRecentWorkspace?.(workspace)}
                          disabled={!onOpenRecentWorkspace}
                          className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card to-card/80 px-4 py-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                            <FileText className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {workspace.title}
                            </span>
                            <span className="mt-1 block text-[11px] text-muted-foreground">
                              {formatRecentTime(workspace.openedAt)}
                              {workspace.insightId ? " · Insights ready" : " · Document only"}
                            </span>
                          </span>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Your recently opened documents will appear here once you open a file from your library or
                      upload one.
                    </p>
                  )}
                </OverviewPanel>

                <OverviewPanel label="Get started" title="Choose how to begin">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <OverviewOptionCard
                      icon={FolderOpen}
                      badge="Library"
                      title="Open from library"
                      description="Browse PDFs already in your library and attach one to this workspace."
                      onClick={openLibrary}
                      disabled={!openLibrary}
                    />
                    <OverviewOptionCard
                      icon={Upload}
                      badge="Local file"
                      title="Upload from device"
                      description="Open your file picker and attach a PDF directly — no extra dialog."
                      onClick={uploadFile}
                      disabled={!uploadFile}
                      loading={fileUploading}
                      loadingLabel={fileUploadProgress || "Uploading…"}
                    />
                  </div>
                  {fileUploadError ? (
                    <p className="mt-3 text-sm text-destructive">{fileUploadError}</p>
                  ) : null}
                </OverviewPanel>
              </div>
            </div>
          ) : null}

          {draftSessionActive && !isPreparingWorkspace ? (
            <div
              key={`${workspaceSessionKey}-${sourceId ?? "draft"}-${insightId ?? "none"}`}
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-hidden",
                activeView !== "workspace" && "hidden",
              )}
            >
        <div
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1",
            workspaceGridColumns,
          )}
        >
          {!leftSidebarCollapsed && (
          <aside className="hidden min-h-0 min-w-0 overflow-hidden border-r border-border/30 bg-white lg:flex lg:flex-col dark:bg-background">
            <nav
              className="flex shrink-0 items-stretch border-b border-border/40 bg-gradient-to-b from-muted/25 to-transparent"
              aria-label="Workspace panels"
            >
              <div className="flex min-w-0 flex-1" role="tablist">
                {leftSidebarTabs.map((tab) => {
                  const Icon = tab.icon;
                  const selected = leftPanelTab === tab.id;
                  const badgeCount =
                    tab.id === "file"
                      ? sourcePages.length
                      : tab.id === "insights"
                        ? availableInsightCount
                        : 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-label={tab.label}
                      title={tab.hint}
                      onClick={() => setLeftPanelTab(tab.id)}
                      className={cn(
                        "group relative flex min-w-0 flex-1 flex-col items-center gap-1 border-b-2 px-1 py-2.5 transition-all duration-200",
                        selected
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/20 hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "relative flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200",
                          selected
                            ? "bg-primary/12 ring-1 ring-primary/15"
                            : "bg-transparent group-hover:bg-muted/50",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={selected ? 2.25 : 2} />
                        {badgeCount > 0 ? (
                          <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground shadow-sm">
                            {badgeCount > 9 ? "9+" : badgeCount}
                          </span>
                        ) : null}
                      </span>
                      <span className="max-w-full truncate text-[10px] font-semibold tracking-wide">
                        {tab.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setLeftSidebarCollapsed(true)}
                className="flex w-9 shrink-0 items-center justify-center border-l border-border/30 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
              </button>
            </nav>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
              {leftPanelTab === "file" ? (
                <>
                  <div className="shrink-0 min-w-0 pb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Source
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold tracking-tight text-foreground">
                      {workspaceTitle}
                    </p>
                  </div>
                  <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                    {isEmptyWorkspace ? (
                      <div className="rounded-lg border border-dashed border-border/40 bg-muted/20 px-3 py-8 text-center">
                        <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
                        <p className="mt-3 text-xs font-semibold text-foreground">No file uploaded</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          Upload a PDF to preview pages here.
                        </p>
                      </div>
                    ) : sourcePages.length === 0 ? (
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
                    onClick={uploadFile ?? onOpenFile ?? onOpenDifferentFile}
                    className="mt-3 shrink-0 h-9 w-full rounded-lg border border-border/30 bg-background/80 text-xs font-semibold text-foreground transition-all duration-200 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={(!uploadFile && !onOpenFile && !onOpenDifferentFile) || fileUploading}
                  >
                    {isEmptyWorkspace
                      ? fileUploading
                        ? fileUploadProgress || "Uploading…"
                        : "Upload file"
                      : "Switch file"}
                  </button>
                </>
              ) : (
                <>
                  <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    AI insights
                  </p>
                  <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {visibleInsightTabs.map((tab) => {
                      const isActive = activeInsightTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveInsightTab(tab.id);
                            setLeftPanelTab("insights");
                          }}
                          className={cn(
                            "w-full rounded-xl border p-3 text-left transition-all duration-200",
                            isActive
                              ? tab.available
                                ? "border-primary/25 bg-background ring-2 ring-primary/10"
                                : "border-border/40 bg-muted/20 ring-1 ring-border/30"
                              : tab.available
                                ? "border-border/30 bg-background/55 hover:bg-background"
                                : "border-border/25 bg-muted/15 opacity-80 hover:bg-muted/25",
                          )}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                tab.available ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {tab.label}
                            </span>
                            {tab.available ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {tab.count}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                <Lock className="h-3 w-3" />
                                Unavailable
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                            {tab.available
                              ? tab.description
                              : "Not generated — you can create this insight later."}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {missingInsightTypes.length > 0 && onGenerateInsights && (
                    <button
                      type="button"
                      onClick={() => void onGenerateInsights()}
                      disabled={insightsGenerating}
                      className="mt-3 shrink-0 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.06] text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {insightsGenerating
                        ? "Generating…"
                        : `Generate missing (${missingInsightTypes.length})`}
                    </button>
                  )}
                </>
              )}
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
                  documentTitle: workspaceTitle,
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
                {isEmptyWorkspace
                  ? renderEmptyInsightWorkspace()
                  : !isInsightTabAvailable(activeInsightTab)
                    ? renderUnavailableInsightPanel()
                    : renderInsightWorkspace()}
              </div>
            ) : (
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {leftSidebarCollapsed && (
                  <WorkspaceSidebarExpandButton onClick={() => setLeftSidebarCollapsed(false)} />
                )}
                {renderEmptyFileWorkspace()}
              </div>
            )}
          </div>
        </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
