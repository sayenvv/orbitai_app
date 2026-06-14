"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  Globe,
  Layers,
  Loader2,
  MonitorPlay,
  Paperclip,
  Play,
  RefreshCw,
  Rocket,
  Search,
  Shield,
  Square,
  Terminal,
  X,
  type LucideIcon,
} from "lucide-react";

import { platformApi, type PlatformOpenIdeResult, type PlatformStreamEvent } from "@/lib/orbit-api";
import { OrbitIdeEditorCard, VsCodeEditorCard } from "@/components/platform/platform-ide-buttons";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const STUDIO_TEMPLATES: Array<{
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  prompt: string;
}> = [
  {
    id: "html",
    title: "Static site",
    subtitle: "HTML, CSS & vanilla JS",
    icon: Globe,
    prompt:
      "Build a simple HTML and CSS portfolio website with hero, projects, and contact sections",
  },
  {
    id: "nextjs",
    title: "Next.js app",
    subtitle: "React with TypeScript",
    icon: Code2,
    prompt: "Build a modern Next.js portfolio website with dark mode and responsive layout",
  },
  {
    id: "fullstack",
    title: "Full stack",
    subtitle: "FastAPI + React",
    icon: Layers,
    prompt: "Create a FastAPI + React project with user login and a dashboard",
  },
];

export const PIPELINE_PHASES = [
  {
    id: "discover",
    label: "Discover",
    description: "Understand intent and requirements",
    icon: Search,
    stages: ["intent_classification", "requirements", "planning"],
  },
  {
    id: "design",
    label: "Design",
    description: "Architecture and file plan",
    icon: Layers,
    stages: ["architecture", "task_breakdown"],
  },
  {
    id: "build",
    label: "Build",
    description: "Generate and write source files",
    icon: Code2,
    stages: ["code_generation", "write_files"],
  },
  {
    id: "verify",
    label: "Verify",
    description: "Validate, fix, and review",
    icon: Shield,
    stages: ["validation", "fix", "review"],
  },
  {
    id: "ship",
    label: "Ship",
    description: "Document, zip, and deliver",
    icon: Box,
    stages: ["documentation", "artifact", "upload"],
  },
] as const;

export const STAGE_ORDER = PIPELINE_PHASES.flatMap((phase) => phase.stages);

export type PhaseStatus = "pending" | "active" | "done" | "error";

export function stageIndex(stage: string | undefined): number {
  if (!stage) return -1;
  return STAGE_ORDER.indexOf(stage);
}

export function getPhaseStatus(
  phaseStages: readonly string[],
  activeStage: string,
  running: boolean,
  completed: boolean,
  failed: boolean,
): PhaseStatus {
  const activeIdx = stageIndex(activeStage);
  const first = stageIndex(phaseStages[0]);
  const last = stageIndex(phaseStages[phaseStages.length - 1]);

  if (completed) return "done";
  if (failed && activeIdx >= first && activeIdx <= last) return "error";
  if (activeIdx > last) return "done";
  if (running && activeIdx >= first && activeIdx <= last) return "active";
  if (!running && activeIdx >= first && activeIdx <= last && failed) return "error";
  return "pending";
}

const FEED_TYPES = new Set([
  "workflow_started",
  "agent_started",
  "agent_completed",
  "file_created",
  "zip_created",
  "command_log",
  "command_failed",
  "fix_started",
  "completed",
  "error",
]);

export function filterActivityLogs(events: PlatformStreamEvent[]): PlatformStreamEvent[] {
  return events.filter((event) => FEED_TYPES.has(event.type));
}

export function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function feedLabel(event: PlatformStreamEvent): string {
  if (event.type === "file_created") {
    const paths = event.payload?.paths as string[] | undefined;
    if (paths?.length) return paths.join(", ");
  }
  return event.message ?? event.type.replaceAll("_", " ");
}

type LogLevel = "info" | "success" | "warn" | "error" | "system";

function logLevel(event: PlatformStreamEvent): LogLevel {
  switch (event.type) {
    case "completed":
    case "agent_completed":
    case "file_created":
    case "zip_created":
      return "success";
    case "error":
    case "command_failed":
      return "error";
    case "fix_started":
    case "command_log":
      return "warn";
    case "workflow_started":
      return "system";
    default:
      return "info";
  }
}

function logLevelLabel(level: LogLevel): string {
  switch (level) {
    case "success":
      return "OK";
    case "error":
      return "ERR";
    case "warn":
      return "WARN";
    case "system":
      return "SYS";
    default:
      return "INFO";
  }
}

function logLevelClass(level: LogLevel): string {
  switch (level) {
    case "success":
      return "text-emerald-600 dark:text-emerald-400";
    case "error":
      return "text-red-500 dark:text-red-400";
    case "warn":
      return "text-amber-600 dark:text-amber-400";
    case "system":
      return "text-violet-600 dark:text-violet-400";
    default:
      return "text-muted-foreground";
  }
}

function logStageLabel(event: PlatformStreamEvent): string {
  return (event.stage ?? event.type).replaceAll("_", " ");
}

export function PlatformBackdrop({
  children,
  plain = false,
  home = false,
}: {
  children: React.ReactNode;
  plain?: boolean;
  home?: boolean;
}) {
  if (plain) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        {children}
      </div>
    );
  }

  if (home) {
    return (
      <div className="platform-home-backdrop relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora opacity-60" />
        <div className="grid-dots absolute inset-0 opacity-[0.28]" />
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary/[0.05] to-transparent" />
      </div>
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function PlatformHomeComposer({
  prompt,
  onPromptChange,
  onSubmit,
  disabled,
  running,
  attachedFiles,
  onAttachClick,
  onRemoveFile,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  running: boolean;
  attachedFiles: File[];
  onAttachClick: () => void;
  onRemoveFile: (index: number) => void;
}) {
  const canSubmit = prompt.trim().length > 0 && !disabled;

  return (
    <div className="platform-home-panel overflow-hidden">
      {attachedFiles.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-b border-border/60 px-4 py-3">
          {attachedFiles.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-xs"
            >
              <Paperclip className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => onRemoveFile(index)}
                className="text-muted-foreground transition hover:text-destructive"
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && canSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        rows={3}
        disabled={disabled}
        placeholder="Describe the project you want to build…"
        className="block w-full resize-none bg-transparent px-5 pb-2 pt-4 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 md:min-h-[6.5rem] md:text-base"
      />

      <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/15 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={onAttachClick}
            disabled={disabled}
            title="Attach reference files"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-foreground disabled:opacity-50"
          >
            <Paperclip className="size-4" />
          </button>
          <span className="hidden truncate text-[12px] text-muted-foreground sm:inline">
            {running ? "Generation in progress" : "Enter to generate"}
          </span>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-all",
            canSubmit
              ? "bg-foreground text-background hover:opacity-90"
              : "cursor-not-allowed bg-muted text-muted-foreground/50",
          )}
        >
          {running ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Running
            </>
          ) : (
            <>
              Generate
              <ArrowUp className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function PlatformTemplatePills({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {STUDIO_TEMPLATES.map((template) => {
        const Icon = template.icon;
        return (
          <button
            key={template.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(template.prompt)}
            className="group flex items-center gap-3 rounded-lg border border-border/70 bg-card px-3.5 py-3 text-left shadow-sm transition hover:border-border hover:bg-muted/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground transition group-hover:text-foreground">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-foreground">{template.title}</span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {template.subtitle}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PlatformHomeFooter() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[12px] text-muted-foreground/75">
      {PIPELINE_PHASES.map((phase, index) => (
        <span key={phase.id} className="inline-flex items-center gap-1">
          {index > 0 ? <span className="px-1 text-muted-foreground/35">·</span> : null}
          <span>{phase.label}</span>
        </span>
      ))}
    </div>
  );
}

type StudioComposerProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  running: boolean;
  compact?: boolean;
  showUpload?: boolean;
  attachedFiles?: File[];
  onAttachClick?: () => void;
  onRemoveFile?: (index: number) => void;
};

export function StudioComposer({
  prompt,
  onPromptChange,
  onSubmit,
  disabled,
  running,
  compact = false,
  showUpload = false,
  attachedFiles = [],
  onAttachClick,
  onRemoveFile,
}: StudioComposerProps) {
  const canSubmit = prompt.trim().length > 0 && !disabled;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10",
        compact ? "px-4 pb-3 pt-3" : "px-4 pb-3.5 pt-4",
      )}
    >
      {attachedFiles.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs"
            >
              <Paperclip className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
              {onRemoveFile ? (
                <button
                  type="button"
                  onClick={() => onRemoveFile(index)}
                  className="text-muted-foreground transition hover:text-destructive"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && canSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        rows={compact ? 2 : 3}
        disabled={disabled}
        placeholder="Describe the project you want built…"
        className={cn(
          "w-full resize-none bg-transparent text-foreground outline-none placeholder:text-muted-foreground/45",
          compact ? "min-h-[2.5rem] text-sm leading-relaxed" : "min-h-[4.5rem] text-[15px] leading-relaxed",
        )}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          {showUpload && onAttachClick ? (
            <button
              type="button"
              onClick={onAttachClick}
              disabled={disabled}
              title="Attach reference files (coming soon)"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition hover:bg-black/[0.04] hover:text-foreground disabled:opacity-50 dark:hover:bg-white/[0.06]"
            >
              <Paperclip className="size-4" />
            </button>
          ) : null}
          <p className="truncate text-[12px] text-muted-foreground/70">
            {running
              ? "Generation in progress"
              : showUpload
                ? "Attach specs · Enter to generate"
                : "Press Enter to generate · Shift+Enter for new line"}
          </p>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-[13px] font-medium transition-colors",
          canSubmit
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "cursor-not-allowed bg-muted text-muted-foreground/50",
        )}
        >
          {running ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Running
            </>
          ) : (
            <>
              <Rocket className="size-4" />
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function TemplateGrid({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {STUDIO_TEMPLATES.map((template) => {
        const Icon = template.icon;
        return (
          <button
            key={template.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(template.prompt)}
            className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card p-4 text-left transition-colors hover:border-border hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-muted-foreground transition-colors group-hover:bg-muted/60 group-hover:text-foreground">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{template.title}</span>
              <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
                {template.subtitle}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function LiveStatusBar({
  message,
  running,
  elapsed,
}: {
  message: string;
  running: boolean;
  elapsed: number;
}) {
  return (
    <div className="glass-surface glass-card flex items-center gap-3 rounded-2xl px-4 py-3">
      <span
        className={cn(
          "relative flex size-2.5 shrink-0",
          running && "before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-emerald-500/40",
        )}
      >
        <span
          className={cn(
            "relative inline-flex size-2.5 rounded-full",
            running ? "bg-emerald-500" : "bg-muted-foreground/30",
          )}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {message || (running ? "Starting workflow…" : "Ready")}
        </p>
      </div>
      {running ? (
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {formatElapsed(elapsed)}
        </span>
      ) : null}
    </div>
  );
}

export function PhaseRail({
  activeStage,
  running,
  completed,
  failed,
}: {
  activeStage: string;
  running: boolean;
  completed: boolean;
  failed: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="glass-surface glass-card rounded-2xl p-4 md:sticky md:top-4 md:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
        Pipeline
      </p>
      <ol className="mt-4 space-y-0">
        {PIPELINE_PHASES.map((phase, index) => {
          const status = getPhaseStatus(phase.stages, activeStage, running, completed, failed);
          const Icon = phase.icon;
          const isLast = index === PIPELINE_PHASES.length - 1;

          return (
            <li key={phase.id} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[15px] top-9 h-[calc(100%-0.75rem)] w-px",
                    status === "done" ? "bg-emerald-500/35" : "bg-border/70",
                  )}
                />
              ) : null}
              <div
                className={cn(
                  "relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                  status === "done" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  status === "active" && "border-foreground/15 bg-foreground/[0.06] text-foreground",
                  status === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
                  status === "pending" && "border-border/60 bg-background/40 text-muted-foreground/50",
                )}
              >
                {status === "done" ? (
                  <Check className="size-3.5" />
                ) : status === "active" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Icon className="size-3.5" />
                )}
              </div>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-[13px] font-semibold leading-none",
                    status === "pending" ? "text-muted-foreground/70" : "text-foreground",
                  )}
                >
                  {phase.label}
                </p>
                <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{phase.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {!reduceMotion && running ? (
        <motion.div
          aria-hidden
          className="mt-3 h-0.5 overflow-hidden rounded-full bg-muted/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full w-1/3 rounded-full bg-foreground/70"
            animate={{ x: ["-100%", "320%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      ) : null}
    </div>
  );
}

export function ExecutionLog({
  events,
  running,
  className,
  variant = "default",
  showHeader = true,
}: {
  events: PlatformStreamEvent[];
  running: boolean;
  className?: string;
  variant?: "default" | "terminal";
  showHeader?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => filterActivityLogs(events), [events]);
  const isTerminal = variant === "terminal";

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [filtered.length, running]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl",
        isTerminal
          ? "border border-white/10 bg-[#0b0f14] text-[#e6edf3] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "glass-surface glass-card h-[min(420px,52vh)]",
        className,
      )}
    >
      {showHeader ? (
        <div
          className={cn(
            "flex shrink-0 items-center justify-between border-b px-4 py-3",
            isTerminal ? "border-white/10 bg-[#111820]" : "border-border/40",
          )}
        >
          <div className="flex items-center gap-2">
            <Terminal className={cn("size-3.5", isTerminal ? "text-emerald-400/90" : "text-muted-foreground/70")} />
            <div>
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.16em]",
                  isTerminal ? "text-[#8b949e]" : "text-muted-foreground/90",
                )}
              >
                Agent terminal
              </p>
              <p className={cn("text-[11px]", isTerminal ? "text-[#6e7681]" : "text-muted-foreground/70")}>
                {filtered.length} entries{running ? " · live" : ""}
              </p>
            </div>
          </div>
          {running ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                isTerminal
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              )}
            >
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              Streaming
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]",
          isTerminal
            ? "bg-[#0b0f14] font-mono text-[11px] leading-5"
            : "bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)]",
        )}
      >
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-[12rem] items-center justify-center px-6 py-8 text-center">
            <p
              className={cn(
                "max-w-xs text-[13px] leading-relaxed",
                isTerminal ? "text-[#6e7681]" : "text-muted-foreground",
              )}
            >
              {running
                ? "Waiting for agent output…"
                : "Pipeline output will stream here as agents run."}
            </p>
          </div>
        ) : isTerminal ? (
          <div className="space-y-0 px-3 py-2">
            {filtered.map((event, index) => {
              const level = logLevel(event);
              const line = index + 1;
              return (
                <div
                  key={`${event.type}-${index}`}
                  className={cn(
                    "flex gap-2 rounded px-1 py-0.5",
                    level === "error" && "bg-red-500/10",
                    level === "success" && event.type === "completed" && "bg-emerald-500/10",
                  )}
                >
                  <span className="w-8 shrink-0 tabular-nums text-[#484f58]">{line}</span>
                  <span className={cn("w-10 shrink-0 font-semibold", logLevelClass(level))}>
                    {logLevelLabel(level)}
                  </span>
                  <span className="w-24 shrink-0 capitalize text-[#8b949e]">{logStageLabel(event)}</span>
                  <span className="min-w-0 flex-1 break-all text-[#c9d1d9]">{feedLabel(event)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <table className="w-full border-collapse font-mono text-[11px] leading-5">
            <thead className="sticky top-0 z-[1] bg-[color-mix(in_oklab,var(--background)_92%,transparent)] backdrop-blur-sm">
              <tr className="border-b border-border/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground/60">
                <th className="w-10 px-3 py-2 font-medium">#</th>
                <th className="w-12 px-2 py-2 font-medium">Lvl</th>
                <th className="w-28 px-2 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event, index) => {
                const level = logLevel(event);
                const line = index + 1;
                return (
                  <tr
                    key={`${event.type}-${index}`}
                    className={cn(
                      "border-b border-border/20 transition-colors hover:bg-foreground/[0.03]",
                      level === "error" && "bg-destructive/[0.04]",
                      level === "success" && event.type === "completed" && "bg-emerald-500/[0.04]",
                    )}
                  >
                    <td className="px-3 py-1.5 tabular-nums text-muted-foreground/45">{line}</td>
                    <td className={cn("px-2 py-1.5 font-semibold", logLevelClass(level))}>
                      {logLevelLabel(level)}
                    </td>
                    <td className="px-2 py-1.5 capitalize text-muted-foreground/80">
                      {logStageLabel(event)}
                    </td>
                    <td
                      className="max-w-0 truncate px-3 py-1.5 text-foreground/90"
                      title={feedLabel(event)}
                    >
                      {feedLabel(event)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/** Legacy alias */
export function ActivityFeed(props: { events: PlatformStreamEvent[]; running: boolean }) {
  return <ExecutionLog {...props} />;
}

export function SuccessPanel({
  downloadHref,
  summary,
}: {
  downloadHref: string;
  summary?: string;
}) {
  return (
    <section className="platform-center-card shrink-0">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Check className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Project ready</p>
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {summary ?? "Your codebase has been packaged and is ready to download."}
            </p>
          </div>
        </div>
        <a
          href={downloadHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Download className="size-4" />
          Download ZIP
        </a>
      </div>
    </section>
  );
}

export function IdleHero({
  prompt,
  onPromptChange,
  onSubmit,
  running,
  onTemplateSelect,
  attachedFiles,
  onAttachClick,
  onRemoveFile,
  fileInputRef,
  onFileChange,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  running: boolean;
  onTemplateSelect: (prompt: string) => void;
  attachedFiles: File[];
  onAttachClick: () => void;
  onRemoveFile: (index: number) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4 py-10 md:px-6 md:py-14"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.json,.zip,.html,.css,.js,.ts,.tsx,.py"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="w-full max-w-[680px]">
        <header className="text-center">
          <p className="text-[13px] font-medium text-muted-foreground">Platform</p>
          <h1 className="mt-2 text-[1.875rem] font-semibold tracking-[-0.025em] text-foreground md:text-[2.125rem] md:leading-[1.15]">
            What should we build?
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            One prompt runs the full pipeline — architecture, code, validation, preview, and export.
          </p>
        </header>

        <div className="mt-10">
          <PlatformHomeComposer
            prompt={prompt}
            onPromptChange={onPromptChange}
            onSubmit={onSubmit}
            disabled={running}
            running={running}
            attachedFiles={attachedFiles}
            onAttachClick={onAttachClick}
            onRemoveFile={onRemoveFile}
          />
        </div>

        <div className="mt-8">
          <p className="mb-3 text-center text-[13px] text-muted-foreground">Quick start</p>
          <PlatformTemplatePills onSelect={onTemplateSelect} disabled={running} />
        </div>

        <div className="mt-10">
          <PlatformHomeFooter />
        </div>
      </div>
    </motion.div>
  );
}

const AGENT_PANEL_DEFAULT_WIDTH = 340;
const AGENT_PANEL_MIN_WIDTH = 280;
const AGENT_PANEL_MAX_WIDTH = 520;

const DETAIL_PANEL_DEFAULT_WIDTH = 380;
const DETAIL_PANEL_MIN_WIDTH = 280;
const DETAIL_PANEL_MAX_WIDTH = 560;

export function formatStageLabel(stage: string): string {
  return stage.replaceAll("_", " ");
}

function extractCreatedFiles(events: PlatformStreamEvent[]): string[] {
  const files: string[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (event.type !== "file_created") continue;
    const paths = event.payload?.paths as string[] | undefined;
    if (!paths?.length) continue;
    for (const path of paths) {
      if (seen.has(path)) continue;
      seen.add(path);
      files.push(path);
    }
  }

  return files;
}

function getLatestAgent(events: PlatformStreamEvent[]): string | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === "agent_started" && event.agent) return event.agent;
  }
  return null;
}

function getStageStatus(
  stage: string,
  activeStage: string,
  running: boolean,
  completed: boolean,
  failed: boolean,
): PhaseStatus {
  const idx = stageIndex(stage);
  const activeIdx = stageIndex(activeStage);
  if (completed) return "done";
  if (failed && idx === activeIdx) return "error";
  if (idx < activeIdx) return "done";
  if (idx === activeIdx && running) return "active";
  if (idx === activeIdx && failed) return "error";
  return "pending";
}

function GenerationStatsBar({
  elapsed,
  progress,
  fileCount,
  activeStage,
  activeAgent,
  running,
  completed,
}: {
  elapsed: number;
  progress: number;
  fileCount: number;
  activeStage: string;
  activeAgent: string | null;
  running: boolean;
  completed: boolean;
}) {
  const stats = [
    {
      label: "Elapsed",
      value: formatElapsed(elapsed),
      mono: true,
    },
    {
      label: "Progress",
      value: `${progress}%`,
      mono: true,
    },
    {
      label: "Files",
      value: String(fileCount),
      mono: true,
    },
    {
      label: running ? "Stage" : completed ? "Status" : "Stage",
      value: completed
        ? "Complete"
        : activeStage
          ? formatStageLabel(activeStage)
          : running
            ? "Starting…"
            : "—",
      mono: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-md border border-border/60 bg-background/60 px-3 py-2.5"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {stat.label}
          </p>
          <p
            className={cn(
              "mt-1 truncate text-sm font-medium text-foreground",
              stat.mono && "font-mono tabular-nums",
            )}
          >
            {stat.value}
          </p>
        </div>
      ))}
      {activeAgent && running ? (
        <div className="col-span-2 rounded-md border border-border/60 bg-background/60 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Active agent
          </p>
          <p className="mt-1 truncate text-sm font-medium text-foreground">{activeAgent}</p>
        </div>
      ) : null}
    </div>
  );
}

function WorkspacePromptCard({ prompt }: { prompt: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/60 px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Prompt
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-foreground">{prompt}</p>
    </div>
  );
}

function PipelineDetailPanel({
  activeStage,
  running,
  completed,
  failed,
}: {
  activeStage: string;
  running: boolean;
  completed: boolean;
  failed: boolean;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/60 px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Pipeline
      </p>
      <ol className="mt-3 space-y-3">
        {PIPELINE_PHASES.map((phase, index) => {
          const phaseStatus = getPhaseStatus(phase.stages, activeStage, running, completed, failed);
          const Icon = phase.icon;
          const isLast = index === PIPELINE_PHASES.length - 1;

          return (
            <li key={phase.id} className="relative">
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[11px] top-7 h-[calc(100%+0.25rem)] w-px",
                    phaseStatus === "done" ? "bg-emerald-500/35" : "bg-border/70",
                  )}
                />
              ) : null}
              <div className="relative flex gap-2.5">
                <span
                  className={cn(
                    "relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-md border",
                    phaseStatus === "done" &&
                      "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    phaseStatus === "active" &&
                      "border-foreground/15 bg-foreground/[0.06] text-foreground",
                    phaseStatus === "error" &&
                      "border-destructive/30 bg-destructive/10 text-destructive",
                    phaseStatus === "pending" &&
                      "border-border/60 bg-background text-muted-foreground/50",
                  )}
                >
                  {phaseStatus === "done" ? (
                    <Check className="size-3" />
                  ) : phaseStatus === "active" ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Icon className="size-3" />
                  )}
                </span>
                <div className="min-w-0 flex-1 pb-1">
                  <p
                    className={cn(
                      "text-xs font-semibold leading-none",
                      phaseStatus === "pending" ? "text-muted-foreground/70" : "text-foreground",
                    )}
                  >
                    {phase.label}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {phase.description}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {phase.stages.map((stage) => {
                      const stageStatus = getStageStatus(
                        stage,
                        activeStage,
                        running,
                        completed,
                        failed,
                      );
                      return (
                        <li
                          key={stage}
                          className={cn(
                            "flex items-center gap-2 rounded px-1.5 py-0.5 text-[11px]",
                            stageStatus === "active" && "bg-muted/60 text-foreground",
                            stageStatus === "done" && "text-muted-foreground",
                            stageStatus === "pending" && "text-muted-foreground/60",
                            stageStatus === "error" && "bg-destructive/10 text-destructive",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              stageStatus === "done" && "bg-emerald-500",
                              stageStatus === "active" && "bg-foreground",
                              stageStatus === "error" && "bg-destructive",
                              stageStatus === "pending" && "bg-muted-foreground/30",
                            )}
                          />
                          <span className="truncate capitalize">{formatStageLabel(stage)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function GeneratedFilesPanel({ files }: { files: string[] }) {
  if (files.length === 0) {
    return (
      <div className="rounded-md border border-border/60 bg-background/60 px-3 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Generated files
        </p>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Files appear here as agents write them to the workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/60 bg-background/60 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Generated files
        </p>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {files.length}
        </span>
      </div>
      <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto [scrollbar-width:thin]">
        {files.map((file) => (
          <li
            key={file}
            className="flex items-center gap-2 rounded px-1 py-1 text-[11px] text-foreground hover:bg-muted/40"
          >
            <FileCode className="size-3 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono">{file}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AgentActivityFeed({
  events,
  running,
}: {
  events: PlatformStreamEvent[];
  running: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => filterActivityLogs(events), [events]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [filtered.length, running]);

  return (
    <div ref={scrollRef} className="platform-log min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
      {filtered.length === 0 ? (
        <div className="flex h-full min-h-[14rem] flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            {running ? "Waiting for agent output" : "No activity"}
          </p>
          <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
            {running
              ? "Pipeline events will appear here as agents execute."
              : "Start a generation to view the activity stream."}
          </p>
        </div>
      ) : (
        <ul>
          {filtered.map((event, index) => {
            const level = logLevel(event);
            const isCommand = event.type === "command_log" || event.type === "command_failed";
            return (
              <li
                key={`${event.type}-${index}`}
                className="platform-log-row border-b border-border/40 px-3 py-2.5 last:border-b-0"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      level === "success" && "bg-emerald-500",
                      level === "error" && "bg-destructive",
                      level === "warn" && "bg-amber-500",
                      level === "info" && "bg-muted-foreground/50",
                      level === "system" && "bg-primary",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-[13px] leading-snug text-foreground",
                        isCommand && "font-mono text-[12px]",
                      )}
                    >
                      {feedLabel(event)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {logStageLabel(event)}
                    </p>
                  </div>
                  {level === "info" && running && event.type === "agent_started" ? (
                    <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {running ? (
        <div className="sticky bottom-0 border-t border-border/60 bg-card/95 px-3 py-2 backdrop-blur-sm">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Session in progress
          </p>
        </div>
      ) : null}
    </div>
  );
}

function pipelineProgress(
  activeStage: string,
  running: boolean,
  completed: boolean,
): number {
  if (completed) return 100;
  const idx = stageIndex(activeStage);
  if (idx < 0) return running ? 8 : 0;
  return Math.min(100, Math.round(((idx + 1) / STAGE_ORDER.length) * 100));
}

function PhaseStepper({
  activeStage,
  running,
  completed,
  failed,
}: {
  activeStage: string;
  running: boolean;
  completed: boolean;
  failed: boolean;
}) {
  const progress = pipelineProgress(activeStage, running, completed);

  return (
    <div className="shrink-0 border-b border-border/60 bg-card">
      <div className="flex items-center gap-3 px-4 py-2.5 md:px-5">
        <span className="text-xs font-medium text-muted-foreground">Progress</span>
        <div className="h-1.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              failed ? "bg-destructive" : completed ? "bg-emerald-500" : "bg-foreground/80",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="w-9 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
          {progress}%
        </span>
      </div>
      <ol className="flex items-center divide-x divide-border/60 overflow-x-auto border-t border-border/40 [scrollbar-width:thin]">
        {PIPELINE_PHASES.map((phase, index) => {
          const status = getPhaseStatus(phase.stages, activeStage, running, completed, failed);
          return (
            <li
              key={phase.id}
              className={cn(
                "flex shrink-0 items-center gap-2 px-4 py-2.5 md:px-5",
                status === "active" && "bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full",
                  status === "done" && "bg-emerald-500 text-white",
                  status === "active" && "bg-foreground text-background",
                  status === "error" && "bg-destructive text-destructive-foreground",
                  status === "pending" && "border border-border bg-background",
                )}
              >
                {status === "done" ? (
                  <Check className="size-2.5" strokeWidth={3} />
                ) : status === "active" ? (
                  <span className="size-1.5 rounded-full bg-current" />
                ) : (
                  <span className="size-1 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  status === "pending" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {phase.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function WorkspaceResizeHandle({
  onDrag,
  side = "right",
  ariaLabel = "Resize panel",
}: {
  onDrag: (deltaX: number) => void;
  side?: "left" | "right";
  ariaLabel?: string;
}) {
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      let lastX = event.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const rawDelta = moveEvent.clientX - lastX;
        lastX = moveEvent.clientX;
        const delta = side === "left" ? rawDelta : -rawDelta;
        if (delta !== 0) onDrag(delta);
      };

      const handleMouseUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onDrag, side],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      onMouseDown={handleMouseDown}
      className="group relative hidden w-1 shrink-0 cursor-col-resize bg-border/40 lg:block hover:bg-primary/30"
    />
  );
}

export function StudioWorkspace({
  prompt,
  running,
  activeStage,
  liveMessage,
  elapsed,
  logs,
  artifactUrl,
  error,
  workflowRunId,
  onRunAgain,
}: {
  prompt: string;
  running: boolean;
  activeStage: string;
  liveMessage: string;
  elapsed: number;
  logs: PlatformStreamEvent[];
  artifactUrl: string | null;
  error: string | null;
  workflowRunId: string | null;
  onRunAgain: () => void;
}) {
  const completed = Boolean(artifactUrl) && !running;
  const failed = Boolean(error) && !running;
  const downloadHref = artifactUrl
    ? artifactUrl.startsWith("http")
      ? artifactUrl
      : `${typeof window !== "undefined" ? window.location.origin : ""}${artifactUrl}`
    : null;

  const completedEvent = logs.find((event) => event.type === "completed");
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);
  const [detailPanelWidth, setDetailPanelWidth] = useState(DETAIL_PANEL_DEFAULT_WIDTH);
  const [agentPanelOpen, setAgentPanelOpen] = useState(true);
  const [agentPanelWidth, setAgentPanelWidth] = useState(AGENT_PANEL_DEFAULT_WIDTH);
  const createdFiles = useMemo(() => extractCreatedFiles(logs), [logs]);
  const activeAgent = useMemo(() => getLatestAgent(logs), [logs]);
  const progress = pipelineProgress(activeStage, running, completed);

  const title = completed ? "Build complete" : running ? "Generating" : "Project studio";
  const statusLabel = completed ? "Complete" : failed ? "Failed" : running ? "Running" : "Ready";
  const statusClass = completed
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : failed
      ? "bg-destructive/10 text-destructive"
      : running
        ? "bg-muted text-foreground"
        : "bg-muted text-muted-foreground";

  return (
    <div className="platform-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="platform-toolbar flex h-11 shrink-0 items-center gap-3 px-4 md:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="hidden text-xs text-muted-foreground sm:inline">Platform</span>
          <ChevronRight className="hidden size-3 text-muted-foreground/40 sm:inline" aria-hidden />
          <h1 className="truncate text-sm font-medium text-foreground">Generation</h1>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
              statusClass,
            )}
          >
            {statusLabel}
          </span>
        </div>

        <div className="hidden min-w-0 flex-1 px-6 lg:block">
          <p className="truncate text-center text-xs text-muted-foreground">
            {running ? liveMessage : prompt || title}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {running ? (
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {formatElapsed(elapsed)}
            </span>
          ) : null}
          {!detailPanelOpen ? (
            <button
              type="button"
              onClick={() => setDetailPanelOpen(true)}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/50"
            >
              Details
            </button>
          ) : null}
          {!agentPanelOpen ? (
            <button
              type="button"
              onClick={() => setAgentPanelOpen(true)}
              className="hidden rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/50 lg:inline-flex"
            >
              Activity
            </button>
          ) : null}
          {!running && !completed ? (
            <button
              type="button"
              onClick={onRunAgain}
              disabled={!prompt.trim()}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              New generation
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <PhaseStepper
            activeStage={activeStage}
            running={running}
            completed={completed}
            failed={failed}
          />
          <div className="platform-canvas flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            {detailPanelOpen ? (
              <>
                <aside
                  className="platform-detail-panel flex max-h-[42vh] w-full shrink-0 flex-col overflow-hidden border-b border-border/60 lg:max-h-none lg:w-[var(--detail-panel-width)] lg:border-b-0 lg:border-r"
                  style={{ ["--detail-panel-width" as string]: `${detailPanelWidth}px` }}
                >
                  <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">Details</span>
                      {running ? (
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailPanelOpen(false)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Close details panel"
                      aria-label="Close details panel"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 [scrollbar-width:thin]">
                    <GenerationStatsBar
                      elapsed={elapsed}
                      progress={progress}
                      fileCount={createdFiles.length}
                      activeStage={activeStage}
                      activeAgent={activeAgent}
                      running={running}
                      completed={completed}
                    />
                    {prompt ? <WorkspacePromptCard prompt={prompt} /> : null}
                    <PipelineDetailPanel
                      activeStage={activeStage}
                      running={running}
                      completed={completed}
                      failed={failed}
                    />
                    <GeneratedFilesPanel files={createdFiles} />
                  </div>
                </aside>
                <WorkspaceResizeHandle
                  side="left"
                  ariaLabel="Resize details panel"
                  onDrag={(delta) =>
                    setDetailPanelWidth((width) =>
                      Math.min(
                        DETAIL_PANEL_MAX_WIDTH,
                        Math.max(DETAIL_PANEL_MIN_WIDTH, width + delta),
                      ),
                    )
                  }
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setDetailPanelOpen(true)}
                title="Open details panel"
                aria-label="Open details panel"
                className="hidden shrink-0 items-center border-r border-border/60 px-2 text-muted-foreground hover:bg-muted/30 hover:text-foreground lg:flex"
              >
                <ChevronRight className="size-4" />
              </button>
            )}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div
                className={cn(
                  "platform-center-stack flex min-h-0 flex-1 flex-col overflow-hidden",
                  !completed && "overflow-y-auto [scrollbar-width:thin]",
                )}
              >
                {running ? (
                  <div className="platform-center-card shrink-0 px-4 py-3.5 sm:px-5 sm:py-4">
                    <div className="flex items-start gap-3">
                      <span className="relative mt-0.5 flex size-2.5 shrink-0">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/40" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {liveMessage || "Generating project…"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activeAgent
                            ? `${activeAgent} · ${formatStageLabel(activeStage || "workflow")}`
                            : formatStageLabel(activeStage || "workflow")}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {formatElapsed(elapsed)}
                      </span>
                    </div>
                  </div>
                ) : null}

                {downloadHref ? (
                  <SuccessPanel
                    downloadHref={downloadHref}
                    summary={completedEvent?.message ?? undefined}
                  />
                ) : null}

                {completed && workflowRunId ? (
                  <PreviewLaunchPanel
                    runId={workflowRunId}
                    fillHeight
                    className="platform-center-card min-h-0 flex-1"
                  />
                ) : null}

                {error ? (
                  <div className="platform-center-card shrink-0 border-destructive/30 bg-destructive/[0.04] px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}

                {!downloadHref && !completed && running ? (
                  <div className="platform-center-card hidden shrink-0 px-5 py-8 text-center md:block">
                    <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium text-foreground">Building your project</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Track pipeline progress in the detail panel. Agent logs stream in Activity on the
                      right.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </main>

        {agentPanelOpen ? (
          <>
            <WorkspaceResizeHandle
              side="right"
              ariaLabel="Resize activity panel"
              onDrag={(delta) =>
                setAgentPanelWidth((width) =>
                  Math.min(AGENT_PANEL_MAX_WIDTH, Math.max(AGENT_PANEL_MIN_WIDTH, width + delta)),
                )
              }
            />
            <aside
              className="platform-side-panel flex min-h-[240px] w-full shrink-0 flex-col border-t lg:min-h-0 lg:w-[var(--agent-panel-width)] lg:border-l lg:border-t-0"
              style={{ ["--agent-panel-width" as string]: `${agentPanelWidth}px` }}
            >
              <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">Activity</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {filterActivityLogs(logs).length}
                  </span>
                  {running ? (
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setAgentPanelOpen(false)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Close activity panel"
                  aria-label="Close activity panel"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <AgentActivityFeed events={logs} running={running} />
            </aside>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAgentPanelOpen(true)}
            title="Open activity panel"
            aria-label="Open activity panel"
            className="hidden shrink-0 items-center border-l border-border/60 px-2 text-muted-foreground hover:bg-muted/30 hover:text-foreground lg:flex"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function resolvePreviewProxyUrl(runId: string, proxyPath: string | null | undefined): string | null {
  if (!proxyPath) return null;
  if (proxyPath.startsWith("http")) {
    return proxyPath.replace(/\/+$/, "");
  }
  if (typeof window === "undefined") return proxyPath.replace(/\/+$/, "");
  const origin = window.location.origin;
  const path = proxyPath.startsWith("/") ? proxyPath : `/${proxyPath}`;
  return `${origin}${path}`.replace(/\/+$/, "");
}

function previewStatusLabel({
  previewActive,
  previewReady,
  previewStarting,
}: {
  previewActive: boolean;
  previewReady: boolean;
  previewStarting: boolean;
}): { label: string; tone: "idle" | "booting" | "live" | "starting" } {
  if (previewStarting) return { label: "Starting", tone: "starting" };
  if (previewActive && previewReady) return { label: "Live", tone: "live" };
  if (previewActive) return { label: "Booting", tone: "booting" };
  return { label: "Idle", tone: "idle" };
}

function PreviewStatusChip({
  previewActive,
  previewReady,
  previewStarting,
}: {
  previewActive: boolean;
  previewReady: boolean;
  previewStarting: boolean;
}) {
  const { label, tone } = previewStatusLabel({ previewActive, previewReady, previewStarting });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        tone === "live" &&
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tone === "booting" &&
          "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "starting" &&
          "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "idle" && "border-border/60 bg-muted/40 text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "live" && "bg-emerald-500",
          (tone === "booting" || tone === "starting") && "animate-pulse bg-amber-500",
          tone === "idle" && "bg-muted-foreground/40",
        )}
      />
      {label}
    </span>
  );
}

function PreviewUrlBar({
  url,
  onCopy,
  copied,
}: {
  url: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="platform-preview-url flex items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2">
      <Globe className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 truncate rounded-md border border-border/50 bg-background/80 px-2.5 py-1 font-mono text-[11px] text-foreground/90">
        {url}
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
        title="Copy preview URL"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
      >
        <ExternalLink className="size-3" />
        Open
      </a>
    </div>
  );
}

function PreviewEmptyState({
  previewActive,
  previewReady,
  onStart,
  starting,
}: {
  previewActive: boolean;
  previewReady: boolean;
  onStart: () => void;
  starting: boolean;
}) {
  if (previewActive && !previewReady) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="relative flex size-12 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
          <span className="relative flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-card">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Starting preview server</p>
          <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            Installing dependencies and booting the dev server. Output streams in the console below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-5 px-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-b from-muted/50 to-muted/20 text-muted-foreground shadow-sm">
        <MonitorPlay className="size-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">No preview running</p>
        <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          Launch a local preview to interact with your generated app in a secure sandboxed frame.
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={starting}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />}
        Start preview
      </button>
    </div>
  );
}

export function PreviewLaunchPanel({
  runId,
  className,
  fillHeight = false,
}: {
  runId: string;
  className?: string;
  fillHeight?: boolean;
}) {
  const router = useRouter();
  const [previewActive, setPreviewActive] = useState(false);
  const [previewStarting, setPreviewStarting] = useState(false);
  const [previewStopping, setPreviewStopping] = useState(false);
  const [previewLogs, setPreviewLogs] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewStack, setPreviewStack] = useState<string | null>(null);
  const [previewCommand, setPreviewCommand] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [ideLoading, setIdeLoading] = useState(false);
  const [ideResult, setIdeResult] = useState<PlatformOpenIdeResult | null>(null);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (previewActive && !previewReady) setConsoleOpen(true);
  }, [previewActive, previewReady]);

  useEffect(() => {
    if (previewReady) setConsoleOpen(false);
  }, [previewReady]);

  useEffect(() => {
    const node = logScrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [previewLogs.length]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void platformApi
      .getPreviewStatus(runId)
      .then((status) => {
        if (cancelled || !status.preview_proxy_url) return;
        setPreviewUrl(resolvePreviewProxyUrl(runId, status.preview_proxy_url));
        if (status.stack) setPreviewStack(status.stack);
        if (status.command) setPreviewCommand(status.command);
        if (status.ready || status.stack === "static") {
          setPreviewReady(true);
        }
        if (status.active) setPreviewActive(true);
      })
      .catch(() => {
        // Preview status is optional until the user starts a run.
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const appendPreviewLog = useCallback((line: string) => {
    setPreviewLogs((prev) => [...prev, line]);
  }, []);

  const consumePreviewStream = useCallback(async () => {
    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      for await (const event of platformApi.streamPreview(runId)) {
        if (controller.signal.aborted) break;

        if (event.type === "preview_started") {
          setPreviewActive(true);
          setPreviewReady(false);
          setPreviewStack(event.stack ?? null);
          setPreviewCommand(event.command ?? null);
          if (event.command) appendPreviewLog(`$ ${event.command}`);
        }

        if (event.type === "preview_ready") {
          setPreviewReady(true);
          const proxy = resolvePreviewProxyUrl(
            runId,
            event.preview_proxy_url ?? `/api/platform/runs/${runId}/preview/proxy`,
          );
          setPreviewUrl(proxy);
        }

        if (event.type === "log" && event.message) {
          appendPreviewLog(event.message);
        }

        if (event.type === "preview_ended") {
          setPreviewActive(false);
          appendPreviewLog(`Preview ended (${event.status ?? "stopped"})`);
        }

        if (event.type === "error" && event.message) {
          setPreviewError(event.message);
          appendPreviewLog(event.message);
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Preview stream failed";
      setPreviewError(message);
      appendPreviewLog(message);
    }
  }, [appendPreviewLog, runId]);

  const handleStartPreview = useCallback(async () => {
    setPreviewStarting(true);
    setPreviewError(null);
    setPreviewLogs([]);
    setPreviewUrl(null);
    setPreviewReady(false);

    try {
      const status = await platformApi.startPreview(runId);
      if (status.command) appendPreviewLog(`$ ${status.command}`);
      if (status.stack) setPreviewStack(status.stack);
      if (status.command) setPreviewCommand(status.command);
      setPreviewActive(Boolean(status.active));
      if (status.preview_proxy_url) {
        setPreviewReady(true);
        setPreviewUrl(resolvePreviewProxyUrl(runId, status.preview_proxy_url));
      }
      void consumePreviewStream();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start preview";
      setPreviewError(message);
      appendPreviewLog(message);
    } finally {
      setPreviewStarting(false);
    }
  }, [appendPreviewLog, consumePreviewStream, runId]);

  const handleStopPreview = useCallback(async () => {
    setPreviewStopping(true);
    streamAbortRef.current?.abort();
    try {
      await platformApi.stopPreview(runId);
      setPreviewActive(false);
      setPreviewReady(false);
      setPreviewUrl(null);
      appendPreviewLog("Preview stopped.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to stop preview";
      setPreviewError(message);
    } finally {
      setPreviewStopping(false);
    }
  }, [appendPreviewLog, runId]);

  const ensureIdeImport = useCallback(async () => {
    if (ideResult) return ideResult;
    setIdeLoading(true);
    setPreviewError(null);
    try {
      const result = await platformApi.openInIde(runId);
      setIdeResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open in IDE";
      setPreviewError(message);
      throw err;
    } finally {
      setIdeLoading(false);
    }
  }, [ideResult, runId]);

  const handleOpenOrbitIde = useCallback(async () => {
    try {
      const result = await ensureIdeImport();
      const href = result.orbit_ide_url.startsWith("/")
        ? result.orbit_ide_url
        : `${routes.code}?projectId=${encodeURIComponent(result.project_id)}`;
      router.push(href);
    } catch {
      // error already surfaced
    }
  }, [ensureIdeImport, router]);

  const handleOpenVsCode = useCallback(async () => {
    try {
      const result = await ensureIdeImport();
      window.location.href = result.vscode_url;
    } catch {
      // error already surfaced
    }
  }, [ensureIdeImport]);

  const stackLabel = useMemo(() => {
    if (previewStack === "node") return "Node dev server";
    if (previewStack === "static") return "Static site";
    return "Auto-detected";
  }, [previewStack]);

  const handleCopyUrl = useCallback(async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      setUrlCopied(true);
      window.setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in some contexts.
    }
  }, [previewUrl]);

  const handleRefreshPreview = useCallback(() => {
    setIframeKey((key) => key + 1);
  }, []);

  return (
    <section
      className={cn(
        "platform-preview-shell flex min-h-0 flex-col overflow-hidden",
        fillHeight && "flex-1",
        className,
      )}
    >
      <div className="platform-preview-toolbar flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground">
            <MonitorPlay className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none text-foreground">App preview</p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{stackLabel}</p>
          </div>
        </div>

        <PreviewStatusChip
          previewActive={previewActive}
          previewReady={previewReady}
          previewStarting={previewStarting}
        />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {previewUrl && previewReady ? (
            <>
              <button
                type="button"
                onClick={handleRefreshPreview}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-[12px] font-medium text-foreground transition hover:bg-muted/50"
                title="Refresh preview"
              >
                <RefreshCw className="size-3.5" />
                Refresh
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-[12px] font-medium text-foreground transition hover:bg-muted/50"
              >
                <ExternalLink className="size-3.5" />
                New tab
              </a>
            </>
          ) : null}

          {previewActive ? (
            <button
              type="button"
              onClick={handleStopPreview}
              disabled={previewStopping}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/[0.04] px-3 py-1.5 text-[12px] font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
            >
              {previewStopping ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Square className="size-3 fill-current" />
              )}
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartPreview}
              disabled={previewStarting}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {previewStarting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5 fill-current" />
              )}
              Run preview
            </button>
          )}
        </div>
      </div>

      {previewUrl && previewReady ? (
        <PreviewUrlBar url={previewUrl} onCopy={handleCopyUrl} copied={urlCopied} />
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-col overflow-hidden",
          fillHeight ? "flex-1" : "min-h-[360px]",
        )}
      >
        <div className="platform-preview-viewport relative min-h-0 flex-1 overflow-hidden bg-[#f6f8fa] dark:bg-[#0d1117]">
          {previewUrl && previewReady ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] flex h-7 items-center gap-1.5 border-b border-black/[0.06] bg-white/90 px-3 backdrop-blur-sm dark:border-white/[0.06] dark:bg-[#161b22]/90">
                <span className="size-2 rounded-full bg-[#ff5f57]" />
                <span className="size-2 rounded-full bg-[#febc2e]" />
                <span className="size-2 rounded-full bg-[#28c840]" />
                <span className="ml-2 truncate font-mono text-[10px] text-muted-foreground">
                  {previewUrl.replace(/^https?:\/\//, "")}
                </span>
              </div>
              <iframe
                key={iframeKey}
                title="Generated app preview"
                src={previewUrl}
                className="absolute inset-x-0 bottom-0 top-7 w-full border-0 bg-white"
                sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
              />
            </>
          ) : (
            <PreviewEmptyState
              previewActive={previewActive}
              previewReady={previewReady}
              onStart={handleStartPreview}
              starting={previewStarting}
            />
          )}
        </div>

        <div className="flex shrink-0 flex-col border-t border-border/60">
          <button
            type="button"
            onClick={() => setConsoleOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 bg-muted/20 px-4 py-1.5 text-left transition hover:bg-muted/35"
          >
            <div className="flex items-center gap-2">
              <Terminal className="size-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Console output
              </span>
              {previewLogs.length > 0 ? (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {previewLogs.length}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {previewCommand ? (
                <span className="hidden truncate font-mono text-[10px] text-muted-foreground sm:inline">
                  {previewCommand}
                </span>
              ) : null}
              {consoleOpen ? (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronUp className="size-3.5 text-muted-foreground" />
              )}
            </div>
          </button>

          {consoleOpen ? (
            <div
              ref={logScrollRef}
              className={cn(
                "platform-terminal overflow-y-auto p-3 text-[11px] leading-5 [scrollbar-width:thin]",
                fillHeight ? "max-h-[min(28vh,220px)] min-h-[120px]" : "min-h-[160px] max-h-[220px]",
              )}
            >
              {previewLogs.length === 0 ? (
                <p className="text-[#8b949e]">
                  {previewCommand
                    ? "Starting preview server…"
                    : "Server logs appear here when you run a preview."}
                </p>
              ) : (
                previewLogs.map((line, index) => (
                  <div key={`${index}-${line.slice(0, 24)}`} className="whitespace-pre-wrap break-all">
                    {line}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      {previewError ? (
        <div className="shrink-0 border-t border-destructive/20 bg-destructive/[0.04] px-4 py-2 text-[13px] text-destructive">
          {previewError}
        </div>
      ) : null}

      {!fillHeight ? (
        <div className="shrink-0 border-t border-border/60 bg-muted/10 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Continue in editor
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Import the project and keep iterating locally.
              </p>
            </div>
            <div className="grid w-full gap-2 sm:w-auto sm:min-w-[420px] sm:grid-cols-2">
              <OrbitIdeEditorCard
                onClick={handleOpenOrbitIde}
                disabled={ideLoading}
                loading={ideLoading && !ideResult}
                icon={<Code2 className="size-5 text-foreground/85" />}
              />
              <VsCodeEditorCard
                onClick={handleOpenVsCode}
                disabled={ideLoading}
                loading={ideLoading && !ideResult}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t border-border/60 bg-muted/10 px-3 py-2">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Continue in editor
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <OrbitIdeEditorCard
              onClick={handleOpenOrbitIde}
              disabled={ideLoading}
              loading={ideLoading && !ideResult}
              icon={<Code2 className="size-5 text-foreground/85" />}
            />
            <VsCodeEditorCard
              onClick={handleOpenVsCode}
              disabled={ideLoading}
              loading={ideLoading && !ideResult}
            />
          </div>
        </div>
      )}
    </section>
  );
}
