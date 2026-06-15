"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  FileText,
  Layers,
  Loader2,
  PenLine,
  Play,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { StudioRecentList } from "@/components/studio/studio-recent-list";
import { studioButtonPrimary, studioButtonSecondary } from "@/components/studio/studio-ui";
import { PROJECT_DOCUMENTATION_SECTIONS } from "@/lib/plan-documentation-catalog";
import type { PlanGenerateLogEntry, PlanGenerateProgress } from "@/lib/plan-generate";
import {
  PLAN_BRIEF_ACCEPT,
  type PlanBriefInputMode,
} from "@/lib/plan-brief-from-file";
import { PROJECT_SYNOPSIS_SECTIONS, type SynopsisSection } from "@/lib/plan-synopsis-catalog";
import type { PlanGenerateTarget } from "@/lib/plan-catalog";
import { resolveIncludedSectionIds } from "@/lib/plan-catalog";
import type { RecentStudioPlan } from "@/lib/studio-recent-plans";
import { cn } from "@/lib/utils";

const DELIVERABLE_PACKAGES: Array<{
  id: PlanGenerateTarget;
  label: string;
  subtitle: string;
  description: string;
  sections: SynopsisSection[];
  icon: typeof FileText;
}> = [
  {
    id: "synopsis",
    label: "Project Synopsis",
    subtitle: "Academic proposal",
    description: "Formal multi-section proposal for academic review and project approval.",
    sections: PROJECT_SYNOPSIS_SECTIONS,
    icon: BookOpen,
  },
  {
    id: "documentation",
    label: "Project Documentation",
    subtitle: "Technical documentation",
    description: "Engineering documentation for architecture, APIs, operations, and delivery.",
    sections: PROJECT_DOCUMENTATION_SECTIONS,
    icon: FileText,
  },
];

function formatBadge(format: string): string {
  if (format === "diagram") return "Diagram";
  if (format === "matrix") return "Matrix";
  return "Content";
}

function countBriefWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function resolveBriefQuality(words: number): { label: string; tone: "muted" | "good" | "great" } {
  if (words === 0) return { label: "Add context for the agent", tone: "muted" };
  if (words < 40) return { label: "Brief — add more detail for richer output", tone: "muted" };
  if (words < 120) return { label: "Solid brief length", tone: "good" };
  return { label: "Rich context — excellent for generation", tone: "great" };
}

function resolveSubmitHint({
  hasBrief,
  includedCount,
  extractingBrief,
}: {
  hasBrief: boolean;
  includedCount: number;
  extractingBrief: boolean;
}): string | null {
  if (extractingBrief) return "Extracting document text…";
  if (!hasBrief) return "Add a written prompt or upload a document to continue.";
  if (includedCount === 0) return "Select at least one section in your deliverable package.";
  return null;
}

function PlanAgentStageRail({
  step,
  label,
  hint,
}: {
  step: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="plan-agent-stage-rail">
      <div className="flex items-center gap-2">
        <span className="plan-agent-stage-index">{step}</span>
        <span className="plan-agent-stage-label">{label}</span>
      </div>
      {hint ? <span className="plan-agent-stage-hint">{hint}</span> : null}
    </div>
  );
}

function PanelHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
}) {
  return (
    <div className="plan-agent-panel-header flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-prose text-[12px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {meta ? <div className="shrink-0">{meta}</div> : null}
    </div>
  );
}

function DeliverablePackageColumn({
  pkg,
  selected,
  expanded,
  onSelect,
  onToggleExpand,
  excludedSectionIds,
  onExcludedSectionIdsChange,
  disabled,
}: {
  pkg: (typeof DELIVERABLE_PACKAGES)[number];
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  excludedSectionIds: string[];
  onExcludedSectionIdsChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  const Icon = pkg.icon;
  const pkgExcluded = selected ? excludedSectionIds : [];
  const pkgIncludedCount = resolveIncludedSectionIds(pkg.id, pkgExcluded).length;

  const toggleSectionIncluded = (sectionId: string) => {
    if (!selected) return;

    const isExcluded = excludedSectionIds.includes(sectionId);
    const currentIncluded = resolveIncludedSectionIds(pkg.id, excludedSectionIds).length;
    if (!isExcluded && currentIncluded <= 1) return;

    onExcludedSectionIdsChange(
      isExcluded
        ? excludedSectionIds.filter((id) => id !== sectionId)
        : [...excludedSectionIds, sectionId],
    );
  };

  const setAllSectionsIncluded = (included: boolean) => {
    if (!selected) return;
    if (included) {
      onExcludedSectionIdsChange([]);
      return;
    }
    onExcludedSectionIdsChange(pkg.sections.slice(1).map((section) => section.id));
  };

  return (
    <div
      className={cn(
        "plan-agent-package flex h-full flex-col overflow-hidden transition-shadow",
        selected && "plan-agent-package-active",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          "flex w-full flex-col text-left transition disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "hover:bg-muted/10",
        )}
      >
        <div className="plan-agent-panel-header flex items-start justify-between gap-3 px-4 py-3.5">
          <span
            className={cn(
              "plan-agent-package-icon flex size-9 items-center justify-center text-muted-foreground transition-colors",
              selected && "text-foreground",
            )}
          >
            <Icon className="size-4" strokeWidth={1.6} />
          </span>
          <span className="plan-agent-package-count">
            {selected ? `${pkgIncludedCount}/${pkg.sections.length}` : pkg.sections.length}
          </span>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                selected ? "border-foreground bg-foreground" : "border-border/80 bg-background",
              )}
            >
              {selected ? <span className="size-1.5 rounded-full bg-background" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {pkg.subtitle}
              </p>
              <h3 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                {pkg.label}
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                {pkg.description}
              </p>
            </span>
          </div>
        </div>
      </button>

      <div className="plan-agent-section-inventory mt-auto">
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleExpand}
          className="plan-agent-section-inventory-toggle flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50"
          aria-expanded={expanded}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Section inventory
          </p>
          <ChevronDown
            className={cn("size-4 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")}
          />
        </button>

        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden px-4 pb-4"
          >
            <div className="mb-2.5 flex items-center justify-end gap-2 text-[10px] font-medium">
              {selected ? (
                <>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setAllSectionsIncluded(true)}
                    className="text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground/35">|</span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setAllSectionsIncluded(false)}
                    className="text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  >
                    Clear all
                  </button>
                </>
              ) : (
                <p className="text-muted-foreground">Select package to configure</p>
              )}
            </div>

            <div className="max-h-56 space-y-1 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
              {pkg.sections.map((section) => {
                const deliverable = section.deliverables[0];
                const included = selected && !excludedSectionIds.includes(section.id);
                const isLastIncluded = selected && included && pkgIncludedCount <= 1;

                return (
                  <label
                    key={section.id}
                    className={cn(
                      "plan-agent-section-row flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition",
                      selected ? (included ? "" : "opacity-55") : "cursor-default",
                      isLastIncluded && "cursor-not-allowed",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected ? included : true}
                      disabled={disabled || !selected || isLastIncluded}
                      onChange={() => toggleSectionIncluded(section.id)}
                      className="mt-0.5 size-3.5 shrink-0 rounded-sm border-border accent-foreground"
                      aria-label={`Include ${section.label}`}
                    />
                    <span className="w-5 shrink-0 pt-px font-mono text-[10px] text-muted-foreground">
                      {String(section.number).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[12px] font-medium",
                          included || !selected
                            ? "text-foreground"
                            : "text-muted-foreground line-through",
                        )}
                      >
                        {section.label}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {section.description}
                      </span>
                    </span>
                    <span className="shrink-0 border border-border/50 bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                      {formatBadge(deliverable.format)}
                    </span>
                  </label>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </div>

      <div className="plan-agent-package-footer flex items-center justify-between gap-3 px-4 py-3">
        <span
          className={cn(
            "border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            "rounded-[var(--plan-agent-radius-sm)]",
            selected
              ? "border-border/70 bg-background/80 text-foreground"
              : "border-border/60 bg-background text-muted-foreground",
          )}
        >
          {selected ? "Selected" : "Available"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {pkg.sections.length} sections
        </span>
      </div>
    </div>
  );
}

function DeliverablePackagesGrid({
  target,
  onTargetChange,
  excludedSectionIds,
  onExcludedSectionIdsChange,
  disabled,
}: {
  target: PlanGenerateTarget;
  onTargetChange: (target: PlanGenerateTarget) => void;
  excludedSectionIds: string[];
  onExcludedSectionIdsChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  const [expandedTarget, setExpandedTarget] = useState<PlanGenerateTarget | null>(target);

  useEffect(() => {
    setExpandedTarget(target);
  }, [target]);

  return (
    <div role="radiogroup" aria-label="Deliverable package" className="grid gap-4 lg:grid-cols-2">
      {DELIVERABLE_PACKAGES.map((pkg) => (
          <DeliverablePackageColumn
            key={pkg.id}
            pkg={pkg}
            selected={target === pkg.id}
            expanded={expandedTarget === pkg.id}
            onSelect={() => {
              onTargetChange(pkg.id);
              setExpandedTarget(pkg.id);
            }}
            onToggleExpand={() => setExpandedTarget(expandedTarget === pkg.id ? null : pkg.id)}
            excludedSectionIds={excludedSectionIds}
            onExcludedSectionIdsChange={onExcludedSectionIdsChange}
            disabled={disabled}
          />
        ))}
    </div>
  );
}

function BriefInputModeSwitch({
  mode,
  onModeChange,
  disabled,
}: {
  mode: PlanBriefInputMode;
  onModeChange: (mode: PlanBriefInputMode) => void;
  disabled: boolean;
}) {
  const options = [
    { id: "prompt" as const, label: "Write prompt", icon: PenLine },
    { id: "upload" as const, label: "Upload document", icon: Upload },
  ] as const;

  return (
    <div className="plan-agent-mode-switch" role="tablist" aria-label="Brief input mode">
      {options.map((option) => {
        const Icon = option.icon;
        const active = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onModeChange(option.id)}
            className={cn(
              "plan-agent-mode-option",
              active && "plan-agent-mode-option-active",
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.75} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ProjectBriefPanel({
  mode,
  onModeChange,
  prompt,
  onPromptChange,
  uploadedFile,
  uploadedBrief,
  uploadError,
  extractingBrief,
  onFileSelect,
  onRemoveFile,
  disabled,
}: {
  mode: PlanBriefInputMode;
  onModeChange: (mode: PlanBriefInputMode) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  uploadedFile: File | null;
  uploadedBrief: string;
  uploadError: string | null;
  extractingBrief: boolean;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
  disabled: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const promptWords = countBriefWords(prompt);
  const promptQuality = resolveBriefQuality(promptWords);
  const uploadedWords = countBriefWords(uploadedBrief);
  const uploadedQuality = resolveBriefQuality(uploadedWords);

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileSelect(file);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <section className="plan-agent-panel flex flex-col overflow-hidden">
      <PanelHeader
        title="Project brief"
        description={
          mode === "prompt"
            ? "Describe goals, users, constraints, and technical direction in your own words."
            : "Import an existing brief — PDF, TXT, or Markdown — and the agent will use extracted text."
        }
        meta={<BriefInputModeSwitch mode={mode} onModeChange={onModeChange} disabled={disabled} />}
      />

      {mode === "prompt" ? (
        <>
          <textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="Example: Build a B2B analytics platform for operations teams. Multi-tenant architecture, role-based access, real-time dashboards, and Stripe billing…"
            rows={14}
            disabled={disabled}
            className="plan-agent-brief-input block min-h-[220px] w-full resize-none px-5 py-4 text-[14px] leading-[1.7] text-foreground outline-none placeholder:text-muted-foreground/40"
          />
          <div className="plan-agent-brief-footer flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <p
              className={cn(
                "text-[11px] font-medium",
                promptQuality.tone === "great" && "text-primary",
                promptQuality.tone === "good" && "text-foreground",
                promptQuality.tone === "muted" && "text-muted-foreground",
              )}
            >
              {promptQuality.label}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {promptWords.toLocaleString()} words
            </p>
          </div>
        </>
      ) : (
        <div className="px-5 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept={PLAN_BRIEF_ACCEPT}
            className="hidden"
            disabled={disabled || extractingBrief}
            onChange={handleFileInput}
          />

          {!uploadedFile ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                "plan-agent-dropzone flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center transition",
                dragOver && "plan-agent-dropzone-active",
              )}
            >
              {extractingBrief ? (
                <>
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <p className="mt-3 text-[13px] font-medium text-foreground">
                    Extracting document text…
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">This usually takes a few seconds.</p>
                </>
              ) : (
                <>
                  <span className="plan-agent-package-icon flex size-12 items-center justify-center text-muted-foreground shadow-sm">
                    <Upload className="size-5" strokeWidth={1.5} />
                  </span>
                  <p className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                    Drop your document here
                  </p>
                  <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
                    The planning agent reads your file and uses it as the project brief source of truth.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                    {["PDF", "TXT", "Markdown"].map((format) => (
                      <span key={format} className="plan-agent-format-pill">
                        {format}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      studioButtonSecondary("mt-5 h-9 rounded-[var(--plan-agent-radius-sm)] px-4 text-[12px]"),
                    )}
                  >
                    Browse files
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="plan-agent-file-card flex items-center justify-between gap-3 px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center border border-border/55 bg-background/80 text-primary">
                    <FileText className="size-4" strokeWidth={1.6} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {uploadedFile.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(0)} KB ·{" "}
                      {uploadedWords.toLocaleString()} words extracted
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={disabled || extractingBrief}
                  onClick={onRemoveFile}
                  className="shrink-0 rounded-sm p-1.5 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
                  aria-label="Remove uploaded document"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="overflow-hidden rounded-[var(--plan-agent-radius-sm)] border border-border/50 bg-background/50">
                <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Extracted brief preview
                  </p>
                  <p
                    className={cn(
                      "text-[10px] font-medium",
                      uploadedQuality.tone === "great" && "text-primary",
                      uploadedQuality.tone === "good" && "text-foreground",
                      uploadedQuality.tone === "muted" && "text-muted-foreground",
                    )}
                  >
                    {uploadedQuality.label}
                  </p>
                </div>
                <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap px-3 py-3 font-sans text-[12px] leading-relaxed text-muted-foreground [scrollbar-width:thin]">
                  {uploadedBrief}
                </pre>
              </div>

              <button
                type="button"
                disabled={disabled || extractingBrief}
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              >
                Replace document
              </button>
            </div>
          )}

          {uploadError ? (
            <p className="mt-3 text-[12px] text-destructive">{uploadError}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function PlanAgentTrigger({
  prompt,
  onPromptChange,
  briefInputMode,
  onBriefInputModeChange,
  uploadedFile,
  uploadedBrief,
  uploadError,
  extractingBrief,
  onFileSelect,
  onRemoveFile,
  target,
  onTargetChange,
  excludedSectionIds,
  onExcludedSectionIdsChange,
  onSubmit,
  disabled,
  recentPlans = [],
  onOpenRecentPlan,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  briefInputMode: PlanBriefInputMode;
  onBriefInputModeChange: (mode: PlanBriefInputMode) => void;
  uploadedFile: File | null;
  uploadedBrief: string;
  uploadError: string | null;
  extractingBrief: boolean;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
  target: PlanGenerateTarget;
  onTargetChange: (target: PlanGenerateTarget) => void;
  excludedSectionIds: string[];
  onExcludedSectionIdsChange: (ids: string[]) => void;
  onSubmit: () => void;
  disabled: boolean;
  recentPlans?: RecentStudioPlan[];
  onOpenRecentPlan?: (planId: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const includedCount = resolveIncludedSectionIds(target, excludedSectionIds).length;
  const activeBrief = briefInputMode === "prompt" ? prompt : uploadedBrief;
  const hasBrief = activeBrief.trim().length > 0;
  const canSubmit = hasBrief && includedCount > 0 && !disabled && !extractingBrief;
  const submitHint = resolveSubmitHint({ hasBrief, includedCount, extractingBrief });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSubmit) {
        event.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canSubmit, onSubmit]);

  const recentItems = recentPlans.map((plan) => ({
    id: plan.id,
    title: plan.title,
    openedAt: plan.openedAt,
    statusLabel: plan.status === "complete" ? "Complete" : "Draft",
    statusTone: plan.status === "complete" ? ("success" as const) : ("muted" as const),
  }));

  const selectedPackage = useMemo(
    () => DELIVERABLE_PACKAGES.find((item) => item.id === target),
    [target],
  );

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="plan-agent-shell flex w-full justify-center px-4 py-8 md:px-8 md:py-12"
    >
      <div className="plan-agent-inner w-full max-w-[1120px]">
        <header className="max-w-3xl">
          <span className="plan-agent-eyebrow">
            <Sparkles className="size-3" strokeWidth={2} />
            Studio Planning
          </span>
          <h1 className="mt-4 text-[1.85rem] font-semibold tracking-[-0.035em] text-foreground md:text-[2.15rem] md:leading-[1.1]">
            Project intelligence briefing
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            Define scope, configure your deliverable package, and launch the planning agent to
            produce structured, review-ready project content.
          </p>
        </header>

        <div className="plan-agent-stack mt-9">
          <section>
            <PlanAgentStageRail
              step="01"
              label="Project brief"
              hint={hasBrief ? `${countBriefWords(activeBrief).toLocaleString()} words` : "Prompt or document"}
            />
            <ProjectBriefPanel
              mode={briefInputMode}
              onModeChange={onBriefInputModeChange}
              prompt={prompt}
              onPromptChange={onPromptChange}
              uploadedFile={uploadedFile}
              uploadedBrief={uploadedBrief}
              uploadError={uploadError}
              extractingBrief={extractingBrief}
              onFileSelect={onFileSelect}
              onRemoveFile={onRemoveFile}
              disabled={disabled}
            />
          </section>

          <section>
            <PlanAgentStageRail
              step="02"
              label="Deliverable package"
              hint={
                selectedPackage
                  ? `${includedCount} of ${selectedPackage.sections.length} sections`
                  : "Synopsis or documentation"
              }
            />
            <DeliverablePackagesGrid
              target={target}
              onTargetChange={onTargetChange}
              excludedSectionIds={excludedSectionIds}
              onExcludedSectionIdsChange={onExcludedSectionIdsChange}
              disabled={disabled}
            />
          </section>

          <section>
            <PlanAgentStageRail
              step="03"
              label="Launch agent"
              hint={canSubmit ? "Ready · ⌘ Enter" : submitHint ?? "Complete steps above"}
            />
            <div className="plan-agent-launch-bar plan-agent-panel overflow-hidden">
              <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 gap-2.5 sm:grid-cols-3">
                  <div className="plan-agent-stat-tile">
                    <p className="plan-agent-stat-label">Brief source</p>
                    <p className="plan-agent-stat-value">
                      {briefInputMode === "upload" ? "Document" : "Written prompt"}
                    </p>
                    <p className="plan-agent-stat-meta">
                      {hasBrief
                        ? `${countBriefWords(activeBrief).toLocaleString()} words`
                        : "Not provided"}
                    </p>
                  </div>
                  <div className="plan-agent-stat-tile">
                    <p className="plan-agent-stat-label">Package</p>
                    <p className="plan-agent-stat-value">{selectedPackage?.label ?? "—"}</p>
                    <p className="plan-agent-stat-meta">
                      {selectedPackage?.subtitle ?? "Select a deliverable"}
                    </p>
                  </div>
                  <div className="plan-agent-stat-tile">
                    <p className="plan-agent-stat-label">Generation scope</p>
                    <p className="plan-agent-stat-value">
                      {includedCount > 0 ? `${includedCount} sections` : "—"}
                    </p>
                    <p className="plan-agent-stat-meta">
                      {selectedPackage
                        ? `${includedCount} of ${selectedPackage.sections.length} included`
                        : "Configure inventory"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={onSubmit}
                    className={cn(
                      studioButtonPrimary("h-11 w-full shrink-0 rounded-[var(--plan-agent-radius-sm)] px-6 text-[13px] transition-transform sm:w-auto"),
                      canSubmit && "plan-agent-cta-ready",
                      !canSubmit && "cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Play className="size-3.5 fill-current" />
                    Launch planning agent
                  </button>
                </div>
              </div>
            </div>
          </section>

          <StudioRecentList
            title="Recent plans"
            items={recentItems}
            emptyLabel="No plans yet. Launch the planning agent to create your first workspace."
            icon={ClipboardList}
            disabled={disabled}
            className="mt-1"
            onSelect={(id) => onOpenRecentPlan?.(id)}
          />
        </div>
      </div>
    </motion.div>
  );
}

function logTone(level: PlanGenerateLogEntry["level"]): string {
  if (level === "success") return "text-emerald-400";
  if (level === "error") return "text-red-400";
  return "text-[#8b949e]";
}

function targetLabel(target: PlanGenerateTarget): string {
  return target === "synopsis" ? "Project Synopsis" : "Project Documentation";
}

export function PlanAgentRunView({
  progress,
  logs,
  target,
}: {
  progress: PlanGenerateProgress | null;
  logs: PlanGenerateLogEntry[];
  target: PlanGenerateTarget;
}) {
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const percent = progress?.percent ?? 0;
  const done = progress?.done ?? 0;
  const total = progress?.total ?? 0;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs.length]);

  return (
    <div className="plan-agent-shell flex w-full justify-center px-4 py-8 md:px-8 md:py-12">
      <div className="plan-agent-inner w-full max-w-[900px]">
        <header>
          <span className="plan-agent-eyebrow">
            <Loader2 className="size-3 animate-spin" />
            Agent in progress
          </span>
          <h1 className="mt-4 text-[1.65rem] font-semibold tracking-[-0.03em] text-foreground md:text-[1.9rem]">
            Generating {targetLabel(target)}
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            {progress?.label
              ? `Currently processing: ${progress.label}`
              : "Initializing the section pipeline and preparing your workspace…"}
          </p>
        </header>

        <div className="plan-agent-panel mt-8 overflow-hidden p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Completion
              </p>
              <p className="mt-1 text-[2.75rem] font-semibold tabular-nums leading-none tracking-tight text-foreground">
                {percent}
                <span className="text-xl text-muted-foreground">%</span>
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground">
                {done} of {total} sections generated
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-[var(--plan-agent-radius-sm)] border border-border/60 bg-muted/15 px-3 py-2 text-[11px] text-muted-foreground">
              <Layers className="size-3.5" />
              Workspace opens automatically when complete
            </div>
          </div>

          <div className="plan-agent-run-progress-track mt-5">
            <div className="plan-agent-run-progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="plan-agent-panel mt-4 overflow-hidden">
          <div className="plan-agent-panel-header flex items-center justify-between px-5 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Execution log
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">{logs.length} events</p>
          </div>
          <div className="plan-agent-run-terminal max-h-[360px] overflow-y-auto px-5 py-4 text-[11px] leading-relaxed [scrollbar-width:thin]">
            {logs.length === 0 ? (
              <p className="text-[#8b949e]">Awaiting agent output…</p>
            ) : (
              logs.map((entry) => (
                <p key={entry.id} className={cn("py-0.5", logTone(entry.level))}>
                  <span className="text-[#6e7681]">
                    {new Date(entry.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>{" "}
                  {entry.message}
                </p>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
