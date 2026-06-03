"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Layers,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Search,
  X,
} from "lucide-react";
import {
  PROJECT_PLANNING_ARTIFACT_COUNT,
  PROJECT_PLANNING_PHASES,
  getAdjacentPlanningArtifact,
  getDefaultPlanningPhaseId,
  getPlanningArtifact,
  getPlanningArtifactPosition,
  getPhaseStepNumber,
  searchPlanningCatalog,
  type PlanningArtifact,
  type PlanningPhase,
} from "./project-planning-catalog";
import {
  DashboardButton,
  DashboardContentFrame,
  DashboardMetric,
  DashboardPanel,
  DashboardPhaseCard,
  DashboardProgress,
  DashboardSectionTitle,
  DashboardTab,
  SegmentedTabList,
  StatusBadge,
  FORMAT_LABELS,
  studioMono,
  studioSurfaces,
  cn,
} from "./project-planning-dashboard-ui";
import {
  PlanningDeliverableWorksheet,
  createDefaultWorksheetContent,
  getWorksheetTitle,
  type PlanningWorksheetContent,
  type WorksheetTextSelection,
} from "./project-planning-worksheet";
import { PlanningWorksheetToolsPanel } from "./project-planning-worksheet-tools";
import {
  buildCriminalDetectionProjectDocument,
  type ProjectPlanningDocument,
} from "./project-planning-document";
import {
  applyDocumentToWorkspaceState,
  buildDocumentFromWorkspace,
} from "./project-planning-resolve";

export type ProjectPlanningPersistence = {
  loadProject: (projectId: string) => Promise<ProjectPlanningDocument>;
  saveProject: (document: ProjectPlanningDocument) => Promise<void>;
};

export type ProjectPlanningDeliverableChatProps = {
  projectId: string;
  projectName: string;
  projectSummary: string;
  phase: PlanningPhase;
  artifact: PlanningArtifact;
  worksheet: PlanningWorksheetContent;
  onWorksheetChange: (content: PlanningWorksheetContent) => void;
  onClose: () => void;
  textSelection?: WorksheetTextSelection | null;
};

type WorkspaceMode = "overview" | "workspace";

type ProjectPlanningWorkspaceProps = {
  embedded?: boolean;
  projectId?: string;
  persistence?: ProjectPlanningPersistence;
  renderDeliverableChat?: (props: ProjectPlanningDeliverableChatProps) => ReactNode;
  /** When the host opens a new project tab, start in workspace (not dashboard overview). */
  initialMode?: WorkspaceMode;
  workspaceSessionKey?: number | string;
};

const SAVE_DEBOUNCE_MS = 600;

function computeDashboardStats(phases: PlanningPhase[], reviewedIds: Set<string>) {
  let phasesComplete = 0;
  let phasesStarted = 0;
  for (const phase of phases) {
    const reviewedInPhase = phase.artifacts.filter((a) => reviewedIds.has(a.id)).length;
    if (reviewedInPhase === phase.artifacts.length && phase.artifacts.length > 0) {
      phasesComplete += 1;
    }
    if (reviewedInPhase > 0) phasesStarted += 1;
  }
  return { phasesComplete, phasesStarted };
}

type PlanningDashboardShellProps = {
  mode: WorkspaceMode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSetOverview: () => void;
  onSetWorkspace: () => void;
  stageRail?: ReactNode;
  children: ReactNode;
};

function PlanningDashboardShell({
  mode,
  searchQuery,
  onSearchChange,
  onSetOverview,
  onSetWorkspace,
  stageRail,
  children,
}: PlanningDashboardShellProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", studioSurfaces.page)}>
      <header className="shrink-0 border-b border-border/50 bg-card">
        <div className="flex flex-wrap items-center gap-3 px-5 py-2.5 md:gap-4">
          <SegmentedTabList aria-label="Program views">
            <DashboardTab active={mode === "overview"} onClick={onSetOverview}>
              <LayoutDashboard
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  mode === "overview" ? "text-foreground" : "text-muted-foreground",
                )}
                strokeWidth={mode === "overview" ? 2.25 : 2}
              />
              <span>Dashboard</span>
            </DashboardTab>
            <DashboardTab active={mode === "workspace"} onClick={onSetWorkspace}>
              <Layers
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  mode === "workspace" ? "text-foreground" : "text-muted-foreground",
                )}
                strokeWidth={mode === "workspace" ? 2.25 : 2}
              />
              <span>Workspace</span>
            </DashboardTab>
          </SegmentedTabList>

          <div className="relative ml-auto w-full min-w-[12rem] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search deliverables…"
              className={cn(studioSurfaces.input, "w-full pl-9 pr-8 text-xs")}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "flex items-center px-5",
            stageRail ? "min-h-10 py-1.5" : "min-h-9 py-2",
            studioSurfaces.mutedStrip,
          )}
        >
          {stageRail ?? (
            <p className="text-xs text-muted-foreground">No phases match your search.</p>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

type PhaseStageRailProps = {
  phases: Array<{ phase: PlanningPhase; artifacts: PlanningArtifact[] }>;
  activePhaseId: string;
  reviewedIds: Set<string>;
  onSelectPhase: (phaseId: string) => void;
};

function PhaseStageRail({
  phases,
  activePhaseId,
  reviewedIds,
  onSelectPhase,
}: PhaseStageRailProps) {
  const activeEntry = phases.find(({ phase }) => phase.id === activePhaseId);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:block">
        Stages
      </span>

      <SegmentedTabList
        aria-label="Planning program stages"
        className="min-w-0 flex-1"
      >
        {phases.map(({ phase, artifacts }) => {
          const step = getPhaseStepNumber(phase.id);
          const selected = phase.id === activePhaseId;
          const reviewedInPhase = artifacts.filter((a) => reviewedIds.has(a.id)).length;
          const complete =
            artifacts.length > 0 && reviewedInPhase === artifacts.length;

          return (
            <button
              key={phase.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-current={selected ? "step" : undefined}
              onClick={() => onSelectPhase(phase.id)}
              title={`Stage ${step}: ${phase.label} — ${reviewedInPhase}/${artifacts.length} reviewed`}
              className={cn(
                "inline-flex h-8 max-w-[7.5rem] shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all duration-200 sm:max-w-[8.5rem]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                selected
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold tabular-nums",
                  selected || complete
                    ? cn(studioMono.accent)
                    : "border border-border/80 bg-background text-muted-foreground",
                )}
              >
                {complete && !selected ? (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                ) : (
                  step
                )}
              </span>
              <span className="min-w-0 truncate">{phase.label}</span>
            </button>
          );
        })}
      </SegmentedTabList>

      {activeEntry ? (
        <p
          className="hidden shrink-0 truncate text-[10px] text-muted-foreground lg:block lg:max-w-[10rem] xl:max-w-[12rem]"
          title={activeEntry.phase.label}
        >
          <span className="font-medium text-foreground">
            {getPhaseStepNumber(activeEntry.phase.id)}/{phases.length}
          </span>
          <span className="mx-1 text-border">·</span>
          <span className="truncate">{activeEntry.phase.label}</span>
        </p>
      ) : null}
    </div>
  );
}

type PlanningOverviewDashboardProps = {
  catalogPhases: PlanningPhase[];
  reviewedIds: Set<string>;
  onSelectPhase: (phaseId: string) => void;
  searchQuery: string;
};

function PlanningOverviewDashboard({
  catalogPhases,
  reviewedIds,
  onSelectPhase,
  searchQuery,
}: PlanningOverviewDashboardProps) {
  const { phases } = useMemo(
    () => searchPlanningCatalog(searchQuery, catalogPhases),
    [catalogPhases, searchQuery],
  );
  const stats = useMemo(
    () => computeDashboardStats(catalogPhases, reviewedIds),
    [catalogPhases, reviewedIds],
  );
  const artifactCount = catalogPhases.flatMap((p) => p.artifacts).length;

  return (
    <DashboardContentFrame>
        <DashboardSectionTitle
          eyebrow="Program dashboard"
          title="Planning progress"
          description="Track completion across all phases. Open any phase to review its deliverable steps in the workspace."
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardMetric
            label="Deliverables reviewed"
            value={`${reviewedIds.size}/${artifactCount}`}
            hint="Across the full catalog"
          />
          <DashboardMetric
            label="Phases complete"
            value={stats.phasesComplete}
            hint={`of ${catalogPhases.length} phases`}
          />
          <DashboardMetric
            label="Phases in progress"
            value={stats.phasesStarted - stats.phasesComplete}
            hint="At least one item reviewed"
          />
          <DashboardMetric
            label="Remaining"
            value={artifactCount - reviewedIds.size}
            hint="Deliverables not yet reviewed"
          />
        </div>

        <div className="mt-4">
          <DashboardPanel>
            <DashboardProgress
              label="Overall completion"
              reviewed={reviewedIds.size}
              total={PROJECT_PLANNING_ARTIFACT_COUNT}
            />
          </DashboardPanel>
        </div>

        <div className="mt-8">
          <DashboardSectionTitle
            eyebrow="Roadmap"
            title="Phase roadmap"
            description="Each card represents a phase in your planning hierarchy. Select one to open its deliverable steps."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {phases.map(({ phase, artifacts }) => {
              const reviewedInPhase = artifacts.filter((a) => reviewedIds.has(a.id)).length;
              const complete =
                artifacts.length > 0 && reviewedInPhase === artifacts.length;
              return (
                <DashboardPhaseCard
                  key={phase.id}
                  step={getPhaseStepNumber(phase.id)}
                  phaseLabel={phase.label}
                  icon={phase.icon}
                  itemCount={artifacts.length}
                  reviewedCount={reviewedInPhase}
                  complete={complete}
                  onOpen={() => onSelectPhase(phase.id)}
                />
              );
            })}
          </div>
        </div>
    </DashboardContentFrame>
  );
}

type PlanningItemStepListProps = {
  phase: PlanningPhase;
  artifacts: PlanningArtifact[];
  activeArtifactId: string | null;
  reviewedIds: Set<string>;
  collapsed: boolean;
  stepLabel: (artifact: PlanningArtifact) => string;
  onToggleCollapsed: () => void;
  onSelectArtifact: (artifactId: string) => void;
  onToggleReviewed: (artifactId: string) => void;
};

function PlanningItemStepList({
  phase,
  artifacts,
  activeArtifactId,
  reviewedIds,
  collapsed,
  stepLabel,
  onToggleCollapsed,
  onSelectArtifact,
  onToggleReviewed,
}: PlanningItemStepListProps) {
  const phaseStep = getPhaseStepNumber(phase.id);
  const reviewedInPhase = artifacts.filter((a) => reviewedIds.has(a.id)).length;

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col border-r border-border/50 bg-card transition-[width] duration-200",
        collapsed ? "hidden w-0 overflow-hidden lg:flex lg:w-11" : "w-full lg:w-52 xl:w-60",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 border-b border-border/50",
          collapsed ? "justify-center px-1 py-1.5" : "items-start justify-between gap-1.5 px-3 py-2.5",
        )}
      >
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Steps
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{phase.label}</p>
            <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
              P{phaseStep} · {reviewedInPhase}/{artifacts.length}
            </p>
            <div className="mt-2">
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", studioMono.progress)}
                  style={{
                    width: `${
                      artifacts.length > 0
                        ? Math.round((reviewedInPhase / artifacts.length) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand steps" : "Collapse steps"}
          aria-label={collapsed ? "Expand steps" : "Collapse steps"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
        >
          {collapsed ? (
            <PanelLeft className="h-3.5 w-3.5" />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <ol
        className={cn("min-h-0 flex-1 overflow-y-auto", collapsed ? "px-0.5 py-1" : "px-1.5 py-1.5")}
        aria-label={`Steps in ${phase.label}`}
      >
        {artifacts.map((artifact, index) => {
          const reviewed = reviewedIds.has(artifact.id);
          const active = artifact.id === activeArtifactId;

          return (
            <li key={artifact.id} className="mb-0.5">
              <div
                className={cn(
                  "flex rounded-md border transition-colors",
                  collapsed ? "justify-center border-transparent p-0.5" : "gap-0.5 border-transparent",
                  !collapsed &&
                    active &&
                    "border-border/60 bg-background shadow-sm ring-1 ring-border/50",
                  !collapsed && !active && "hover:bg-muted/40",
                )}
              >
                {collapsed ? (
                  <button
                    type="button"
                    onClick={() => onSelectArtifact(artifact.id)}
                    title={`${index + 1}. ${stepLabel(artifact)}`}
                    className="py-1"
                  >
                    {reviewed ? (
                      <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", studioMono.accent)}>
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-bold",
                          active
                            ? "border-foreground text-foreground"
                            : "border-muted-foreground/30 text-muted-foreground",
                        )}
                      >
                        {index + 1}
                      </span>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onToggleReviewed(artifact.id)}
                      className="flex w-7 shrink-0 items-center justify-center"
                      aria-label={reviewed ? "Mark not reviewed" : "Mark reviewed"}
                    >
                      {reviewed ? (
                        <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", studioMono.accent)}>
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/35 text-[9px] font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectArtifact(artifact.id)}
                      className="min-w-0 flex-1 py-1.5 pr-1.5 text-left"
                    >
                      <span className="block truncate text-[11px] font-medium leading-tight text-foreground">
                        {stepLabel(artifact)}
                      </span>
                      <span className="mt-0.5 block truncate text-[9px] capitalize text-muted-foreground">
                        {FORMAT_LABELS[artifact.format]}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

type PlanningWorkspaceRightPanelProps = {
  phase: PlanningPhase;
  artifacts: PlanningArtifact[];
  artifact: PlanningArtifact | undefined;
  position: NonNullable<ReturnType<typeof getPlanningArtifactPosition>> | undefined;
  worksheetTitle: string;
  reviewed: boolean;
  reviewedIds: Set<string>;
  worksheet: PlanningWorksheetContent | undefined;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectArtifact: (artifactId: string) => void;
  onWorksheetChange: (content: PlanningWorksheetContent) => void;
  renderDeliverableChat?: (props: ProjectPlanningDeliverableChatProps) => ReactNode;
  projectId: string;
  projectName: string;
  projectSummary: string;
  textSelection: WorksheetTextSelection | null;
  onTextSelectionChange: (selection: WorksheetTextSelection | null) => void;
};

function PlanningWorkspaceRightPanel({
  phase,
  artifacts,
  artifact,
  position,
  worksheetTitle,
  reviewed,
  reviewedIds,
  worksheet,
  collapsed,
  onToggleCollapsed,
  onSelectArtifact,
  onWorksheetChange,
  renderDeliverableChat,
  projectId,
  projectName,
  projectSummary,
  textSelection,
  onTextSelectionChange,
}: PlanningWorkspaceRightPanelProps) {
  const [rightPanelMode, setRightPanelMode] = useState<"tools" | "chat">("tools");
  const phaseStep = getPhaseStepNumber(phase.id);
  const reviewedInPhase = artifacts.filter((a) => reviewedIds.has(a.id)).length;

  useEffect(() => {
    setRightPanelMode("tools");
  }, [artifact?.id]);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col border-l border-border/50 bg-card transition-[width] duration-200",
        collapsed ? "hidden w-0 overflow-hidden lg:flex lg:w-14" : "w-full lg:w-56 xl:w-72",
      )}
      aria-label="Worksheet tools and details"
    >
      <div
        className={cn(
          "flex shrink-0 border-b border-border/50",
          collapsed ? "justify-center px-1 py-1.5" : "items-start justify-between gap-1.5 px-3 py-2.5",
        )}
      >
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Panel
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-foreground">
              {artifact ? worksheetTitle : phase.label}
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand panel" : "Collapse panel"}
          aria-label={collapsed ? "Expand panel" : "Collapse panel"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
        >
          {collapsed ? (
            <PanelRight className="h-3.5 w-3.5" />
          ) : (
            <PanelRightClose className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {collapsed && artifact && worksheet ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <PlanningWorksheetToolsPanel
            artifact={artifact}
            content={worksheet}
            collapsed
            selection={textSelection}
            onChange={onWorksheetChange}
            onOpenAiChat={
              renderDeliverableChat
                ? () => {
                    onToggleCollapsed();
                    setRightPanelMode("chat");
                  }
                : undefined
            }
          />
        </div>
      ) : null}

      {!collapsed ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {artifact && worksheet && renderDeliverableChat ? (
            <div className="flex shrink-0 gap-1 border-b border-border/40 px-2 py-1.5">
              <button
                type="button"
                onClick={() => setRightPanelMode("tools")}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                  rightPanelMode === "tools"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                Tools
              </button>
              <button
                type="button"
                onClick={() => setRightPanelMode("chat")}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                  rightPanelMode === "chat"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                AI
              </button>
            </div>
          ) : null}

          {rightPanelMode === "chat" &&
          artifact &&
          worksheet &&
          renderDeliverableChat ? (
            <div className="flex min-h-0 flex-1 flex-col">
              {renderDeliverableChat({
                projectId,
                projectName,
                projectSummary,
                phase,
                artifact,
                worksheet,
                onWorksheetChange,
                textSelection,
                onClose: () => setRightPanelMode("tools"),
              })}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {artifact && position && worksheet ? (
                <PlanningWorksheetToolsPanel
                  artifact={artifact}
                  content={worksheet}
                  selection={textSelection}
                  onChange={onWorksheetChange}
                  onOpenAiChat={
                    renderDeliverableChat ? () => setRightPanelMode("chat") : undefined
                  }
                />
              ) : null}

              {artifact && position ? (
            <div className={cn("space-y-5", worksheet ? "mt-5 border-t border-border/40 pt-5" : "")}>
              <DashboardPanel className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Deliverable
                </p>
                <p className="mt-2 text-sm font-semibold leading-snug text-foreground">{worksheetTitle}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusBadge variant="muted">{FORMAT_LABELS[artifact.format]}</StatusBadge>
                  <StatusBadge variant={reviewed ? "success" : "muted"}>
                    {reviewed ? "Reviewed" : "In progress"}
                  </StatusBadge>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{artifact.description}</p>
              </DashboardPanel>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Position
                </p>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border border-border/40 bg-muted/15 px-2.5 py-2">
                    <dt className="text-muted-foreground">Step</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                      {position.itemNumber} / {position.itemsInPhase}
                    </dd>
                  </div>
                  <div className="rounded-md border border-border/40 bg-muted/15 px-2.5 py-2">
                    <dt className="text-muted-foreground">Phase</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                      P{position.phaseStep} / {position.phaseCount}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Select a step to view deliverable details.</p>
          )}

          <div className="mt-6 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Phase · P{phaseStep}
            </p>
            <p className="text-xs font-medium text-foreground">{phase.label}</p>
            <DashboardProgress
              label="Steps reviewed"
              reviewed={reviewedInPhase}
              total={artifacts.length}
              className="pt-1"
            />
          </div>

          <div className="mt-6">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Steps in phase
            </p>
            <ul className="space-y-0.5">
              {artifacts.map((item, index) => {
                const itemReviewed = reviewedIds.has(item.id);
                const active = artifact?.id === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectArtifact(item.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors",
                        active
                          ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border/50"
                          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                          itemReviewed
                            ? studioMono.accent
                            : "border border-muted-foreground/35",
                        )}
                      >
                        {itemReviewed ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
            </div>
          )}
        </div>
      ) : null}
    </aside>
  );
}

type PlanningStepDetailProps = {
  artifact: PlanningArtifact;
  position: NonNullable<ReturnType<typeof getPlanningArtifactPosition>>;
  worksheet: PlanningWorksheetContent;
  reviewed: boolean;
  stepsSidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  onExpandStepsSidebar: () => void;
  onExpandRightPanel: () => void;
  onToggleReviewed: () => void;
  onSelectArtifact: (artifactId: string) => void;
  onWorksheetChange: (content: PlanningWorksheetContent) => void;
  textSelection: WorksheetTextSelection | null;
  onTextSelectionChange: (selection: WorksheetTextSelection | null) => void;
};

function PlanningStepDetail({
  artifact,
  position,
  worksheet,
  reviewed,
  catalogPhases,
  stepsSidebarCollapsed,
  rightPanelCollapsed,
  onExpandStepsSidebar,
  onExpandRightPanel,
  onToggleReviewed,
  onSelectArtifact,
  onWorksheetChange,
  textSelection,
  onTextSelectionChange,
}: PlanningStepDetailProps & { catalogPhases: PlanningPhase[] }) {
  const prev = getAdjacentPlanningArtifact(artifact.id, "prev", catalogPhases);
  const next = getAdjacentPlanningArtifact(artifact.id, "next", catalogPhases);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/40 px-5 py-3 md:px-8">
        {stepsSidebarCollapsed ? (
          <button
            type="button"
            onClick={onExpandStepsSidebar}
            aria-label="Show steps"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 lg:hidden"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        ) : null}
        {rightPanelCollapsed ? (
          <button
            type="button"
            onClick={onExpandRightPanel}
            aria-label="Show details"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 lg:hidden"
          >
            <PanelRight className="h-4 w-4" />
          </button>
        ) : null}
        <StatusBadge variant="muted">
          Step {position.itemNumber} of {position.itemsInPhase}
        </StatusBadge>
        <StatusBadge variant="muted">
          Phase {position.phaseStep} / {position.phaseCount}
        </StatusBadge>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 md:px-10 md:py-10">
        <PlanningDeliverableWorksheet
          content={worksheet}
          onChange={onWorksheetChange}
          selection={textSelection}
          onSelectionChange={onTextSelectionChange}
        />
      </div>

      <div className="shrink-0 border-t border-border/50 bg-card px-5 py-4 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <DashboardButton disabled={!prev} onClick={() => prev && onSelectArtifact(prev.id)}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </DashboardButton>
            <DashboardButton disabled={!next} onClick={() => next && onSelectArtifact(next.id)}>
              Next
              <ChevronRight className="h-4 w-4" />
            </DashboardButton>
          </div>
          <DashboardButton
            variant={reviewed ? "primary" : "secondary"}
            onClick={onToggleReviewed}
            className="shrink-0"
          >
            {reviewed ? (
              <>
                <Check className="h-4 w-4" />
                Reviewed
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                Mark reviewed
              </>
            )}
          </DashboardButton>
        </div>
      </div>
    </div>
  );
}

export function ProjectPlanningWorkspace({
  embedded = true,
  projectId,
  persistence,
  renderDeliverableChat,
  initialMode = "overview",
  workspaceSessionKey = 0,
}: ProjectPlanningWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const [baseDocument, setBaseDocument] = useState<ProjectPlanningDocument>(() =>
    buildCriminalDetectionProjectDocument(),
  );
  const [catalogPhases, setCatalogPhases] = useState<PlanningPhase[]>(() =>
    applyDocumentToWorkspaceState(buildCriminalDetectionProjectDocument()).phases,
  );
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activePhaseId, setActivePhaseId] = useState(getDefaultPlanningPhaseId);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => new Set());
  const [stepsSidebarCollapsed, setStepsSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [textSelection, setTextSelection] = useState<WorksheetTextSelection | null>(null);
  const [worksheetByArtifactId, setWorksheetByArtifactId] = useState<
    Record<string, PlanningWorksheetContent>
  >({});
  const skipNextSaveRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getWorksheetForArtifact = useCallback(
    (artifact: PlanningArtifact): PlanningWorksheetContent => {
      return (
        worksheetByArtifactId[artifact.id] ?? createDefaultWorksheetContent(artifact)
      );
    },
    [worksheetByArtifactId],
  );

  const updateWorksheet = useCallback(
    (artifactId: string, content: PlanningWorksheetContent) => {
      setWorksheetByArtifactId((current) => ({ ...current, [artifactId]: content }));
    },
    [],
  );

  const stepLabel = useCallback(
    (artifact: PlanningArtifact) => getWorksheetTitle(getWorksheetForArtifact(artifact), artifact.label),
    [getWorksheetForArtifact],
  );

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, workspaceSessionKey]);

  useEffect(() => {
    if (!projectId || !persistence) {
      const seed = buildCriminalDetectionProjectDocument();
      const applied = applyDocumentToWorkspaceState(seed);
      setBaseDocument(seed);
      setCatalogPhases(applied.phases);
      setReviewedIds(applied.reviewedIds);
      setActivePhaseId(applied.activePhaseId);
      setActiveArtifactId(applied.activeArtifactId);
      setWorksheetByArtifactId(applied.worksheetsByArtifactId);
      setLoadState("ready");
      skipNextSaveRef.current = true;
      return;
    }

    let cancelled = false;
    setLoadState("loading");
    void persistence
      .loadProject(projectId)
      .then((document) => {
        if (cancelled) return;
        const applied = applyDocumentToWorkspaceState(document);
        setBaseDocument(document);
        setCatalogPhases(applied.phases);
        setReviewedIds(applied.reviewedIds);
        setActivePhaseId(applied.activePhaseId);
        setActiveArtifactId(applied.activeArtifactId);
        setWorksheetByArtifactId(applied.worksheetsByArtifactId);
        setLoadState("ready");
        skipNextSaveRef.current = true;
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = buildCriminalDetectionProjectDocument();
        const applied = applyDocumentToWorkspaceState(fallback);
        setBaseDocument(fallback);
        setCatalogPhases(applied.phases);
        setReviewedIds(applied.reviewedIds);
        setActivePhaseId(applied.activePhaseId);
        setActiveArtifactId(applied.activeArtifactId);
        setWorksheetByArtifactId(applied.worksheetsByArtifactId);
        setLoadState("error");
        skipNextSaveRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [persistence, projectId, workspaceSessionKey]);

  useEffect(() => {
    if (!persistence || !projectId || loadState !== "ready") return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("saving");
    saveTimerRef.current = setTimeout(() => {
      const document = buildDocumentFromWorkspace(baseDocument, {
        phases: catalogPhases,
        reviewedIds,
        activePhaseId,
        activeArtifactId,
        worksheetsByArtifactId: worksheetByArtifactId,
      });
      void persistence
        .saveProject(document)
        .then(() => {
          setBaseDocument(document);
          setSaveState("saved");
        })
        .catch(() => setSaveState("error"));
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    activeArtifactId,
    activePhaseId,
    baseDocument,
    catalogPhases,
    loadState,
    persistence,
    projectId,
    reviewedIds,
    worksheetByArtifactId,
  ]);

  const searchResult = useMemo(
    () => searchPlanningCatalog(searchQuery, catalogPhases),
    [catalogPhases, searchQuery],
  );

  const activePhaseEntry = useMemo(() => {
    return (
      searchResult.phases.find((entry) => entry.phase.id === activePhaseId) ??
      searchResult.phases[0]
    );
  }, [activePhaseId, searchResult.phases]);

  useEffect(() => {
    if (!activePhaseEntry && searchResult.phases[0]) {
      setActivePhaseId(searchResult.phases[0].phase.id);
    }
  }, [activePhaseEntry, searchResult.phases]);

  const activePhase = activePhaseEntry?.phase;
  const activeArtifacts = activePhaseEntry?.artifacts ?? [];

  useEffect(() => {
    if (mode !== "workspace" || activeArtifacts.length === 0) return;
    const stillVisible = activeArtifacts.some((a) => a.id === activeArtifactId);
    if (!stillVisible) setActiveArtifactId(activeArtifacts[0]?.id ?? null);
  }, [activeArtifactId, activeArtifacts, mode]);

  useEffect(() => {
    setTextSelection(null);
  }, [activeArtifactId]);

  const selectedArtifact = activeArtifactId
    ? getPlanningArtifact(activeArtifactId, catalogPhases)
    : undefined;
  const selectedPosition = activeArtifactId
    ? getPlanningArtifactPosition(activeArtifactId, catalogPhases)
    : undefined;

  const enterWorkspace = useCallback(
    (phaseId: string, artifactId?: string | null) => {
      setActivePhaseId(phaseId);
      setMode("workspace");
      const entry = searchResult.phases.find((p) => p.phase.id === phaseId);
      const artifacts = entry?.artifacts ?? [];
      const nextArtifact =
        artifactId && artifacts.some((a) => a.id === artifactId)
          ? artifactId
          : (artifacts[0]?.id ?? null);
      setActiveArtifactId(nextArtifact);
    },
    [searchResult.phases],
  );

  const selectPhase = useCallback(
    (phaseId: string) => enterWorkspace(phaseId),
    [enterWorkspace],
  );

  const selectArtifact = useCallback(
    (artifactId: string) => {
      const artifact = getPlanningArtifact(artifactId, catalogPhases);
      if (artifact) enterWorkspace(artifact.phaseId, artifactId);
    },
    [catalogPhases, enterWorkspace],
  );

  const toggleReviewed = useCallback((artifactId: string) => {
    setReviewedIds((current) => {
      const next = new Set(current);
      if (next.has(artifactId)) next.delete(artifactId);
      else next.add(artifactId);
      return next;
    });
  }, []);

  const shellClass = embedded ? "h-full min-h-0" : "min-h-[28rem] rounded-xl border border-border/60 overflow-hidden";

  const workspaceBody =
    loadState === "loading" ? (
      <p className="p-8 text-sm text-muted-foreground">Loading project data…</p>
    ) : mode === "overview" ? (
      <PlanningOverviewDashboard
        catalogPhases={catalogPhases}
        reviewedIds={reviewedIds}
        onSelectPhase={selectPhase}
        searchQuery={searchQuery}
      />
    ) : searchResult.phases.length === 0 ? (
      <p className="p-8 text-sm text-muted-foreground">No deliverables match your search.</p>
    ) : !activePhase ? (
      <p className="p-8 text-sm text-muted-foreground">Select a phase to begin.</p>
    ) : (
      <div className="relative flex h-full min-h-0 flex-col lg:flex-row">
        <PlanningItemStepList
          phase={activePhase}
          artifacts={activeArtifacts}
          activeArtifactId={activeArtifactId}
          reviewedIds={reviewedIds}
          collapsed={stepsSidebarCollapsed}
          stepLabel={stepLabel}
          onToggleCollapsed={() => setStepsSidebarCollapsed((c) => !c)}
          onSelectArtifact={selectArtifact}
          onToggleReviewed={toggleReviewed}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
          <main className="min-h-0 min-w-0 flex-1">
            {selectedArtifact && selectedPosition ? (
              <PlanningStepDetail
                artifact={selectedArtifact}
                position={selectedPosition}
                catalogPhases={catalogPhases}
                worksheet={getWorksheetForArtifact(selectedArtifact)}
                reviewed={reviewedIds.has(selectedArtifact.id)}
                stepsSidebarCollapsed={stepsSidebarCollapsed}
                rightPanelCollapsed={rightPanelCollapsed}
                onExpandStepsSidebar={() => setStepsSidebarCollapsed(false)}
                onExpandRightPanel={() => setRightPanelCollapsed(false)}
                onToggleReviewed={() => toggleReviewed(selectedArtifact.id)}
                onSelectArtifact={selectArtifact}
                onWorksheetChange={(content) => updateWorksheet(selectedArtifact.id, content)}
                textSelection={textSelection}
                onTextSelectionChange={setTextSelection}
              />
            ) : (
              <p className="p-8 text-sm text-muted-foreground">Select a deliverable step.</p>
            )}
          </main>
          <PlanningWorkspaceRightPanel
            phase={activePhase}
            artifacts={activeArtifacts}
            artifact={selectedArtifact}
            position={selectedPosition}
            worksheetTitle={
              selectedArtifact
                ? getWorksheetTitle(getWorksheetForArtifact(selectedArtifact), selectedArtifact.label)
                : activePhase.label
            }
            reviewed={selectedArtifact ? reviewedIds.has(selectedArtifact.id) : false}
            reviewedIds={reviewedIds}
            worksheet={
              selectedArtifact ? getWorksheetForArtifact(selectedArtifact) : undefined
            }
            collapsed={rightPanelCollapsed}
            onToggleCollapsed={() => setRightPanelCollapsed((c) => !c)}
            onSelectArtifact={selectArtifact}
            onWorksheetChange={(content) => {
              if (selectedArtifact) updateWorksheet(selectedArtifact.id, content);
            }}
            renderDeliverableChat={renderDeliverableChat}
            projectId={projectId ?? baseDocument.id}
            projectName={baseDocument.name}
            projectSummary={baseDocument.summary}
            textSelection={textSelection}
            onTextSelectionChange={setTextSelection}
          />
        </div>
      </div>
    );

  return (
    <div className={shellClass}>
      <PlanningDashboardShell
        mode={mode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSetOverview={() => setMode("overview")}
        onSetWorkspace={() => {
          setMode("workspace");
          if (!activeArtifactId && activeArtifacts[0]) {
            setActiveArtifactId(activeArtifacts[0].id);
          }
        }}
        stageRail={
          <div className="flex w-full items-center justify-between gap-3">
            {searchResult.phases.length > 0 ? (
              <PhaseStageRail
                phases={searchResult.phases}
                activePhaseId={activePhaseId}
                reviewedIds={reviewedIds}
                onSelectPhase={selectPhase}
              />
            ) : (
              <span className="text-xs text-muted-foreground">No phases match search.</span>
            )}
            <div className="shrink-0 text-right">
              <p className="truncate text-xs font-semibold text-foreground">{baseDocument.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {baseDocument.stack.backend} · {baseDocument.stack.mobile}
                {saveState === "saving"
                  ? " · Saving…"
                  : saveState === "saved"
                    ? " · Saved"
                    : saveState === "error"
                      ? " · Save failed"
                      : null}
              </p>
            </div>
          </div>
        }
      >
        {workspaceBody}
      </PlanningDashboardShell>
    </div>
  );
}
