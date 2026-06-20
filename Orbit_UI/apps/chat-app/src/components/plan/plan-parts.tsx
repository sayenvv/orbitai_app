"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Download,
  FileText,
  GitBranch,
  GripVertical,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import { PlanDeliverableEditor } from "@/components/plan/plan-deliverable-editor";
import { PlanShareMenu } from "@/components/plan/plan-share-menu";
import { PlanStudioChat } from "@/components/plan/plan-studio-chat";
import { PlanHtmlPageEditorSheet } from "@/components/plan/plan-html-page-editor-sheet";
import { PlatformBackdrop } from "@/components/platform/platform-parts";
import { WorkspaceResizeHandle } from "@/components/workspace/workspace-resize";
import type { PlanDocumentViewerTab } from "@/components/plan/plan-document-viewer-sheet";
import {
  WorkspaceMenuBar,
  type WorkspaceMenuDefinition,
} from "@/components/workspace/workspace-menu-bar";
import { DOCUMENTATION_SECTION_COUNT } from "@/lib/plan-documentation-catalog";
import {
  filterSectionsByIncluded,
  getDefaultSectionId,
  getPlanSections,
  resolvePlanSection,
  TOTAL_PLAN_SECTION_COUNT,
  type PlanWorkspaceView,
} from "@/lib/plan-catalog";
import type { PlanScopeConfig } from "@/lib/studio-plan-scope-storage";
import type { CustomSynopsisSection } from "@/lib/plan-custom-sections";
import type { PlanGenerateProgress } from "@/lib/plan-generate";
import {
  getSectionDeliverable,
  PLAN_STARTER_TEMPLATES,
  SYNOPSIS_SECTION_COUNT,
  type SynopsisSection,
} from "@/lib/plan-synopsis-catalog";
import {
  getProjectTitleFromContent,
  getSectionContent,
  sectionHasContent,
  type PlanDeliverableContent,
} from "@/lib/plan-deliverable-content";
import { exportPlanProposalPdf, buildPlanProposalPreviewHtml } from "@/lib/plan-pdf-export";
import type { PlanPdfPageFormatId } from "@/lib/plan-pdf-page-format";
import { mergePlanHtmlPageStyles, mergePlanHtmlSidebarStyle, type PlanHtmlPageStylesMap, type PlanHtmlSidebarStyle } from "@/lib/plan-html-page-editor";
import {
  readStudioPlanHtmlEditorStorage,
  writeStudioPlanHtmlEditorStorage,
} from "@/lib/studio-plan-html-page-styles-storage";
import { reorderSynopsisSectionOrder } from "@/lib/plan-synopsis-section-order";
import type { RecentStudioPlan } from "@/lib/studio-recent-plans";
import {
  parseStudioPlanSectionId,
  replaceBrowserUrl,
  readBrowserSearchParam,
  studioPlanWorkspace,
  studioWithPhase,
} from "@/lib/routes";
import { cn } from "@/lib/utils";
import { StudioRecentList } from "@/components/studio/studio-recent-list";
import { studioButtonPrimary, studioButtonSecondary, studioRadius } from "@/components/studio/studio-ui";

export type SynopsisSectionStatus = "empty" | "draft" | "complete";

const PlanDocumentViewerSheet = dynamic(
  () =>
    import("@/components/plan/plan-document-viewer-sheet").then(
      (module) => module.PlanDocumentViewerSheet,
    ),
  { ssr: false },
);

const OUTLINE_PANEL_DEFAULT_WIDTH = 300;
const OUTLINE_PANEL_MIN_WIDTH = 240;
const OUTLINE_PANEL_MAX_WIDTH = 480;

const ASSIST_PANEL_DEFAULT_WIDTH = 360;
const ASSIST_PANEL_MIN_WIDTH = 280;
const ASSIST_PANEL_MAX_WIDTH = 520;

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
          Generates project synopsis and documentation from your brief.
        </p>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className={cn(
            studioButtonPrimary("h-9 shrink-0 px-4 text-[13px]"),
            !canSubmit && "cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted",
          )}
        >
          {running ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Planning…
            </>
          ) : (
            <>
              Generate synopsis & docs
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
      className="flex w-full flex-col items-center px-4 pb-10 pt-6 md:px-6 md:pb-14 md:pt-8"
    >
      <div className="w-full max-w-[680px]">
        <header className="text-center">
          <h1 className="text-ds-h1 text-[1.875rem] md:text-[2.125rem] md:leading-[1.15]">
            What should we plan?
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Describe your project once — ClovAI generates a 22-section synopsis and
            full project documentation you can edit and export.
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
                className={cn(
                  studioRadius,
                  "group flex items-start gap-3 border border-border/60 bg-card px-3.5 py-3 text-left transition hover:bg-muted/20 disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <span
                  className={cn(
                    studioRadius,
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center bg-muted/30 text-muted-foreground transition group-hover:text-foreground",
                  )}
                >
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
          className="mt-8"
          onSelect={(id) => onOpenRecentPlan?.(id)}
        />

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[12px] text-muted-foreground/75">
          <span>{SYNOPSIS_SECTION_COUNT} synopsis sections</span>
          <span className="px-1 text-muted-foreground/35">·</span>
          <span>{DOCUMENTATION_SECTION_COUNT} documentation docs</span>
          <span className="px-1 text-muted-foreground/35">·</span>
          <span>PDF export</span>
        </div>
      </div>
    </motion.div>
  );
}

function AddSynopsisSectionForm({
  onAdd,
  onCancel,
}: {
  onAdd: (label: string, format: CustomSynopsisSection["format"]) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [format, setFormat] = useState<CustomSynopsisSection["format"]>("document");

  const canAdd = label.trim().length > 0;

  return (
    <div className="space-y-2.5 rounded-md border border-dashed border-border/80 bg-muted/10 p-2.5">
      <input
        type="text"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder="Section title"
        className={cn(
          studioRadius,
          "w-full border border-border/60 bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-border",
        )}
        autoFocus
      />
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setFormat("document")}
          className={cn(
            studioRadius,
            "flex items-center justify-center gap-1.5 border px-2 py-1.5 text-[10px] font-medium transition",
            format === "document"
              ? "border-border bg-muted/50 text-foreground"
              : "border-border/50 text-muted-foreground hover:border-border/80 hover:text-foreground",
          )}
        >
          <FileText className="size-3" />
          Content
        </button>
        <button
          type="button"
          onClick={() => setFormat("diagram")}
          className={cn(
            studioRadius,
            "flex items-center justify-center gap-1.5 border px-2 py-1.5 text-[10px] font-medium transition",
            format === "diagram"
              ? "border-border bg-muted/50 text-foreground"
              : "border-border/50 text-muted-foreground hover:border-border/80 hover:text-foreground",
          )}
        >
          <GitBranch className="size-3" />
          Mermaid
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => onAdd(label.trim(), format)}
          className={cn(
            studioButtonPrimary("flex-1 justify-center px-2 py-1 text-[10px]"),
            !canAdd && "cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted",
          )}
        >
          Add section
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={cn(studioButtonSecondary("px-2 py-1 text-[10px]"), "shrink-0")}
          aria-label="Cancel"
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}

function SynopsisOutlineSectionRow({
  section,
  active,
  status,
  onSelectSection,
  onRemoveCustomSection,
  dragHandle,
}: {
  section: SynopsisSection;
  active: boolean;
  status: SynopsisSectionStatus;
  onSelectSection: (sectionId: string) => void;
  onRemoveCustomSection?: (sectionId: string) => void;
  dragHandle?: ReactNode;
}) {
  const Icon = section.icon;

  return (
    <div
      className={cn(
        "group flex w-full items-start gap-1.5 rounded-md border px-2 py-2 transition",
        active
          ? "border-border bg-muted/50"
          : "border-transparent hover:border-border/60 hover:bg-muted/30",
      )}
    >
      {dragHandle}
      <button
        type="button"
        onClick={() => onSelectSection(section.id)}
        className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
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
          <span className="flex items-baseline gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground">{section.number}.</span>
            <span className="block text-xs font-medium text-foreground">{section.label}</span>
            {section.custom ? (
              <span className="rounded bg-muted px-1 py-px text-[9px] text-muted-foreground">
                {section.deliverables[0]?.format === "diagram" ? "mermaid" : "custom"}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
            {section.description}
          </span>
        </span>
      </button>
      {section.custom && onRemoveCustomSection ? (
        <button
          type="button"
          onClick={() => onRemoveCustomSection(section.id)}
          className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title="Remove custom section"
          aria-label={`Remove ${section.label}`}
        >
          <Trash2 className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

function SortableSynopsisSectionRow({
  section,
  active,
  status,
  onSelectSection,
  onRemoveCustomSection,
}: {
  section: SynopsisSection;
  active: boolean;
  status: SynopsisSectionStatus;
  onSelectSection: (sectionId: string) => void;
  onRemoveCustomSection?: (sectionId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="mt-1 shrink-0 cursor-grab rounded p-0.5 text-muted-foreground active:cursor-grabbing hover:bg-muted hover:text-foreground"
      aria-label={`Drag to reorder ${section.label}`}
      title="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-3.5" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && "z-10 rounded-md border border-border bg-muted/60 shadow-sm",
      )}
    >
      <SynopsisOutlineSectionRow
        section={section}
        active={active}
        status={status}
        onSelectSection={onSelectSection}
        onRemoveCustomSection={onRemoveCustomSection}
        dragHandle={dragHandle}
      />
    </div>
  );
}

function SynopsisOutlinePanel({
  sections,
  panelTitle,
  activeSectionId,
  sectionStatus,
  onSelectSection,
  onClose,
  width,
  allowCustomSections = false,
  onAddCustomSection,
  onRemoveCustomSection,
  onReorderSections,
}: {
  sections: SynopsisSection[];
  panelTitle: string;
  activeSectionId: string;
  sectionStatus: Record<string, SynopsisSectionStatus>;
  onSelectSection: (sectionId: string) => void;
  onClose: () => void;
  width: number;
  allowCustomSections?: boolean;
  onAddCustomSection?: (label: string, format: CustomSynopsisSection["format"]) => string;
  onRemoveCustomSection?: (sectionId: string) => void;
  onReorderSections?: (orderedIds: string[]) => void;
}) {
  const [addingSection, setAddingSection] = useState(false);
  const allowReorder = allowCustomSections && Boolean(onReorderSections);
  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAddSection = (label: string, format: CustomSynopsisSection["format"]) => {
    const sectionId = onAddCustomSection?.(label, format);
    setAddingSection(false);
    if (sectionId) onSelectSection(sectionId);
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !onReorderSections) return;
      onReorderSections(
        reorderSynopsisSectionOrder(sectionIds, String(active.id), String(over.id)),
      );
    },
    [onReorderSections, sectionIds],
  );

  const sectionList = allowReorder ? (
    <>
      {sections.map((section) => (
        <SortableSynopsisSectionRow
          key={section.id}
          section={section}
          active={section.id === activeSectionId}
          status={sectionStatus[section.id] ?? "empty"}
          onSelectSection={onSelectSection}
          onRemoveCustomSection={onRemoveCustomSection}
        />
      ))}
    </>
  ) : (
    <>
      {sections.map((section) => (
        <SynopsisOutlineSectionRow
          key={section.id}
          section={section}
          active={section.id === activeSectionId}
          status={sectionStatus[section.id] ?? "empty"}
          onSelectSection={onSelectSection}
          onRemoveCustomSection={onRemoveCustomSection}
        />
      ))}
    </>
  );

  return (
    <aside
      className="platform-detail-panel flex max-h-[42vh] w-full shrink-0 flex-col overflow-hidden border-b border-border/60 lg:max-h-none lg:w-[var(--outline-panel-width)] lg:border-b-0"
      style={{ ["--outline-panel-width" as string]: `${width}px` }}
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{panelTitle}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {sections.length}
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
        {allowReorder ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
              {sectionList}
            </SortableContext>
          </DndContext>
        ) : (
          sectionList
        )}
      </nav>
      {allowCustomSections && onAddCustomSection ? (
        <div className="shrink-0 border-t border-border/60 p-2">
          {addingSection ? (
            <AddSynopsisSectionForm
              onAdd={handleAddSection}
              onCancel={() => setAddingSection(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingSection(true)}
              className={cn(
                studioRadius,
                "flex w-full items-center justify-center gap-1.5 border border-dashed border-border/70 px-2.5 py-2 text-[11px] font-medium text-muted-foreground transition hover:border-border hover:bg-muted/20 hover:text-foreground",
              )}
            >
              <Plus className="size-3.5" />
              Add section
            </button>
          )}
        </div>
      ) : null}
    </aside>
  );
}

function SynopsisSectionPanel({
  section,
  projectPrompt,
  contentByDeliverableId,
  onContentChange,
}: {
  section: SynopsisSection;
  projectPrompt: string;
  contentByDeliverableId: Record<string, PlanDeliverableContent>;
  onContentChange: (deliverableId: string, content: PlanDeliverableContent) => void;
}) {
  const deliverable = getSectionDeliverable(section);
  const content = getSectionContent(contentByDeliverableId, section, projectPrompt);
  const isDiagram = deliverable.format === "diagram";

  return (
    <div
      className={cn(
        "platform-center-stack w-full",
        isDiagram && "flex h-full min-h-0 flex-1 flex-col",
      )}
    >
      <div
        className={cn(
          "platform-center-card plan-synopsis-preview",
          isDiagram ? "flex min-h-0 flex-1 flex-col" : "shrink-0",
        )}
      >
        <div className="border-b border-border/60 px-4 py-3.5 sm:px-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border/60 bg-muted/30 font-mono text-xs font-semibold text-muted-foreground">
              {section.number}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-foreground">{section.label}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{section.description}</p>
            </div>
            <span className="shrink-0 rounded-sm border border-border/60 bg-muted/30 px-2 py-1 text-[10px] font-medium capitalize text-muted-foreground">
              {deliverable.format === "diagram" ? "mermaid" : deliverable.format}
            </span>
          </div>
        </div>

        <div className={cn(isDiagram && "flex min-h-0 flex-1 flex-col")}>
          <PlanDeliverableEditor
            deliverable={deliverable}
            content={content}
            onChange={(next) => onContentChange(deliverable.id, next)}
          />
        </div>
      </div>
    </div>
  );
}

export function PlanWorkspace({
  planId,
  projectPrompt,
  running,
  generateProgress,
  contentByDeliverableId,
  customSynopsisSections,
  synopsisSectionOrder,
  planScope,
  onContentChange,
  onAddCustomSection,
  onRemoveCustomSection,
  onReorderSynopsisSections,
}: {
  planId: string;
  projectPrompt: string;
  running: boolean;
  generateProgress: PlanGenerateProgress | null;
  contentByDeliverableId: Record<string, PlanDeliverableContent>;
  customSynopsisSections: CustomSynopsisSection[];
  synopsisSectionOrder: string[];
  planScope: PlanScopeConfig | null;
  onContentChange: (deliverableId: string, content: PlanDeliverableContent) => void;
  onAddCustomSection: (label: string, format: CustomSynopsisSection["format"]) => string;
  onRemoveCustomSection: (sectionId: string) => void;
  onReorderSynopsisSections: (orderedIds: string[]) => void;
}) {
  const router = useRouter();
  const workspaceView: PlanWorkspaceView = planScope?.target ?? "synopsis";
  const workspaceLabel =
    workspaceView === "synopsis" ? "Project Synopsis" : "Project Documentation";
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [outlinePanelWidth, setOutlinePanelWidth] = useState(OUTLINE_PANEL_DEFAULT_WIDTH);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatPanelWidth, setChatPanelWidth] = useState(ASSIST_PANEL_DEFAULT_WIDTH);
  const [activeSectionId, setActiveSectionId] = useState(() =>
    getDefaultSectionId(workspaceView),
  );
  const [exportingPdf, setExportingPdf] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [documentViewerTabs, setDocumentViewerTabs] = useState<PlanDocumentViewerTab[]>([]);
  const [activeDocumentViewerTab, setActiveDocumentViewerTab] =
    useState<PlanDocumentViewerTab | null>(null);
  const [documentPreviewHtml, setDocumentPreviewHtml] = useState<string | null>(null);
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  const [htmlPageEditorOpen, setHtmlPageEditorOpen] = useState(false);
  const [pageStyles, setPageStyles] = useState<PlanHtmlPageStylesMap>({});
  const [sidebarStyle, setSidebarStyle] = useState<PlanHtmlSidebarStyle>(
    mergePlanHtmlSidebarStyle(null),
  );
  const initializedPlanIdRef = useRef<string | null>(null);

  const visibleSections = useMemo(() => {
    let sections = getPlanSections(workspaceView, customSynopsisSections, synopsisSectionOrder);

    if (planScope) {
      sections = filterSectionsByIncluded(sections, planScope.includedSectionIds);
    }

    return sections;
  }, [workspaceView, customSynopsisSections, synopsisSectionOrder, planScope]);

  const syncSectionUrl = useCallback(
    (sectionId: string) => {
      if (!planId || !sectionId) return;
      replaceBrowserUrl(studioPlanWorkspace(planId, "plan", sectionId, workspaceView));
    },
    [planId, workspaceView],
  );

  const handleSelectSection = useCallback(
    (sectionId: string) => {
      setActiveSectionId(sectionId);
      syncSectionUrl(sectionId);
    },
    [syncSectionUrl],
  );

  useEffect(() => {
    if (!planId || !visibleSections.length) return;

    if (initializedPlanIdRef.current !== planId) {
      initializedPlanIdRef.current = planId;
      const sectionFromUrl = parseStudioPlanSectionId(readBrowserSearchParam("section"));
      const next =
        sectionFromUrl && visibleSections.some((section) => section.id === sectionFromUrl)
          ? sectionFromUrl
          : visibleSections[0].id;
      setActiveSectionId(next);
      syncSectionUrl(next);
      return;
    }

    setActiveSectionId((current) => {
      if (visibleSections.some((section) => section.id === current)) return current;
      const next = visibleSections[0].id;
      syncSectionUrl(next);
      return next;
    });
  }, [planId, visibleSections, syncSectionUrl]);

  const activeSection = useMemo(() => {
    if (!visibleSections.length) return undefined;
    const resolved =
      resolvePlanSection(activeSectionId, customSynopsisSections, synopsisSectionOrder) ??
      visibleSections[0];
    if (resolved && visibleSections.some((section) => section.id === resolved.id)) {
      return resolved;
    }
    return visibleSections[0];
  }, [activeSectionId, customSynopsisSections, synopsisSectionOrder, visibleSections]);

  const handleRemoveCustomSection = useCallback(
    (sectionId: string) => {
      onRemoveCustomSection(sectionId);
      if (activeSectionId === sectionId) {
        const remaining = visibleSections.filter((section) => section.id !== sectionId);
        const nextSectionId =
          remaining[remaining.length - 1]?.id ?? getDefaultSectionId(workspaceView);
        setActiveSectionId(nextSectionId);
        syncSectionUrl(nextSectionId);
      }
    },
    [activeSectionId, onRemoveCustomSection, syncSectionUrl, visibleSections, workspaceView],
  );

  const projectTitle = useMemo(
    () => getProjectTitleFromContent(contentByDeliverableId, projectPrompt),
    [contentByDeliverableId, projectPrompt],
  );

  useEffect(() => {
    setDocumentPreviewHtml(null);
  }, [contentByDeliverableId, projectTitle, synopsisSectionOrder, visibleSections]);

  useEffect(() => {
    const sectionIds = visibleSections.map((section) => section.id);
    const stored = readStudioPlanHtmlEditorStorage(planId);
    setPageStyles(mergePlanHtmlPageStyles(sectionIds, stored?.pageStyles ?? null));
    setSidebarStyle(mergePlanHtmlSidebarStyle(stored?.sidebarStyle ?? null));
  }, [planId, visibleSections]);

  const handlePageStylesChange = useCallback(
    (styles: PlanHtmlPageStylesMap) => {
      setPageStyles(styles);
      writeStudioPlanHtmlEditorStorage(planId, { pageStyles: styles, sidebarStyle });
    },
    [planId, sidebarStyle],
  );

  const handleSidebarStyleChange = useCallback(
    (style: PlanHtmlSidebarStyle) => {
      setSidebarStyle(style);
      writeStudioPlanHtmlEditorStorage(planId, { pageStyles, sidebarStyle: style });
    },
    [pageStyles, planId],
  );

  const sectionStatus = useMemo(() => {
    const status: Record<string, SynopsisSectionStatus> = {};
    for (const section of visibleSections) {
      const content = getSectionContent(contentByDeliverableId, section, projectPrompt);
      if (running) {
        status[section.id] = "draft";
      } else if (sectionHasContent(content)) {
        status[section.id] = "complete";
      } else {
        status[section.id] = "empty";
      }
    }
    return status;
  }, [contentByDeliverableId, projectPrompt, running, visibleSections]);

  const activeDeliverable = activeSection ? getSectionDeliverable(activeSection) : null;
  const activeDeliverableContent = activeSection
    ? getSectionContent(contentByDeliverableId, activeSection, projectPrompt)
    : null;
  const activeIsDiagram = activeDeliverable?.format === "diagram";

  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      await exportPlanProposalPdf({
        projectTitle,
        contentById: contentByDeliverableId,
        customSynopsisSections,
        synopsisSectionOrder,
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "PDF export failed.");
    } finally {
      setExportingPdf(false);
    }
  }, [contentByDeliverableId, customSynopsisSections, projectTitle, synopsisSectionOrder]);

  const handleCreateDesign = useCallback(() => {
    router.push(studioWithPhase("design"));
  }, [router]);

  const handleAddSectionFromMenu = useCallback(() => {
    if (workspaceView !== "synopsis") return;
    setOutlineOpen(true);
    const label = window.prompt("New section name");
    if (!label?.trim()) return;
    const sectionId = onAddCustomSection(label.trim(), "document");
    if (sectionId) handleSelectSection(sectionId);
  }, [handleSelectSection, onAddCustomSection, workspaceView]);

  const loadDocumentPreviewHtml = useCallback(async () => {
    setDocumentPreviewLoading(true);
    try {
      const html = await buildPlanProposalPreviewHtml({
        projectTitle,
        contentById: contentByDeliverableId,
        sections: visibleSections,
      });
      setDocumentPreviewHtml(html);
      return html;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to prepare document preview.");
      return null;
    } finally {
      setDocumentPreviewLoading(false);
    }
  }, [contentByDeliverableId, projectTitle, visibleSections]);

  const openDocumentViewerTab = useCallback(
    async (tab: PlanDocumentViewerTab) => {
      setDocumentViewerTabs((current) => (current.includes(tab) ? current : [...current, tab]));
      setActiveDocumentViewerTab(tab);
      setDocumentViewerOpen(true);
      if (tab === "pdf" && !documentPreviewHtml) {
        await loadDocumentPreviewHtml();
      }
    },
    [documentPreviewHtml, loadDocumentPreviewHtml],
  );

  useEffect(() => {
    if (!documentViewerOpen || documentPreviewHtml || documentPreviewLoading) return;
    if (!documentViewerTabs.includes("pdf")) return;
    void loadDocumentPreviewHtml();
  }, [
    documentPreviewHtml,
    documentPreviewLoading,
    documentViewerOpen,
    documentViewerTabs,
    loadDocumentPreviewHtml,
  ]);

  const handleCloseDocumentViewerTab = useCallback((tab: PlanDocumentViewerTab) => {
    setDocumentViewerTabs((current) => {
      const next = current.filter((item) => item !== tab);
      setActiveDocumentViewerTab((active) => {
        if (active !== tab) return active;
        return next[next.length - 1] ?? null;
      });
      if (next.length === 0) {
        setDocumentViewerOpen(false);
      }
      return next;
    });
  }, []);

  const handlePrintDocumentPreview = useCallback(
    async (pageFormat: PlanPdfPageFormatId) => {
      try {
        const html = await buildPlanProposalPreviewHtml({
          projectTitle,
          contentById: contentByDeliverableId,
          sections: visibleSections,
          pageFormat,
        });
        const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
        if (!printWindow) {
          window.alert("Pop-up blocked. Allow pop-ups to print or save as PDF.");
          return;
        }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.addEventListener("load", () => {
          printWindow.print();
        });
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Failed to prepare document for printing.");
      }
    },
    [contentByDeliverableId, projectTitle, visibleSections],
  );

  const workspaceMenus = useMemo<WorkspaceMenuDefinition[]>(
    () => [
      {
        label: "File",
        items: [
          {
            type: "submenu",
            label: "Open",
            items: [
              {
                label: "HTML View",
                checked: documentViewerTabs.includes("html"),
                onClick: () => void openDocumentViewerTab("html"),
              },
              {
                label: "PDF Viewer",
                checked: documentViewerTabs.includes("pdf"),
                onClick: () => void openDocumentViewerTab("pdf"),
              },
              {
                label: "HTML Editor",
                checked: htmlPageEditorOpen,
                onClick: () => setHtmlPageEditorOpen(true),
              },
            ],
          },
          { type: "divider" },
          {
            label: exportingPdf ? "Exporting PDF…" : "Export PDF",
            disabled: workspaceView !== "synopsis" || exportingPdf,
            onClick: () => void handleExportPdf(),
          },
          {
            label: "Create Design",
            disabled: running,
            onClick: handleCreateDesign,
          },
        ],
      },
      {
        label: "Edit",
        items: [
          {
            label: "Add Section",
            disabled: workspaceView !== "synopsis",
            onClick: handleAddSectionFromMenu,
          },
          {
            label: "Remove Section",
            disabled:
              workspaceView !== "synopsis" ||
              !activeSection?.custom ||
              running,
            onClick: () => {
              if (!activeSection?.custom) return;
              handleRemoveCustomSection(activeSection.id);
            },
          },
        ],
      },
      {
        label: "View",
        items: [
          {
            label: "Show Outline",
            checked: outlineOpen,
            onClick: () => setOutlineOpen((open) => !open),
          },
          {
            label: "Show Assistant",
            checked: chatOpen,
            onClick: () => setChatOpen((open) => !open),
          },
        ],
      },
    ],
    [
      activeSection,
      chatOpen,
      documentViewerTabs,
      exportingPdf,
      handleAddSectionFromMenu,
      handleCreateDesign,
      handleExportPdf,
      handleRemoveCustomSection,
      htmlPageEditorOpen,
      openDocumentViewerTab,
      outlineOpen,
      running,
      workspaceView,
    ],
  );

  return (
    <div className="platform-shell plan-workspace-shell premium-workspace flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="platform-toolbar premium-header flex h-11 shrink-0 items-center gap-3 px-4 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <WorkspaceMenuBar menus={workspaceMenus} className="hidden sm:flex" />
          <span className="hidden h-4 w-px shrink-0 bg-border/60 sm:block" aria-hidden />
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="hidden text-xs text-muted-foreground md:inline">Workspace</span>
            <ChevronRight className="hidden size-3 text-muted-foreground/40 md:inline" aria-hidden />
            <h1 className="truncate text-sm font-medium text-foreground">{projectTitle}</h1>
            <span className="inline-flex shrink-0 items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {running && generateProgress
                ? `${generateProgress.done}/${generateProgress.total}`
                : workspaceView === "synopsis"
                  ? customSynopsisSections.length
                    ? `${visibleSections.length} sections`
                    : `${SYNOPSIS_SECTION_COUNT} sections`
                  : `${DOCUMENTATION_SECTION_COUNT} docs`}
            </span>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 px-4 lg:flex lg:justify-center">
          <span className="rounded-sm border border-border/60 bg-muted/20 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {workspaceLabel}
          </span>
        </div>

        <div className="hidden min-w-0 flex-1 px-2 xl:block">
          <p className="truncate text-center text-xs text-muted-foreground">
            {running && generateProgress
              ? `Generating ${generateProgress.label}…`
              : activeSection
                ? `Section ${activeSection.number} · ${activeSection.label}`
                : "No section selected"}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <PlanShareMenu
            context={{
              planId,
              projectTitle,
              planType: workspaceView,
            }}
          />
          {workspaceView === "synopsis" ? (
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={exportingPdf}
              className={cn(studioButtonSecondary("inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"))}
            >
              {exportingPdf ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Export PDF
            </button>
          ) : null}
          {!running ? (
            <button
              type="button"
              onClick={handleCreateDesign}
              className={studioButtonPrimary("px-3 py-1 text-xs")}
            >
              Create design
            </button>
          ) : null}
          {!outlineOpen ? (
            <button
              type="button"
              onClick={() => setOutlineOpen(true)}
              className={studioButtonSecondary("px-2.5 py-1 text-xs")}
            >
              Outline
            </button>
          ) : null}
          {!chatOpen ? (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className={cn(studioButtonSecondary("px-2.5 py-1 text-xs"), "inline-flex")}
            >
              ClovAI
            </button>
          ) : null}
        </div>
      </header>

      <div className="platform-canvas flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {outlineOpen ? (
          <>
            <SynopsisOutlinePanel
              sections={visibleSections}
              panelTitle={workspaceView === "synopsis" ? "Synopsis contents" : "Documentation"}
              activeSectionId={activeSectionId}
              sectionStatus={sectionStatus}
              onSelectSection={handleSelectSection}
              onClose={() => setOutlineOpen(false)}
              width={outlinePanelWidth}
              allowCustomSections={workspaceView === "synopsis"}
              onAddCustomSection={onAddCustomSection}
              onRemoveCustomSection={handleRemoveCustomSection}
              onReorderSections={onReorderSynopsisSections}
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
          {running && generateProgress ? (
            <div className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  Generating from your project brief…
                </span>
                <span className="font-mono text-[10px]">
                  {generateProgress.done}/{generateProgress.total}
                </span>
              </div>
              <p className="mt-1 truncate">{generateProgress.label}</p>
            </div>
          ) : null}
          <div
            className={cn(
              "plan-synopsis-scroll h-0 min-h-0 flex-1 overscroll-contain [scrollbar-width:thin]",
              activeIsDiagram ? "flex flex-col overflow-hidden" : "overflow-y-auto",
            )}
          >
            {activeSection ? (
              <div
                className={cn(
                  "w-full",
                  activeIsDiagram && "flex h-full min-h-0 flex-1 flex-col",
                )}
              >
                <SynopsisSectionPanel
                  section={activeSection}
                  projectPrompt={projectPrompt}
                  contentByDeliverableId={contentByDeliverableId}
                  onContentChange={onContentChange}
                />
              </div>
            ) : (
              <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-center">
                <p className="max-w-sm text-sm text-muted-foreground">
                  No sections are included in this plan.
                </p>
              </div>
            )}
          </div>
        </div>

        {chatOpen && activeSection && activeDeliverable && activeDeliverableContent ? (
          <>
            <WorkspaceResizeHandle
              side="right"
              ariaLabel="Resize ClovAI chat panel"
              onDrag={(delta) =>
                setChatPanelWidth((width) =>
                  Math.min(
                    ASSIST_PANEL_MAX_WIDTH,
                    Math.max(ASSIST_PANEL_MIN_WIDTH, width + delta),
                  ),
                )
              }
            />
            <PlanStudioChat
              planId={planId}
              projectPrompt={projectPrompt}
              section={activeSection}
              deliverable={activeDeliverable}
              content={activeDeliverableContent}
              onContentChange={(content) => onContentChange(activeDeliverable.id, content)}
              onClose={() => setChatOpen(false)}
              width={chatPanelWidth}
            />
          </>
        ) : chatOpen ? null : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            title="Open ClovAI chat"
            aria-label="Open ClovAI chat"
            className="hidden shrink-0 items-center px-2 text-muted-foreground hover:bg-muted/30 hover:text-foreground lg:flex"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      <PlanDocumentViewerSheet
        open={documentViewerOpen}
        tabs={documentViewerTabs}
        activeTab={activeDocumentViewerTab}
        projectTitle={projectTitle}
        sections={visibleSections}
        contentByDeliverableId={contentByDeliverableId}
        projectPrompt={projectPrompt}
        pageStyles={pageStyles}
        sidebarStyle={sidebarStyle}
        previewHtml={documentPreviewHtml}
        loading={documentPreviewLoading}
        onActiveTabChange={setActiveDocumentViewerTab}
        onCloseTab={handleCloseDocumentViewerTab}
        onClose={() => setDocumentViewerOpen(false)}
        onPrint={handlePrintDocumentPreview}
      />

      <PlanHtmlPageEditorSheet
        open={htmlPageEditorOpen}
        projectTitle={projectTitle}
        sections={visibleSections}
        contentByDeliverableId={contentByDeliverableId}
        projectPrompt={projectPrompt}
        pageStyles={pageStyles}
        sidebarStyle={sidebarStyle}
        onPageStylesChange={handlePageStylesChange}
        onSidebarStyleChange={handleSidebarStyleChange}
        onContentChange={onContentChange}
        onClose={() => setHtmlPageEditorOpen(false)}
      />
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
