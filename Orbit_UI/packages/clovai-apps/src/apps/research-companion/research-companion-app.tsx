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
  Cloud,
  Download,
  FileText,
  FolderOpen,
  Highlighter,
  Home,
  Lightbulb,
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
  Scale,
  Sparkles,
  StickyNote,
  TextSearch,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { ResearchCompanionWorkspaceShimmer } from "./research-companion-workspace-shimmer";
import {
  DeliverableWorkspaceChrome,
  DeliverableWorkspacePanel,
} from "./deliverable-workspace-panel";
import {
  ResearchCompanionWorksheetNavbar,
  type WorksheetNavItem,
  type WorksheetTabId,
} from "./research-companion-worksheet-navbar";
import {
  DEFAULT_WORKSPACE_TYPE_ID,
  getDefaultWorksheetTabId,
  getWorkspaceTypeDefinition,
  RESEARCH_COMPANION_WORKSPACE_TYPES,
  type ResearchCompanionWorkspaceTypeId,
} from "./workspace-types";
import { WorkspaceTypePicker } from "./workspace-type-picker";
import { PhotoStudioNavMoreMenu } from "../photo-studio/photo-studio-nav-more-menu";
import {
  ResearchCompanionWorkspaceChrome,
  type ResearchCompanionMoreMenuItem,
  type ResearchCompanionWorkspaceTab,
} from "./research-companion-workspace-chrome";

const WORKSPACE_PREPARE_DELAY_MS = 750;

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export type ResearchCompanionView = "home" | "open" | "workspace";

export type { ResearchCompanionWorkspaceTab } from "./research-companion-workspace-chrome";
export { ResearchCompanionWorkspaceChrome } from "./research-companion-workspace-chrome";

export type RecentWorkspace = {
  key: string;
  title: string;
  sourceId: string;
  sourceName: string;
  insightId?: string | null;
  insightTypes?: string | null;
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
  /** When true, header highlights Open while an existing workspace session is shown. */
  resumedFromLibrary?: boolean;
  workspaceTabs?: ResearchCompanionWorkspaceTab[];
  activeWorkspaceTabId?: string | null;
  onSelectWorkspaceTab?: (tabId: string) => void;
  onCloseWorkspaceTab?: (tabId: string) => void;
  onNewWorkspaceTab?: () => void | Promise<void>;
  isPreparingNewWorkspaceTab?: boolean;
  /** Keeps parent `initialTab` aligned when the user switches Home vs workspace inside the app. */
  onShellViewChange?: (view: ResearchCompanionView) => void;
  /** Active workspace tab mode — drives dynamic worksheet tabs. */
  workspaceTypeId?: ResearchCompanionWorkspaceTypeId;
  /** Home type cards and picker — parent creates a typed workspace tab. */
  onStartWorkspaceWithType?: (typeId: ResearchCompanionWorkspaceTypeId) => void;
};

type WorkspaceTool = "select" | "pencil" | "highlight" | "note" | "comment";

type InsightTab = "keywords" | "concepts" | "summary" | "evidence" | "questions" | "notes";
type AssistPanel = "chat" | "summary" | "flashcards" | "note";

const recentAccentKeys = ["emerald", "teal", "cyan", "violet", "amber", "rose"] as const;

const accentThemes = {
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/20 dark:text-emerald-300",
    icon: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25",
    card: "border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 hover:border-emerald-300 hover:shadow-[0_12px_32px_rgba(16,185,129,0.12)] dark:border-emerald-500/20 dark:from-emerald-950/30 dark:via-background dark:to-teal-950/20",
    panelHeader: "from-emerald-500/10 via-teal-500/5 to-transparent",
    glow: "bg-emerald-400/30",
  },
  teal: {
    badge: "bg-teal-500/15 text-teal-800 ring-1 ring-teal-500/20 dark:text-teal-300",
    icon: "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25",
    card: "border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/60 hover:border-teal-300 hover:shadow-[0_12px_32px_rgba(20,184,166,0.12)] dark:border-teal-500/20 dark:from-teal-950/30 dark:via-background dark:to-cyan-950/20",
    panelHeader: "from-teal-500/10 via-cyan-500/5 to-transparent",
    glow: "bg-teal-400/30",
  },
  cyan: {
    badge: "bg-cyan-500/15 text-cyan-800 ring-1 ring-cyan-500/20 dark:text-cyan-300",
    icon: "bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/25",
    card: "border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 via-white to-sky-50/60 hover:border-cyan-300 hover:shadow-[0_12px_32px_rgba(6,182,212,0.12)] dark:border-cyan-500/20 dark:from-cyan-950/30 dark:via-background dark:to-sky-950/20",
    panelHeader: "from-cyan-500/10 via-sky-500/5 to-transparent",
    glow: "bg-cyan-400/30",
  },
  violet: {
    badge: "bg-violet-500/15 text-violet-700 ring-1 ring-violet-500/20 dark:text-violet-300",
    icon: "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25",
    card: "border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/60 hover:border-violet-300 hover:shadow-[0_12px_32px_rgba(124,58,237,0.12)] dark:border-violet-500/20 dark:from-violet-950/30 dark:via-background dark:to-indigo-950/20",
    panelHeader: "from-violet-500/10 via-indigo-500/5 to-transparent",
    glow: "bg-violet-400/30",
  },
  amber: {
    badge: "bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-300",
    icon: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25",
    card: "border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 hover:border-amber-300 hover:shadow-[0_12px_32px_rgba(245,158,11,0.12)] dark:border-amber-500/20 dark:from-amber-950/30 dark:via-background dark:to-orange-950/20",
    panelHeader: "from-amber-500/10 via-orange-500/5 to-transparent",
    glow: "bg-amber-400/30",
  },
  rose: {
    badge: "bg-rose-500/15 text-rose-800 ring-1 ring-rose-500/20 dark:text-rose-300",
    icon: "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25",
    card: "border-rose-200/70 bg-gradient-to-br from-rose-50/90 via-white to-pink-50/60 hover:border-rose-300 hover:shadow-[0_12px_32px_rgba(244,63,94,0.12)] dark:border-rose-500/20 dark:from-rose-950/30 dark:via-background dark:to-pink-950/20",
    panelHeader: "from-rose-500/10 via-pink-500/5 to-transparent",
    glow: "bg-rose-400/30",
  },
} as const;

function InsightsLauncherPanel({
  label,
  title,
  accent = "teal",
  children,
}: {
  label: string;
  title: string;
  accent?: keyof typeof accentThemes;
  children: ReactNode;
}) {
  const theme = accentThemes[accent];
  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-border/40 bg-card/90 shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm">
      <div
        className={cn(
          "relative border-b border-border/30 bg-gradient-to-r px-5 py-4 md:px-6",
          theme.panelHeader,
        )}
      >
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 opacity-80" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function InsightsHome({
  recentWorkspaces,
  onOpenRecentWorkspace,
  onStartWorkspaceWithType,
  formatRecentTime,
  fileUploadError,
}: {
  recentWorkspaces: RecentWorkspace[];
  onOpenRecentWorkspace?: (workspace: RecentWorkspace) => void;
  onStartWorkspaceWithType?: (typeId: ResearchCompanionWorkspaceTypeId) => void;
  formatRecentTime: (openedAt: number) => string;
  fileUploadError?: string | null;
}) {
  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-600 p-6 text-white shadow-[0_20px_60px_rgba(20,184,166,0.25)] md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.22),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(56,189,248,0.35),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.1),transparent_50%)]" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 ring-1 ring-white/20 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Clovai Insights
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-[2.65rem] md:leading-tight">
                Start your workspace
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 md:text-base">
                Choose a workspace type below—research, project discussion, or literature review.
                Use <span className="font-semibold text-white">+</span> for another tab, or open a
                recent document.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
              {[
                { label: "Summaries", className: "bg-white/15 ring-white/20" },
                { label: "Evidence maps", className: "bg-emerald-400/20 ring-emerald-200/30" },
                { label: "Study notes", className: "bg-cyan-400/20 ring-cyan-200/30" },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className={cn(
                    "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold text-white ring-1 backdrop-blur-sm",
                    chip.className,
                  )}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <InsightsLauncherPanel label="Workspace type" title="How do you want to work?" accent="cyan">
          <WorkspaceTypePicker
            onSelect={(typeId) => onStartWorkspaceWithType?.(typeId)}
          />
          {!onStartWorkspaceWithType ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Open a workspace tab to enable type selection.
            </p>
          ) : null}
        </InsightsLauncherPanel>

        <InsightsLauncherPanel label="Recent" title="Continue where you left off" accent="teal">
          {recentWorkspaces.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {recentWorkspaces.slice(0, 6).map((workspace, index) => {
                const accent = recentAccentKeys[index % recentAccentKeys.length];
                const theme = accentThemes[accent];
                return (
                  <button
                    key={workspace.key}
                    type="button"
                    onClick={() => onOpenRecentWorkspace?.(workspace)}
                    disabled={!onOpenRecentWorkspace}
                    className={cn(
                      "group relative flex w-full items-start gap-3 overflow-hidden rounded-[1.15rem] px-4 py-4 text-left transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50",
                      theme.card,
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                        theme.icon,
                      )}
                    >
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
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your recently opened documents will appear here once you open a file from your library
              or upload one.
            </p>
          )}
        </InsightsLauncherPanel>

        <InsightsLauncherPanel label="Modes" title="What each workspace type includes" accent="emerald">
          <div className="grid gap-3 md:grid-cols-3">
            {RESEARCH_COMPANION_WORKSPACE_TYPES.map((type) => {
              const Icon = type.icon;
              const theme = accentThemes[type.accentKey];
              return (
                <div
                  key={type.id}
                  className={cn(
                    "rounded-xl border border-border/30 bg-background/60 p-4",
                    theme.card,
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                      theme.icon,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-foreground">{type.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {type.description}
                  </p>
                  <ol className="mt-3 space-y-1.5">
                    {type.workflowSteps.map((step, index) => (
                      <li key={step} className="flex gap-2 text-[11px] text-muted-foreground">
                        <span className="font-bold text-primary">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </InsightsLauncherPanel>

        {fileUploadError ? (
          <p className="text-sm text-destructive">{fileUploadError}</p>
        ) : null}
      </div>
    </div>
  );
}

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
}: {
  chrome: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {chrome}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
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
  resumedFromLibrary: initialResumedFromLibrary = false,
  workspaceTabs,
  activeWorkspaceTabId,
  onSelectWorkspaceTab,
  onCloseWorkspaceTab,
  onNewWorkspaceTab,
  isPreparingNewWorkspaceTab = false,
  onShellViewChange,
  workspaceTypeId = DEFAULT_WORKSPACE_TYPE_ID,
  onStartWorkspaceWithType,
}: ResearchCompanionAppProps) {
  const workspaceTypeDef = useMemo(
    () => getWorkspaceTypeDefinition(workspaceTypeId),
    [workspaceTypeId],
  );
  const isEmptyWorkspace = !sourceId;
  const workspaceTitle =
    sourceName?.trim() ||
    (isEmptyWorkspace ? `${workspaceTypeDef.shortLabel} workspace` : "Selected document");
  const hasInsights = Boolean(insightId);
  const isAcademicResearch = workspaceTypeId === "academic-research";
  const isPreparingWorkspace = Boolean(isAcademicResearch && sourceId && !hasInsights);
  const [resumedFromLibrary, setResumedFromLibrary] = useState(initialResumedFromLibrary);
  const [activeView, setActiveView] = useState<ResearchCompanionView>(
    initialTab === "workspace" || initialTab === "open" || insightId || sourceId
      ? "workspace"
      : "home",
  );
  const [isPreparingNewWorkspace, setIsPreparingNewWorkspace] = useState(false);
  const [draftSessionActive, setDraftSessionActive] = useState(
    Boolean(sourceId || insightId || initialTab === "workspace"),
  );
  const hasStartedDraftRef = useRef(Boolean(sourceId || insightId || initialTab === "workspace"));
  const [activeTool, setActiveTool] = useState<WorkspaceTool>("pencil");
  const [worksheetTab, setWorksheetTab] = useState<WorksheetTabId>(() =>
    getDefaultWorksheetTabId(workspaceTypeId),
  );
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
    if (sourceId || insightId || initialTab === "workspace") {
      setDraftSessionActive(true);
      hasStartedDraftRef.current = true;
    }
  }, [initialTab, insightId, sourceId]);

  useEffect(() => {
    if (initialTab === "workspace") {
      setActiveView("workspace");
      setDraftSessionActive(true);
      setResumedFromLibrary(false);
      return;
    }
    if (initialTab === "home") {
      setActiveView("home");
    }
  }, [initialTab, workspaceSessionKey]);

  useEffect(() => {
    if (insightId) {
      setActiveView("workspace");
    }
  }, [insightId]);

  useEffect(() => {
    setResumedFromLibrary(initialResumedFromLibrary);
  }, [initialResumedFromLibrary]);

  useEffect(() => {
    if (isPreparingWorkspace && activeView === "workspace" && sourceId) {
      setActiveView("home");
    }
  }, [activeView, isPreparingWorkspace, sourceId]);

  useEffect(() => {
    if (!initialAssistPanel) return;
    setActiveAssistPanel(initialAssistPanel);
    setRightToolbarExpanded(true);
  }, [initialAssistPanel]);

  useEffect(() => {
    setWorksheetTab(getDefaultWorksheetTabId(workspaceTypeId));
  }, [workspaceTypeId, workspaceSessionKey]);

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
  const workspaceGridClassName = useMemo(
    () =>
      cn(
        "grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)]",
        leftSidebarCollapsed
          ? "lg:grid-cols-[minmax(0,1fr)_auto]"
          : "lg:grid-cols-[17rem_minmax(0,1fr)_auto]",
      ),
    [leftSidebarCollapsed],
  );

  const worksheetNavRowClassName = leftSidebarCollapsed
    ? "border-b border-border/40 bg-card/70 lg:col-start-1 lg:row-start-1"
    : "border-b border-border/40 bg-card/70 lg:col-start-2 lg:row-start-1";

  const worksheetBodyClassName = leftSidebarCollapsed
    ? "relative flex min-h-0 flex-col overflow-hidden lg:col-start-1 lg:row-start-2"
    : "relative flex min-h-0 flex-col overflow-hidden lg:col-start-2 lg:row-start-2";

  const toolsPanelGridClassName = leftSidebarCollapsed
    ? "hidden min-h-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex"
    : "hidden min-h-0 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:flex";

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
      className="relative flex h-full min-h-0 w-full shrink-0"
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
            "flex h-10 shrink-0 items-center border-b border-border/30",
            rightToolbarExpanded ? "justify-between gap-2 px-3" : "justify-center px-2",
          )}
        >
          {rightToolbarExpanded ? (
            <div className="flex w-full items-center justify-between gap-2">
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

  const showWorkspaceView = useCallback(() => {
    setActiveView("workspace");
    setResumedFromLibrary(false);
    onShellViewChange?.("workspace");
  }, [onShellViewChange]);

  const handleHomeClick = useCallback(() => {
    setResumedFromLibrary(false);
    setActiveView("home");
    onShellViewChange?.("home");
  }, [onShellViewChange]);

  const handleSelectWorkspaceTab = useCallback(
    (tabId: string) => {
      showWorkspaceView();
      onSelectWorkspaceTab?.(tabId);
    },
    [onSelectWorkspaceTab, showWorkspaceView],
  );

  const handleOpenRecentWorkspace = useCallback(
    (workspace: RecentWorkspace) => {
      showWorkspaceView();
      onOpenRecentWorkspace?.(workspace);
    },
    [onOpenRecentWorkspace, showWorkspaceView],
  );

  const handleStartWorkspaceWithType = useCallback(
    (typeId: ResearchCompanionWorkspaceTypeId) => {
      void onStartWorkspaceWithType?.(typeId);
      setDraftSessionActive(true);
      hasStartedDraftRef.current = true;
      showWorkspaceView();
    },
    [onStartWorkspaceWithType, showWorkspaceView],
  );

  const handleNewWorkspace = async () => {
    if (isPreparingNewWorkspace || isPreparingNewWorkspaceTab) return;

    if (onNewWorkspaceTab) {
      await Promise.resolve(onNewWorkspaceTab());
      setDraftSessionActive(true);
      showWorkspaceView();
      resetWorkspacePanels();
      return;
    }

    const resetDraft = onResetDraftWorkspace ?? onNewWorkspace;

    if (activeView === "workspace" && draftSessionActive && isEmptyWorkspace) {
      return;
    }

    if (draftSessionActive && isEmptyWorkspace && activeView !== "workspace") {
      setActiveView("workspace");
      setResumedFromLibrary(false);
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

      setResumedFromLibrary(false);
      setDraftSessionActive(true);
      resetWorkspacePanels();
      setActiveView("workspace");
    } finally {
      setIsPreparingNewWorkspace(false);
    }
  };

  const resetWorkspacePanels = () => {
    setWorksheetTab(getDefaultWorksheetTabId(workspaceTypeId));
    setLeftSidebarCollapsed(false);
    setActiveAssistPanel(null);
    setActivePage(1);
    setActiveInsightTab("summary");
  };

  const isWorksheetTabAvailable = useCallback(
    (tabId: WorksheetTabId, kind: "document" | "insight" | "deliverable") => {
      if (kind === "document" || kind === "deliverable") return true;
      if (isEmptyWorkspace) return true;
      return isInsightTabAvailable(tabId as InsightTab);
    },
    [isEmptyWorkspace, isInsightTabAvailable],
  );

  const worksheetNavItems = useMemo((): WorksheetNavItem[] => {
    return workspaceTypeDef.worksheetTabs.map((spec) => {
      const insightMeta =
        spec.kind === "insight"
          ? visibleInsightTabs.find((tab) => tab.id === spec.id)
          : undefined;
      return {
        id: spec.id,
        label: spec.label,
        shortLabel: spec.shortLabel,
        hint: spec.hint,
        icon: spec.icon,
        available: isWorksheetTabAvailable(spec.id, spec.kind),
        badgeCount:
          spec.kind === "insight" && insightMeta?.available ? insightMeta.count : undefined,
      };
    });
  }, [isWorksheetTabAvailable, visibleInsightTabs, workspaceTypeDef.worksheetTabs]);

  const activeWorksheetTabDef = useMemo(
    () =>
      workspaceTypeDef.worksheetTabs.find((tab) => tab.id === worksheetTab) ??
      workspaceTypeDef.worksheetTabs[0],
    [workspaceTypeDef.worksheetTabs, worksheetTab],
  );

  const handleWorksheetTabSelect = useCallback(
    (tabId: WorksheetTabId) => {
      setWorksheetTab(tabId);
      const tabDef = workspaceTypeDef.worksheetTabs.find((item) => item.id === tabId);
      if (tabDef?.kind === "insight") {
        if (tabDef.id === "notes" || isGeneratableInsightTab(tabDef.id as InsightTab)) {
          setActiveInsightTab(tabDef.id as InsightTab);
        }
      }
    },
    [workspaceTypeDef.worksheetTabs],
  );

  const worksheetNav = (
    <ResearchCompanionWorksheetNavbar
      activeTab={worksheetTab}
      tabs={worksheetNavItems}
      onSelectTab={handleWorksheetTabSelect}
    />
  );

  const renderWorksheetContent = () => {
    if (activeWorksheetTabDef.kind === "document") {
      if (hasDocumentViewer) {
        return (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {renderDocumentView!({
              sourceId: sourceId!,
              documentTitle: workspaceTitle,
              activePage,
              pageCount: sourcePages.length,
              onPageChange: setActivePage,
            })}
          </div>
        );
      }
      return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {renderEmptyFileWorkspace()}
        </div>
      );
    }

    if (activeWorksheetTabDef.kind === "deliverable") {
      return (
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ResearchCompanionWorkspaceShell
            chrome={
              <DeliverableWorkspaceChrome
                tab={activeWorksheetTabDef}
                workspaceTitle={workspaceTitle}
              />
            }
          >
            <DeliverableWorkspacePanel
              tab={activeWorksheetTabDef}
              workspaceTitle={workspaceTitle}
            />
          </ResearchCompanionWorkspaceShell>
        </div>
      );
    }

    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {isEmptyWorkspace
          ? renderEmptyInsightWorkspace()
          : !isInsightTabAvailable(worksheetTab as InsightTab)
            ? renderUnavailableInsightPanel()
            : renderInsightWorkspace()}
      </div>
    );
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
                Review AI insights while keeping the source document open on the Document tab.
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

  const showWorkspaceChrome = Boolean(
    workspaceTabs &&
      activeWorkspaceTabId &&
      onSelectWorkspaceTab &&
      onCloseWorkspaceTab &&
      onNewWorkspaceTab,
  );

  const moreMenuItems = useMemo((): ResearchCompanionMoreMenuItem[] => {
    const items: ResearchCompanionMoreMenuItem[] = [];
    if (openLibrary) {
      items.push({
        id: "library",
        label: "Open from library",
        description: "Browse PDFs already in your library and attach one to this workspace.",
        icon: FolderOpen,
        onClick: () => openLibrary(),
      });
    }
    if (uploadFile) {
      items.push({
        id: "upload",
        label: sourceId ? "Replace document" : "Upload from device",
        description: "Pick a PDF from your device and attach it to this workspace.",
        icon: Upload,
        onClick: () => uploadFile(),
        disabled: fileUploading,
        loading: fileUploading,
      });
    }
    return items;
  }, [fileUploading, openLibrary, sourceId, uploadFile]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {showWorkspaceChrome ? (
        <ResearchCompanionWorkspaceChrome
          tabs={workspaceTabs ?? []}
          activeTabId={activeWorkspaceTabId!}
          onSelectTab={handleSelectWorkspaceTab}
          onCloseTab={onCloseWorkspaceTab!}
          onNewTab={() => void handleNewWorkspace()}
          isPreparingNew={isPreparingNewWorkspaceTab || isPreparingNewWorkspace}
          homeSelected={activeView === "home"}
          onHomeClick={handleHomeClick}
          moreMenuItems={moreMenuItems}
          onOpenHelp={onOpenHelp}
        />
      ) : (
        <header className="relative z-[110] flex h-11 shrink-0 items-center border-b border-border/40 bg-card/80 px-4 backdrop-blur-md">
          <nav className="flex flex-1 items-center" aria-label="Clovai Insights navigation">
            <div className="inline-flex items-center rounded-lg border border-border/50 bg-muted/25 p-0.5">
              <button
                type="button"
                aria-label="Home"
                title="Recent documents and workspace overview"
                onClick={handleHomeClick}
                className={cn(
                  "relative flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all duration-150",
                  activeView === "home"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                )}
              >
                <Home className="h-3.5 w-3.5 shrink-0" strokeWidth={activeView === "home" ? 2.25 : 2} />
                <span className="hidden sm:inline">Home</span>
              </button>
              {moreMenuItems.length > 0 ? (
                <PhotoStudioNavMoreMenu items={moreMenuItems} />
              ) : null}
            </div>
          </nav>
          <button
            type="button"
            onClick={() => onOpenHelp?.()}
            disabled={!onOpenHelp}
            title="Help"
            aria-label="Help"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-40"
          >
            <CircleHelp className="h-4 w-4" strokeWidth={2} />
          </button>
        </header>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {isPreparingNewWorkspace ? (
        <ResearchCompanionWorkspaceShimmer label="Preparing new workspace…" />
      ) : (
        <>
          {activeView === "home" ? (
            <>
              <InsightsHome
                recentWorkspaces={recentWorkspaces}
                onOpenRecentWorkspace={handleOpenRecentWorkspace}
                onStartWorkspaceWithType={handleStartWorkspaceWithType}
                formatRecentTime={formatRecentTime}
                fileUploadError={fileUploadError}
              />
              {isPreparingWorkspace ? (
                <div className="mx-auto w-full max-w-6xl px-4 pb-6 md:px-8">
                  <SetupProgressPanel
                    sourceName={sourceName}
                    fileUploading={fileUploading}
                    fileUploadProgress={fileUploadProgress}
                    insightsGenerating={insightsGenerating}
                    error={insightsGenerateError}
                    onGenerate={onGenerateInsights}
                  />
                </div>
              ) : null}
              {hasInsights && sourceId ? (
                <div className="mx-auto w-full max-w-6xl px-4 pb-8 md:px-8">
                  <OverviewPanel label="Current document" title={workspaceTitle}>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Your workspace is ready with AI-generated summaries, keyword maps, evidence notes, and discussion prompts.
                    </p>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={showWorkspaceView}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Open workspace
                      </button>
                    </div>
                  </OverviewPanel>
                </div>
              ) : null}
            </>
          ) : null}

          {draftSessionActive ? (
            <div
              key={`${workspaceSessionKey}-${workspaceTypeId}-${sourceId ?? "draft"}-${insightId ?? "none"}`}
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-hidden",
                activeView !== "workspace" && "hidden",
              )}
            >
        <div className={workspaceGridClassName}>
          {!leftSidebarCollapsed && (
            <aside className="hidden min-h-0 min-w-0 flex-col overflow-hidden border-r border-border/30 bg-white lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex dark:bg-background">
              <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border/40 bg-card/70 px-2 backdrop-blur-sm">
                <p className="text-xs font-semibold text-foreground">Pages</p>
                <button
                  type="button"
                  onClick={() => setLeftSidebarCollapsed(true)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
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
                          setWorksheetTab(getDefaultWorksheetTabId(workspaceTypeId));
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
                {isEmptyWorkspace ? (
                  <button
                    type="button"
                    onClick={uploadFile ?? onOpenFile ?? onOpenDifferentFile}
                    className="mt-3 shrink-0 h-9 w-full rounded-lg border border-border/30 bg-background/80 text-xs font-semibold text-foreground transition-all duration-200 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={(!uploadFile && !onOpenFile && !onOpenDifferentFile) || fileUploading}
                  >
                    {fileUploading ? fileUploadProgress || "Uploading…" : "Upload file"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={uploadFile ?? onOpenFile ?? onOpenDifferentFile}
                      className="mt-3 shrink-0 h-9 w-full rounded-lg border border-border/30 bg-background/80 text-xs font-semibold text-foreground transition-all duration-200 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={(!uploadFile && !onOpenFile && !onOpenDifferentFile) || fileUploading}
                    >
                      Switch file
                    </button>
                    {missingInsightTypes.length > 0 && onGenerateInsights ? (
                      <button
                        type="button"
                        onClick={() => void onGenerateInsights()}
                        disabled={insightsGenerating}
                        className="mt-2 shrink-0 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.06] text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {insightsGenerating
                          ? "Generating…"
                          : `Generate insights (${missingInsightTypes.length})`}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </aside>
          )}

          <div className={worksheetNavRowClassName}>{worksheetNav}</div>

          <div className={worksheetBodyClassName}>
            {leftSidebarCollapsed && (
              <WorkspaceSidebarExpandButton onClick={() => setLeftSidebarCollapsed(false)} />
            )}
            {renderWorksheetContent()}
          </div>

          <div className={toolsPanelGridClassName}>{renderWorkspaceToolsPanel()}</div>
        </div>
            </div>
          ) : null}
        </>
      )}
      </div>
    </div>
  );
}
