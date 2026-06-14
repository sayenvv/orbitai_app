"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  Box,
  Check,
  Code2,
  Download,
  ExternalLink,
  Globe,
  Layers,
  Loader2,
  MonitorPlay,
  Paperclip,
  Play,
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

export function PlatformBackdrop({ children }: { children: React.ReactNode }) {
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

export function StudioEyebrow() {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/90">
      Project studio
    </p>
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
        "glass-surface glass-composer glass-card rounded-[1.5rem]",
        compact ? "px-4 pb-3 pt-3" : "px-5 pb-4 pt-5",
      )}
    >
      {attachedFiles.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="glass-chip inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs"
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
            "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all",
            canSubmit
              ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
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
            className="glass-surface glass-card glass-card-interactive group flex items-start gap-3 rounded-2xl p-4 text-left disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="glass-icon-well mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl">
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
    <div className="glass-surface glass-card flex h-[min(420px,52vh)] flex-col overflow-hidden rounded-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Terminal className="size-3.5 text-muted-foreground/70" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
              Execution log
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              {filtered.length} entries{running ? " · live" : ""}
            </p>
          </div>
        </div>
        {running ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Streaming
          </span>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] [scrollbar-width:thin]"
      >
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 py-8 text-center">
            <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              Pipeline output will stream here as agents run.
            </p>
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass-surface glass-card overflow-hidden rounded-2xl"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Check className="size-5" />
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">Project delivered</p>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
              {summary ?? "Your generated codebase has been packaged and is ready to download."}
            </p>
          </div>
        </div>
        <a
          href={downloadHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Download className="size-4" />
          Download ZIP
        </a>
      </div>
    </motion.div>
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
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-10 text-center md:py-16"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.json,.zip,.html,.css,.js,.ts,.tsx,.py"
        className="hidden"
        onChange={onFileChange}
      />

      <StudioEyebrow />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-[2.35rem] md:leading-[1.12]">
        Describe it.
        <br />
        <span className="text-muted-foreground">Ship a full project.</span>
      </h1>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
        One prompt becomes architecture, source files, validation, and a downloadable ZIP — HTML,
        React, or full stack.
      </p>

      <div className="mt-8 w-full text-left">
        <StudioComposer
          prompt={prompt}
          onPromptChange={onPromptChange}
          onSubmit={onSubmit}
          disabled={running}
          running={running}
          showUpload
          attachedFiles={attachedFiles}
          onAttachClick={onAttachClick}
          onRemoveFile={onRemoveFile}
        />
        <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
          Reference file upload is saved locally for now — backend ingestion coming soon.
        </p>
      </div>

      <div className="mt-8 w-full text-left">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
          Start from a template
        </p>
        <TemplateGrid onSelect={onTemplateSelect} disabled={running} />
      </div>
    </motion.div>
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

  return (
    <div className="mx-auto flex h-[min(100%,100dvh)] w-full max-w-6xl flex-col px-4 py-5 md:px-8 md:py-6">
      <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <StudioEyebrow />
          <h1 className="mt-1.5 truncate text-xl font-semibold tracking-tight md:text-2xl">
            {completed ? "Build complete" : running ? "Building your project" : "Project studio"}
          </h1>
          {!running && prompt ? (
            <p className="mt-1 line-clamp-1 text-[13px] text-muted-foreground">{prompt}</p>
          ) : null}
        </div>
        {!running && !completed ? (
          <button
            type="button"
            onClick={onRunAgain}
            disabled={!prompt.trim()}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <ArrowUp className="size-4" />
            Run again
          </button>
        ) : null}
      </div>

      <div className="mb-4 shrink-0 space-y-3">
        <LiveStatusBar message={liveMessage} running={running} elapsed={elapsed} />

        {downloadHref ? (
          <SuccessPanel
            downloadHref={downloadHref}
            summary={completedEvent?.message ?? undefined}
          />
        ) : null}

        {completed && workflowRunId ? (
          <PreviewLaunchPanel runId={workflowRunId} />
        ) : null}

        {error ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/[0.04] px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-5">
        <PhaseRail
          activeStage={activeStage}
          running={running}
          completed={completed}
          failed={failed}
        />
        <ExecutionLog events={logs} running={running} />
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

export function PreviewLaunchPanel({ runId }: { runId: string }) {
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
  const logScrollRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

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
    if (previewStack === "static") return "Static HTTP server";
    return "Auto-detected stack";
  }, [previewStack]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass-surface glass-card overflow-hidden rounded-2xl"
    >
      <div className="flex flex-col gap-4 border-b border-border/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="glass-icon-well flex size-10 shrink-0 items-center justify-center rounded-xl">
            <MonitorPlay className="size-4" />
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">Preview & launch</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              Run the generated app, then open it in your editor of choice.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {previewActive ? (
            <button
              type="button"
              onClick={handleStopPreview}
              disabled={previewStopping}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/25 bg-destructive/[0.06] px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
            >
              {previewStopping ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Square className="size-3.5 fill-current" />
              )}
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartPreview}
              disabled={previewStarting}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {previewStarting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4 fill-current" />
              )}
              Run preview
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="flex min-h-[280px] flex-col border-b border-border/40 lg:min-h-[340px] lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Terminal className="size-3.5 text-muted-foreground/70" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
                Preview terminal
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground/70">{stackLabel}</span>
          </div>

          <div
            ref={logScrollRef}
            className="min-h-0 flex-1 overflow-y-auto bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] p-3 font-mono text-[11px] leading-5 [scrollbar-width:thin]"
          >
            {previewLogs.length === 0 ? (
              <p className="text-muted-foreground/70">
                {previewCommand
                  ? "Starting preview server…"
                  : "Run preview to stream install and dev-server logs here."}
              </p>
            ) : (
              previewLogs.map((line, index) => (
                <div key={`${index}-${line.slice(0, 24)}`} className="whitespace-pre-wrap break-all text-foreground/90">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex min-h-[280px] flex-col lg:min-h-[340px]">
          <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
              Live preview
            </p>
            {previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                Open tab
                <ExternalLink className="size-3" />
              </a>
            ) : previewActive && !previewReady ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Starting…
              </span>
            ) : null}
          </div>

          <div className="relative min-h-0 flex-1 bg-[color-mix(in_oklab,var(--foreground)_2%,transparent)]">
            {previewUrl && previewReady ? (
              <iframe
                title="Generated app preview"
                src={previewUrl}
                className="absolute inset-0 h-full w-full border-0 bg-white"
                sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
              />
            ) : previewActive && !previewReady ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                  Waiting for the preview server to start…
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-foreground/[0.04] text-muted-foreground">
                  <MonitorPlay className="size-5" />
                </span>
                <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                  Your generated app renders here once the preview server is running.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewError ? (
        <div className="border-t border-destructive/20 bg-destructive/[0.04] px-5 py-2.5 text-sm text-destructive sm:px-6">
          {previewError}
        </div>
      ) : null}

      <div className="border-t border-border/40 px-5 py-4 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
          Open in editor
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
    </motion.div>
  );
}
