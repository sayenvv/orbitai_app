"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  FolderKanban,
  Home,
  Layers,
  LayoutTemplate,
  Loader2,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Plus,
  Search,
  Sparkles,
  Upload,
  type LucideIcon,
} from "lucide-react";
import {
  SDLC_MODULES,
  SDLC_SELECTION_PRESETS,
  getSdlcModule,
  type SdlcModuleId,
  type SdlcSelectionPresetId,
} from "./sdlc-modules";
import { ArtifactMarkdownEditor } from "./artifact-markdown-editor";
import { ClovaiProjectsWorkspaceShimmer } from "./clovai-projects-workspace-shimmer";
import type {
  ArtifactReviewStatus,
  ClovaiProjectsView,
  OutputStyle,
  ProcessingStep,
  ProjectWorkspace,
  RecentProjectWorkspace,
  SdlcArtifact,
} from "./types";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export type { ClovaiProjectsView, RecentProjectWorkspace, ProjectWorkspace, SdlcArtifact };

export type ClovaiProjectsAppProps = {
  workspaces: ProjectWorkspace[];
  activeWorkspace: ProjectWorkspace | null;
  activeView: ClovaiProjectsView;
  onViewChange: (view: ClovaiProjectsView) => void;
  onOpenWorkspace: (workspaceId: string) => void;
  onOpenRecentWorkspace?: (entry: RecentProjectWorkspace) => void;
  recentWorkspaces?: RecentProjectWorkspace[];
  formatRecentTime?: (openedAt: number) => string;
  onOpenHelp?: () => void;
  processingSteps?: ProcessingStep[];
  processingProgress?: number;
  processingMessage?: string | null;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  draftRequirements: string;
  onDraftRequirementsChange: (value: string) => void;
  draftProjectType: string;
  onDraftProjectTypeChange: (value: string) => void;
  draftPreset: SdlcSelectionPresetId;
  onDraftPresetChange: (preset: SdlcSelectionPresetId) => void;
  draftCustomModules: SdlcModuleId[];
  onDraftCustomModulesChange: (modules: SdlcModuleId[]) => void;
  draftOutputStyle: OutputStyle;
  onDraftOutputStyleChange: (style: OutputStyle) => void;
  draftFileName?: string | null;
  draftUploadState?: "empty" | "selected" | "uploading" | "failed" | "uploaded";
  draftUploadError?: string | null;
  onPickFile?: () => void;
  onStartGeneration?: () => void;
  generationStarting?: boolean;
  selectedArtifactId: SdlcModuleId | null;
  onSelectArtifact: (moduleId: SdlcModuleId) => void;
  onUpdateArtifactContent: (moduleId: SdlcModuleId, content: string) => void;
  onUpdateArtifactDiagram: (moduleId: SdlcModuleId, source: string) => void;
  onUpdateArtifactStatus: (moduleId: SdlcModuleId, status: ArtifactReviewStatus) => void;
  onSaveWorkspace?: () => void;
  saveState?: "idle" | "saving" | "saved";
  workspaceSearch: string;
  onWorkspaceSearchChange: (value: string) => void;
  statusFilter: "all" | "processing" | "completed" | "failed";
  onStatusFilterChange: (value: "all" | "processing" | "completed" | "failed") => void;
};

const workflowSteps = [
  "Upload or describe requirements",
  "Select SDLC sections to generate",
  "Review and edit artifacts",
  "Chat with AI and export documentation",
] as const;

const PROCESSING_STEPS: ProcessingStep[] = [
  { id: "upload", label: "Uploading document" },
  { id: "extract", label: "Extracting text" },
  { id: "analyze", label: "Analyzing requirements" },
  { id: "gaps", label: "Finding missing details" },
  { id: "generate", label: "Generating SDLC sections" },
  { id: "diagrams", label: "Creating diagrams" },
  { id: "prepare", label: "Preparing workspace" },
];

const REVIEW_STATUSES: Array<{ id: ArtifactReviewStatus; label: string }> = [
  { id: "draft", label: "Draft" },
  { id: "ai-generated", label: "AI Generated" },
  { id: "edited", label: "Edited" },
  { id: "needs-review", label: "Needs Review" },
  { id: "reviewed", label: "Reviewed" },
  { id: "verified", label: "Verified" },
];

const OUTPUT_STYLES: Array<{ id: OutputStyle; label: string }> = [
  { id: "professional", label: "Professional PM" },
  { id: "university", label: "University report" },
  { id: "technical", label: "Technical spec" },
  { id: "executive", label: "Executive summary" },
];

const FEATURE_CARDS = [
  { title: "Requirement analysis", body: "Turn ideas and uploads into structured requirements and use cases." },
  { title: "Diagrams", body: "Process flow, data flow, and ER diagrams with editable Mermaid source." },
  { title: "Implementation plans", body: "Frontend, backend, API, and database planning in one workspace." },
  { title: "Export center", body: "Export selected sections or the full SDLC pack in multiple formats." },
];

function ReviewStatusBadge({ status }: { status: ArtifactReviewStatus }) {
  const tone =
    status === "verified"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : status === "reviewed"
        ? "bg-sky-500/10 text-sky-700 dark:text-sky-400"
        : status === "needs-review"
          ? "bg-amber-500/10 text-amber-800 dark:text-amber-400"
          : status === "edited"
            ? "bg-violet-500/10 text-violet-700 dark:text-violet-400"
            : "bg-muted text-muted-foreground";
  const label = REVIEW_STATUSES.find((s) => s.id === status)?.label ?? status;
  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", tone)}>
      {label}
    </span>
  );
}

function WorkspaceCard({
  workspace,
  onOpen,
}: {
  workspace: ProjectWorkspace;
  onOpen: () => void;
}) {
  const reviewed = workspace.artifacts.filter((a) => a.status === "reviewed" || a.status === "verified").length;
  const total = workspace.artifacts.filter((a) => a.moduleId !== "export-center").length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col rounded-2xl border border-border/50 bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">{workspace.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{workspace.projectType || "General project"}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-primary" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-md bg-muted/70 px-2 py-0.5 capitalize">{workspace.generationStatus}</span>
        <span>
          Review {reviewed}/{total}
        </span>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Updated {new Date(workspace.updatedAt).toLocaleDateString()}
      </p>
    </button>
  );
}

function DiagramPreview({ source }: { source: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mermaid source</p>
      <pre className="max-h-[320px] overflow-auto rounded-lg bg-background/80 p-3 font-mono text-xs leading-relaxed text-foreground">
        {source}
      </pre>
      <p className="mt-3 text-xs text-muted-foreground">
        Diagram rendering connects to Mermaid in a later milestone — edit source below.
      </p>
    </div>
  );
}

function ExportOptionsPanel() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Choose what to include in your export pack.</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" defaultChecked className="rounded border-border" />
        Include selected SDLC sections
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" defaultChecked className="rounded border-border" />
        Include diagrams (PNG / SVG)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="rounded border-border" />
        Include AI assumptions
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="rounded border-border" />
        Include review status
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {["PDF", "Markdown", "HTML", "DOCX"].map((fmt) => (
          <button
            key={fmt}
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border/50 bg-background text-sm font-semibold transition hover:border-primary/30 hover:bg-muted/40"
          >
            Export {fmt}
          </button>
        ))}
      </div>
    </div>
  );
}

function AiAssistantPanel({ artifactTitle }: { artifactTitle: string }) {
  const [prompt, setPrompt] = useState("");
  const suggestions = [
    `Make ${artifactTitle} shorter`,
    "Add an admin role to the use case section",
    "Simplify this for a university report",
    "Generate more test cases",
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border/30 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI assistant</p>
        <p className="mt-1 text-sm text-foreground">Modify, summarize, or regenerate the active section.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="text-xs text-muted-foreground">Suggestions</p>
        <div className="mt-2 flex flex-col gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              className="rounded-lg border border-border/40 px-3 py-2 text-left text-xs text-foreground transition hover:bg-muted/50"
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Assistant changes will preview before apply when the backend is connected.
        </p>
      </div>
      <div className="shrink-0 border-t border-border/30 p-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Ask AI to modify this section…"
          className="w-full resize-none rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
        />
        <button
          type="button"
          disabled={!prompt.trim()}
          className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Send
        </button>
      </div>
    </div>
  );
}

export function ClovaiProjectsApp({
  workspaces,
  activeWorkspace,
  activeView,
  onViewChange,
  onOpenWorkspace,
  onOpenRecentWorkspace,
  recentWorkspaces = [],
  formatRecentTime,
  onOpenHelp,
  processingSteps = PROCESSING_STEPS,
  processingProgress = 0,
  processingMessage,
  draftName,
  onDraftNameChange,
  draftRequirements,
  onDraftRequirementsChange,
  draftProjectType,
  onDraftProjectTypeChange,
  draftPreset,
  onDraftPresetChange,
  draftCustomModules,
  onDraftCustomModulesChange,
  draftOutputStyle,
  onDraftOutputStyleChange,
  draftFileName,
  draftUploadState = "empty",
  draftUploadError,
  onPickFile,
  onStartGeneration,
  generationStarting,
  selectedArtifactId,
  onSelectArtifact,
  onUpdateArtifactContent,
  onUpdateArtifactDiagram,
  onUpdateArtifactStatus,
  onSaveWorkspace,
  saveState = "idle",
  workspaceSearch,
  onWorkspaceSearchChange,
  statusFilter,
  onStatusFilterChange,
}: ClovaiProjectsAppProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assistOpen, setAssistOpen] = useState(true);

  const formatTime =
    formatRecentTime ??
    ((t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" }));

  const filteredWorkspaces = useMemo(() => {
    const q = workspaceSearch.trim().toLowerCase();
    return workspaces.filter((w) => {
      if (statusFilter !== "all" && w.generationStatus !== statusFilter) return false;
      if (!q) return true;
      return w.name.toLowerCase().includes(q) || w.projectType.toLowerCase().includes(q);
    });
  }, [workspaces, workspaceSearch, statusFilter]);

  const visibleSidebarModules = useMemo(() => {
    if (!activeWorkspace) return SDLC_MODULES;
    const ids = new Set(activeWorkspace.artifacts.map((a) => a.moduleId));
    return SDLC_MODULES.filter((m) => ids.has(m.id) || m.id === "overview");
  }, [activeWorkspace]);

  const activeArtifact = useMemo(() => {
    if (!activeWorkspace || !selectedArtifactId) return null;
    return activeWorkspace.artifacts.find((a) => a.moduleId === selectedArtifactId) ?? null;
  }, [activeWorkspace, selectedArtifactId]);

  const reviewProgress = useMemo(() => {
    if (!activeWorkspace) return { total: 0, reviewed: 0, verified: 0 };
    const docs = activeWorkspace.artifacts.filter((a) => a.moduleId !== "export-center");
    return {
      total: docs.length,
      reviewed: docs.filter((a) => a.status === "reviewed").length,
      verified: docs.filter((a) => a.status === "verified").length,
    };
  }, [activeWorkspace]);

  const navTabs: Array<{ id: ClovaiProjectsView; label: string; hint: string; icon: LucideIcon }> = [
    { id: "home", label: "Home", hint: "Dashboard and workspaces", icon: Home },
    { id: "new", label: "New", hint: "Create a workspace", icon: LayoutTemplate },
    { id: "workspace", label: "Workspace", hint: "SDLC editor", icon: FolderKanban },
  ];

  const toggleCustomModule = (id: SdlcModuleId) => {
    if (draftCustomModules.includes(id)) {
      onDraftCustomModulesChange(draftCustomModules.filter((m) => m !== id));
    } else {
      onDraftCustomModulesChange([...draftCustomModules, id]);
    }
  };

  const renderChrome = () => (
    <header className="relative z-[110] flex shrink-0 items-stretch border-b border-border/40 bg-gradient-to-b from-muted/25 to-transparent backdrop-blur-xl">
      <nav className="flex min-w-0 flex-1" role="tablist" aria-label="Clovai Projects views">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const selected =
            tab.id === "workspace"
              ? activeView === "workspace" || activeView === "processing"
              : activeView === tab.id;
          const disabled = tab.id === "workspace" && !activeWorkspace;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={disabled}
              title={tab.hint}
              onClick={() => {
                if (tab.id === "workspace" && activeWorkspace) {
                  onViewChange("workspace");
                  return;
                }
                onViewChange(tab.id);
              }}
              className={cn(
                "group relative flex min-w-0 items-center gap-2 border-b-2 px-4 py-3 transition-all sm:px-5",
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/20 hover:text-foreground",
                disabled && "cursor-not-allowed opacity-40",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  selected ? "bg-primary/12 ring-1 ring-primary/15" : "group-hover:bg-muted/50",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={selected ? 2.25 : 2} />
              </span>
              <span className="truncate text-xs font-semibold tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => onOpenHelp?.()}
        disabled={!onOpenHelp}
        className="flex shrink-0 items-center gap-1.5 border-l border-border/30 px-4 text-xs font-semibold text-muted-foreground transition hover:bg-muted/20 hover:text-foreground disabled:opacity-50 sm:px-5"
      >
        <CircleHelp className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Help</span>
      </button>
    </header>
  );

  const renderHome = () => (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-800 via-slate-900 to-violet-950 p-6 text-white md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(129,140,248,0.25),transparent_34%)]" />
          <div className="relative max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Clovai Projects</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">AI project planning workspace</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
              Upload requirements or describe your idea, select SDLC sections, and review editable documentation with
              diagrams, plans, and export-ready artifacts.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onViewChange("new")}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900"
              >
                <Plus className="h-4 w-4" />
                Create workspace
              </button>
              {workspaces[0] ? (
                <button
                  type="button"
                  onClick={() => onOpenWorkspace(workspaces[0].id)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Open latest
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/40 bg-card shadow-sm">
          <div className="border-b border-border/30 px-5 py-4 md:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Capabilities</p>
            <h2 className="mt-1 text-lg font-semibold">Supported SDLC outputs</h2>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 md:p-6 lg:grid-cols-4">
            {FEATURE_CARDS.map((card) => (
              <div key={card.title} className="rounded-xl border border-border/30 bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border/40 bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border/30 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Dashboard</p>
              <h2 className="mt-1 text-lg font-semibold">Your workspaces</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={workspaceSearch}
                  onChange={(e) => onWorkspaceSearchChange(e.target.value)}
                  placeholder="Search workspaces"
                  className="h-9 w-full rounded-lg border border-border/50 bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/40"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value as typeof statusFilter)}
                className="h-9 rounded-lg border border-border/50 bg-background px-3 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
          <div className="p-5 md:p-6">
            {filteredWorkspaces.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredWorkspaces.map((w) => (
                  <WorkspaceCard key={w.id} workspace={w} onOpen={() => onOpenWorkspace(w.id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/50 bg-muted/10 px-6 py-12 text-center">
                <Layers className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-4 text-sm font-medium text-foreground">No workspaces yet</p>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Create your first workspace to generate requirements, diagrams, and implementation plans.
                </p>
                <button
                  type="button"
                  onClick={() => onViewChange("new")}
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                  New workspace
                </button>
              </div>
            )}
          </div>
        </section>

        {recentWorkspaces.length > 0 ? (
          <section className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-semibold">Recent</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {recentWorkspaces.slice(0, 6).map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => onOpenRecentWorkspace?.(entry)}
                  className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-3 text-left transition hover:border-primary/30 hover:bg-muted/30"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{entry.title}</span>
                    <span className="text-xs text-muted-foreground">{formatTime(entry.openedAt)}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-border/40 bg-card p-5 md:p-6">
          <h2 className="text-lg font-semibold">How it works</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((step, i) => (
              <div key={step} className="rounded-xl border border-border/30 p-4">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/10 px-1.5 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <p className="mt-3 text-sm font-medium">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  const renderNewWorkspace = () => (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-8">
        <h1 className="text-2xl font-bold tracking-tight">New workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload requirements or describe your project, then choose which SDLC sections to generate.
        </p>

        <div className="mt-8 space-y-6">
          <label className="block">
            <span className="text-sm font-semibold">Workspace name</span>
            <input
              value={draftName}
              onChange={(e) => onDraftNameChange(e.target.value)}
              placeholder="e.g. Criminal detection system"
              className="mt-2 h-11 w-full rounded-xl border border-border/50 bg-background px-4 text-sm outline-none focus:border-primary/40"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Project type</span>
            <input
              value={draftProjectType}
              onChange={(e) => onDraftProjectTypeChange(e.target.value)}
              placeholder="Web app, mobile, research, etc."
              className="mt-2 h-11 w-full rounded-xl border border-border/50 bg-background px-4 text-sm outline-none focus:border-primary/40"
            />
          </label>

          <div>
            <span className="text-sm font-semibold">Requirement upload</span>
            <div
              className={cn(
                "mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                draftUploadState === "failed"
                  ? "border-destructive/50 bg-destructive/5"
                  : draftUploadState === "uploaded" || draftUploadState === "selected"
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/50 bg-muted/10",
              )}
            >
              <Upload className="h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium">
                {draftUploadState === "uploading"
                  ? "Uploading…"
                  : draftFileName
                    ? draftFileName
                    : "Drop PDF, DOCX, TXT, or Markdown"}
              </p>
              {draftUploadError ? <p className="mt-2 text-xs text-destructive">{draftUploadError}</p> : null}
              <button
                type="button"
                onClick={onPickFile}
                disabled={draftUploadState === "uploading"}
                className="mt-4 inline-flex h-9 items-center rounded-lg border border-border/50 px-4 text-sm font-semibold transition hover:bg-muted/50"
              >
                Choose file
              </button>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">Requirements (manual)</span>
            <textarea
              value={draftRequirements}
              onChange={(e) => onDraftRequirementsChange(e.target.value)}
              rows={6}
              placeholder="Describe goals, users, constraints, and features…"
              className="mt-2 w-full resize-y rounded-xl border border-border/50 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40"
            />
          </label>

          <div>
            <span className="text-sm font-semibold">SDLC selection</span>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SDLC_SELECTION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onDraftPresetChange(preset.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition",
                    draftPreset === preset.id
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/50 hover:border-primary/25",
                  )}
                >
                  <p className="text-sm font-semibold">{preset.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                </button>
              ))}
            </div>
            {draftPreset === "custom" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {SDLC_MODULES.filter((m) => m.id !== "overview" && m.id !== "export-center").map((mod) => {
                  const selected = draftCustomModules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleCustomModule(mod.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 text-muted-foreground",
                      )}
                    >
                      {selected ? <Check className="h-3 w-3" /> : null}
                      {mod.shortLabel}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div>
            <span className="text-sm font-semibold">Output style</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {OUTPUT_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onDraftOutputStyleChange(style.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                    draftOutputStyle === style.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground",
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onStartGeneration}
            disabled={generationStarting || (!draftRequirements.trim() && !draftFileName)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto sm:px-8"
          >
            {generationStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate workspace
          </button>
        </div>
      </div>
    </div>
  );

  const renderProcessing = () => {
    const pct = Math.min(100, Math.max(0, Math.round(processingProgress)));
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h2 className="mt-6 text-xl font-semibold">Generating your SDLC workspace</h2>
        <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
          {processingMessage ?? "Analyzing requirements and preparing artifacts…"}
        </p>
        <div className="mt-8 w-full max-w-md">
          <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
            <span>Progress</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <ul className="mt-6 space-y-2">
            {processingSteps.map((step, index) => {
              const stepPct = ((index + 1) / processingSteps.length) * 100;
              const done = pct >= stepPct;
              const active = !done && pct >= (index / processingSteps.length) * 100;
              return (
                <li
                  key={step.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                    done && "text-foreground",
                    active && "bg-primary/5 font-medium text-primary",
                    !done && !active && "text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-border/60" />
                  )}
                  {step.label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  };

  const renderWorkspace = () => {
    if (!activeWorkspace) {
      return <ClovaiProjectsWorkspaceShimmer label="Open or create a workspace to continue." />;
    }

    const modDef = selectedArtifactId ? getSdlcModule(selectedArtifactId) : null;
    const isExport = selectedArtifactId === "export-center";
    const isDiagram = Boolean(activeArtifact?.diagramSource);

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-border/40 bg-card/50 px-3 py-2 md:px-4">
          <span className="truncate text-sm font-semibold">{activeWorkspace.name}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            · {reviewProgress.reviewed + reviewProgress.verified}/{reviewProgress.total} reviewed
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
            </span>
            <button
              type="button"
              onClick={onSaveWorkspace}
              className="hidden h-8 rounded-lg border border-border/50 px-3 text-xs font-semibold sm:inline-flex"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => onSelectArtifact("export-center")}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/50 px-3 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {!sidebarCollapsed ? (
            <aside className="hidden w-56 shrink-0 flex-col border-r border-border/40 bg-muted/10 lg:flex">
              <div className="flex items-center justify-between border-b border-border/30 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">SDLC</span>
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted/60"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
              <nav className="min-h-0 flex-1 overflow-y-auto p-2">
                {visibleSidebarModules.map((mod) => {
                  const artifact = activeWorkspace.artifacts.find((a) => a.moduleId === mod.id);
                  const selected = selectedArtifactId === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => onSelectArtifact(mod.id)}
                      className={cn(
                        "mb-1 flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition",
                        selected ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted/50",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        {mod.shortLabel}
                        {artifact ? <ReviewStatusBadge status={artifact.status} /> : null}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-r-lg border border-l-0 border-border/40 bg-card p-2 lg:block"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/30 p-2 lg:hidden">
              {visibleSidebarModules.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => onSelectArtifact(mod.id)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold",
                    selectedArtifactId === mod.id ? "bg-primary text-primary-foreground" : "bg-muted/60",
                  )}
                >
                  {mod.shortLabel}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              {isExport ? (
                <ExportOptionsPanel />
              ) : activeArtifact ? (
                <div className="mx-auto w-full max-w-6xl">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{modDef?.label ?? activeArtifact.title}</h2>
                      <p className="text-xs text-muted-foreground">{modDef?.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={activeArtifact.status}
                        onChange={(e) =>
                          onUpdateArtifactStatus(selectedArtifactId!, e.target.value as ArtifactReviewStatus)
                        }
                        className="h-8 rounded-lg border border-border/50 bg-background px-2 text-xs"
                      >
                        {REVIEW_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/50 px-3 text-xs font-semibold"
                      >
                        <Sparkles className="h-3 w-3" />
                        Regenerate
                      </button>
                    </div>
                  </div>
                  {isDiagram && activeArtifact.diagramSource ? (
                    <DiagramPreview source={activeArtifact.diagramSource} />
                  ) : null}
                  {isDiagram ? (
                    <label className="mt-4 block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Diagram source
                      </span>
                      <textarea
                        value={activeArtifact.diagramSource ?? ""}
                        onChange={(e) => onUpdateArtifactDiagram(selectedArtifactId!, e.target.value)}
                        rows={10}
                        className="mt-2 w-full resize-y rounded-xl border border-border/50 bg-background p-3 font-mono text-xs"
                      />
                    </label>
                  ) : (
                    <ArtifactMarkdownEditor
                      value={activeArtifact.content}
                      onChange={(content) => onUpdateArtifactContent(selectedArtifactId!, content)}
                    />
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a section from the sidebar.</p>
              )}
            </div>
          </main>

          {assistOpen ? (
            <aside className="hidden w-72 shrink-0 flex-col border-l border-border/40 bg-card/30 md:flex">
              <div className="flex items-center justify-between border-b border-border/30 px-2 py-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setAssistOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted/60"
                  aria-label="Close assistant"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
              </div>
              <AiAssistantPanel artifactTitle={modDef?.label ?? "section"} />
            </aside>
          ) : (
            <button
              type="button"
              onClick={() => setAssistOpen(true)}
              className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-l-lg border border-r-0 border-border/40 bg-card p-2 md:block"
              aria-label="Open assistant"
            >
              <PanelRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {renderChrome()}
      {activeView === "home" ? renderHome() : null}
      {activeView === "new" ? renderNewWorkspace() : null}
      {activeView === "processing" ? renderProcessing() : null}
      {activeView === "workspace" ? renderWorkspace() : null}
    </div>
  );
}

export const CLOVAI_PROJECTS_PROCESSING_STEPS = PROCESSING_STEPS;
