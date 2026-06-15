"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  FileCode2,
  GitBranch,
  Grid3x3,
  Loader2,
  Sparkles,
  Table2,
  type LucideIcon,
} from "lucide-react";

import { PlatformBackdrop } from "@/components/platform/platform-parts";
import { WorkspaceResizeHandle } from "@/components/workspace/workspace-resize";
import {
  getDefaultSynopsisSectionId,
  getSynopsisSection,
  PLAN_STARTER_TEMPLATES,
  PROJECT_SYNOPSIS_SECTIONS,
  type SynopsisDeliverable,
  type SynopsisDeliverableFormat,
  type SynopsisSection,
} from "@/lib/plan-synopsis-catalog";
import type { RecentStudioPlan } from "@/lib/studio-recent-plans";
import { studioWithPhase } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { StudioRecentList } from "@/components/studio/studio-recent-list";

export type SynopsisSectionStatus = "empty" | "draft" | "complete";

const OUTLINE_PANEL_DEFAULT_WIDTH = 300;
const OUTLINE_PANEL_MIN_WIDTH = 240;
const OUTLINE_PANEL_MAX_WIDTH = 480;

const ASSIST_PANEL_DEFAULT_WIDTH = 320;
const ASSIST_PANEL_MIN_WIDTH = 280;
const ASSIST_PANEL_MAX_WIDTH = 520;

function formatIconForDeliverable(format: SynopsisDeliverableFormat): LucideIcon {
  if (format === "diagram") return GitBranch;
  if (format === "matrix") return Table2;
  return FileCode2;
}

function PlanHomeComposer({
  prompt,
  onPromptChange,
  onSubmit,
  disabled,
  running,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  running: boolean;
}) {
  const canSubmit = prompt.trim().length > 0 && !disabled;

  return (
    <div className="platform-home-panel overflow-hidden">
      <textarea
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Describe the project you want to plan — goals, users, constraints, and tech preferences…"
        rows={4}
        disabled={disabled}
        className="block w-full resize-none bg-transparent px-5 pb-2 pt-4 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 md:min-h-[6.5rem] md:text-base"
      />
      <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
        <p className="text-[12px] text-muted-foreground">
          Generates a full project synopsis with documents, diagrams, and matrices.
        </p>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-all",
            canSubmit
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          {running ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Planning…
            </>
          ) : (
            <>
              Create synopsis
              <ArrowUp className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function PlanIdleHero({
  prompt,
  onPromptChange,
  onSubmit,
  running,
  onTemplateSelect,
  recentPlans = [],
  onOpenRecentPlan,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  running: boolean;
  onTemplateSelect: (prompt: string) => void;
  recentPlans?: RecentStudioPlan[];
  onOpenRecentPlan?: (planId: string) => void;
}) {
  const reduceMotion = useReducedMotion();

  const recentItems = recentPlans.map((plan) => ({
    id: plan.id,
    title: plan.title,
    openedAt: plan.openedAt,
    statusLabel: plan.status === "complete" ? "Complete" : "Draft",
    statusTone: plan.status === "complete" ? ("success" as const) : ("muted" as const),
  }));

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4 py-10 md:px-6 md:py-14"
    >
      <div className="w-full max-w-[680px]">
        <header className="text-center">
          <h1 className="text-[1.875rem] font-semibold tracking-[-0.025em] text-foreground md:text-[2.125rem] md:leading-[1.15]">
            What should we plan?
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Build a structured project synopsis — overview, requirements, architecture diagrams,
            roadmaps, risks, and more.
          </p>
        </header>

        <div className="mt-10">
          <PlanHomeComposer
            prompt={prompt}
            onPromptChange={onPromptChange}
            onSubmit={onSubmit}
            disabled={running}
            running={running}
          />
        </div>

        <div className="mt-8">
          <p className="mb-3 text-center text-[13px] text-muted-foreground">Quick start</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PLAN_STARTER_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                disabled={running}
                onClick={() => onTemplateSelect(template.prompt)}
                className="group flex items-start gap-3 rounded-lg border border-border/70 bg-card px-3.5 py-3 text-left shadow-sm transition hover:border-border hover:bg-muted/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground transition group-hover:text-foreground">
                  <Sparkles className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-foreground">{template.title}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{template.subtitle}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <StudioRecentList
          title="Recent plans"
          items={recentItems}
          emptyLabel="No plans yet. Start with a prompt above."
          icon={ClipboardList}
          disabled={running}
          onSelect={(id) => onOpenRecentPlan?.(id)}
        />

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[12px] text-muted-foreground/75">
          {PROJECT_SYNOPSIS_SECTIONS.slice(0, 6).map((section, index) => (
            <span key={section.id} className="inline-flex items-center gap-1">
              {index > 0 ? <span className="px-1 text-muted-foreground/35">·</span> : null}
              <span>{section.label}</span>
            </span>
          ))}
          <span className="px-1 text-muted-foreground/35">·</span>
          <span>+{PROJECT_SYNOPSIS_SECTIONS.length - 6} more</span>
        </div>
      </div>
    </motion.div>
  );
}

function SynopsisOutlinePanel({
  activeSectionId,
  sectionStatus,
  onSelectSection,
  onClose,
  width,
}: {
  activeSectionId: string;
  sectionStatus: Record<string, SynopsisSectionStatus>;
  onSelectSection: (sectionId: string) => void;
  onClose: () => void;
  width: number;
}) {
  return (
    <aside
      className="platform-detail-panel flex max-h-[42vh] w-full shrink-0 flex-col overflow-hidden border-b border-border/60 lg:max-h-none lg:w-[var(--outline-panel-width)] lg:border-b-0"
      style={{ ["--outline-panel-width" as string]: `${width}px` }}
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">Synopsis outline</span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {PROJECT_SYNOPSIS_SECTIONS.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Close outline panel"
          aria-label="Close outline panel"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2 [scrollbar-width:thin]">
        {PROJECT_SYNOPSIS_SECTIONS.map((section) => {
          const Icon = section.icon;
          const status = sectionStatus[section.id] ?? "empty";
          const active = section.id === activeSectionId;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection(section.id)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition",
                active
                  ? "border-border bg-muted/50"
                  : "border-transparent hover:border-border/60 hover:bg-muted/30",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border",
                  status === "complete" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-600",
                  status === "draft" && "border-foreground/15 bg-foreground/[0.06] text-foreground",
                  status === "empty" && "border-border/60 text-muted-foreground",
                )}
              >
                {status === "complete" ? (
                  <Check className="size-3" />
                ) : status === "draft" ? (
                  <Circle className="size-2 fill-current" />
                ) : (
                  <Icon className="size-3" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-foreground">{section.label}</span>
                <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                  {section.deliverables.length} deliverables
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function DeliverableCard({
  deliverable,
  selected,
  onSelect,
}: {
  deliverable: SynopsisDeliverable;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = formatIconForDeliverable(deliverable.format);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-md border px-3 py-2.5 text-left transition",
        selected
          ? "border-primary/30 bg-primary/[0.04]"
          : "border-border/60 bg-background/60 hover:border-border hover:bg-muted/20",
      )}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-foreground">{deliverable.label}</span>
        <span className="mt-0.5 block text-[10px] capitalize text-muted-foreground">
          {deliverable.format}
        </span>
      </span>
    </button>
  );
}

function SynopsisSectionPanel({
  section,
  selectedDeliverableId,
  onSelectDeliverable,
  projectPrompt,
}: {
  section: SynopsisSection;
  selectedDeliverableId: string | null;
  onSelectDeliverable: (deliverableId: string) => void;
  projectPrompt: string;
}) {
  const selected =
    section.deliverables.find((item) => item.id === selectedDeliverableId) ?? section.deliverables[0];

  return (
    <>
      <div className="platform-center-card shrink-0 px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground">
            <section.icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">{section.label}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{section.summary}</p>
          </div>
        </div>
      </div>

      <div className="platform-center-card shrink-0 px-4 py-3.5 sm:px-5 sm:py-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Deliverables
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {section.deliverables.map((deliverable) => (
            <DeliverableCard
              key={deliverable.id}
              deliverable={deliverable}
              selected={deliverable.id === selected?.id}
              onSelect={() => onSelectDeliverable(deliverable.id)}
            />
          ))}
        </div>
      </div>

      <div className="platform-center-card min-h-0 flex-1">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5 sm:px-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{selected?.label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{selected?.description}</p>
          </div>
          <span className="shrink-0 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[10px] font-medium capitalize text-muted-foreground">
            {selected?.format}
          </span>
        </div>

        {selected?.format === "diagram" ? (
          <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-3 bg-[#f6f8fa] px-6 py-10 text-center dark:bg-[#0d1117]">
            <Grid3x3 className="size-8 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium text-foreground">Diagram canvas</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Architecture, flow, and process diagrams for this section will render here. Use the
                assistant panel to generate from your project brief.
              </p>
            </div>
          </div>
        ) : selected?.format === "matrix" ? (
          <div className="overflow-x-auto p-4 sm:p-5">
            <table className="w-full min-w-[480px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {["Define", "Validate", "Track"].map((row) => (
                  <tr key={row} className="border-b border-border/30">
                    <td className="px-3 py-2.5 text-foreground">{row}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">—</td>
                    <td className="px-3 py-2.5 text-muted-foreground">—</td>
                    <td className="px-3 py-2.5 text-muted-foreground">Pending</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-3 p-4 sm:p-5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Draft content
            </p>
            <div className="rounded-md border border-border/60 bg-muted/15 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
              {projectPrompt
                ? `Content for "${selected?.label}" will be generated from your brief: “${projectPrompt.slice(0, 160)}${projectPrompt.length > 160 ? "…" : ""}”`
                : "Start planning to generate section content from your project brief."}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PlanAssistPanel({
  section,
  onClose,
  width,
}: {
  section: SynopsisSection;
  onClose: () => void;
  width: number;
}) {
  return (
    <aside
      className="platform-side-panel flex min-h-[240px] w-full shrink-0 flex-col overflow-hidden border-t lg:min-h-0 lg:w-[var(--assist-panel-width)] lg:border-t-0"
      style={{ ["--assist-panel-width" as string]: `${width}px` }}
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-3">
        <span className="text-xs font-medium text-foreground">Assistant</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Close assistant panel"
          aria-label="Close assistant panel"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 [scrollbar-width:thin]">
        <div className="rounded-md border border-border/60 bg-background/60 px-3 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Active section
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">{section.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{section.summary}</p>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Generate section draft
          </button>
          <button
            type="button"
            className="w-full rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50"
          >
            Generate diagrams
          </button>
          <button
            type="button"
            className="w-full rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50"
          >
            Export synopsis
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          AI generation will populate documents, matrices, and diagram placeholders for each
          deliverable in this section.
        </p>
      </div>
    </aside>
  );
}

export function PlanWorkspace({
  projectPrompt,
  running,
}: {
  projectPrompt: string;
  running: boolean;
}) {
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [outlinePanelWidth, setOutlinePanelWidth] = useState(OUTLINE_PANEL_DEFAULT_WIDTH);
  const [assistOpen, setAssistOpen] = useState(true);
  const [assistPanelWidth, setAssistPanelWidth] = useState(ASSIST_PANEL_DEFAULT_WIDTH);
  const [activeSectionId, setActiveSectionId] = useState(getDefaultSynopsisSectionId());
  const [selectedDeliverableBySection, setSelectedDeliverableBySection] = useState<
    Record<string, string>
  >({});

  const activeSection = useMemo(
    () => getSynopsisSection(activeSectionId) ?? PROJECT_SYNOPSIS_SECTIONS[0],
    [activeSectionId],
  );

  const sectionStatus = useMemo(() => {
    const status: Record<string, SynopsisSectionStatus> = {};
    for (const section of PROJECT_SYNOPSIS_SECTIONS) {
      status[section.id] = running && section.id === "overview" ? "draft" : "empty";
    }
    return status;
  }, [running]);

  const handleSelectDeliverable = useCallback((sectionId: string, deliverableId: string) => {
    setSelectedDeliverableBySection((prev) => ({ ...prev, [sectionId]: deliverableId }));
  }, []);

  const selectedDeliverableId =
    selectedDeliverableBySection[activeSection.id] ?? activeSection.deliverables[0]?.id ?? null;

  const router = useRouter();
  const handleCreateDesign = useCallback(() => {
    router.push(studioWithPhase("design"));
  }, [router]);

  return (
    <div className="platform-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="platform-toolbar flex h-11 shrink-0 items-center gap-3 px-4 md:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="hidden text-xs text-muted-foreground sm:inline">Workspace</span>
          <ChevronRight className="hidden size-3 text-muted-foreground/40 sm:inline" aria-hidden />
          <h1 className="truncate text-sm font-medium text-foreground">Project synopsis</h1>
          <span className="inline-flex shrink-0 items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {running ? "Generating" : "Draft"}
          </span>
        </div>

        <div className="hidden min-w-0 flex-1 px-6 lg:block">
          <p className="truncate text-center text-xs text-muted-foreground">{projectPrompt}</p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {!running ? (
            <button
              type="button"
              onClick={handleCreateDesign}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create design
            </button>
          ) : null}
          {!outlineOpen ? (
            <button
              type="button"
              onClick={() => setOutlineOpen(true)}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/50"
            >
              Outline
            </button>
          ) : null}
          {!assistOpen ? (
            <button
              type="button"
              onClick={() => setAssistOpen(true)}
              className="hidden rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/50 lg:inline-flex"
            >
              Assistant
            </button>
          ) : null}
        </div>
      </header>

      <div className="platform-canvas flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {outlineOpen ? (
          <>
            <SynopsisOutlinePanel
              activeSectionId={activeSectionId}
              sectionStatus={sectionStatus}
              onSelectSection={setActiveSectionId}
              onClose={() => setOutlineOpen(false)}
              width={outlinePanelWidth}
            />
            <WorkspaceResizeHandle
              side="left"
              ariaLabel="Resize outline panel"
              onDrag={(delta) =>
                setOutlinePanelWidth((width) =>
                  Math.min(
                    OUTLINE_PANEL_MAX_WIDTH,
                    Math.max(OUTLINE_PANEL_MIN_WIDTH, width + delta),
                  ),
                )
              }
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOutlineOpen(true)}
            title="Open synopsis outline"
            aria-label="Open synopsis outline"
            className="hidden shrink-0 items-center px-2 text-muted-foreground hover:bg-muted/30 hover:text-foreground lg:flex"
          >
            <ChevronRight className="size-4" />
          </button>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="platform-center-stack flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin]">
            <SynopsisSectionPanel
              section={activeSection}
              selectedDeliverableId={selectedDeliverableId}
              onSelectDeliverable={(deliverableId) =>
                handleSelectDeliverable(activeSection.id, deliverableId)
              }
              projectPrompt={projectPrompt}
            />
          </div>
        </div>

        {assistOpen ? (
          <>
            <WorkspaceResizeHandle
              side="right"
              ariaLabel="Resize assistant panel"
              onDrag={(delta) =>
                setAssistPanelWidth((width) =>
                  Math.min(
                    ASSIST_PANEL_MAX_WIDTH,
                    Math.max(ASSIST_PANEL_MIN_WIDTH, width + delta),
                  ),
                )
              }
            />
            <PlanAssistPanel
              section={activeSection}
              onClose={() => setAssistOpen(false)}
              width={assistPanelWidth}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAssistOpen(true)}
            title="Open assistant panel"
            aria-label="Open assistant panel"
            className="hidden shrink-0 items-center px-2 text-muted-foreground hover:bg-muted/30 hover:text-foreground lg:flex"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function PlanBackdrop({
  children,
  plain = false,
}: {
  children: React.ReactNode;
  plain?: boolean;
}) {
  return (
    <PlatformBackdrop plain={plain} home={!plain}>
      {children}
    </PlatformBackdrop>
  );
}
