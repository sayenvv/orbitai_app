"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, ChevronRight, Loader2, Plus, Sparkles } from "lucide-react";

import { useAppShell } from "@/components/layout/app-shell-context";
import { PlanMarkdownContent } from "@/components/plan/plan-markdown-content";
import { PlanWsContextPicker } from "@/components/plan/plan-studio-chat-context";
import {
  coerceDiagramContent,
  contentToWorksheet,
  worksheetToContent,
  type PlanDeliverableContent,
} from "@/lib/plan-deliverable-content";
import {
  buildPlanChatContextPayload,
  type PlanChatContextPin,
  type PlanChatContextScope,
} from "@/lib/plan-chat-context";
import {
  applyPlanningAssistStreamEvent,
  finalizePlanningAssistStreamLogs,
  type PlanChatLogEntry,
} from "@/lib/plan-chat-stream";
import { ApiError, projectPlanningApi, type ApiProjectPlanningWorksheetContent } from "@/lib/orbit-api";
import {
  readStudioPlanChat,
  writeStudioPlanChat,
  type StoredPlanChatTurn,
} from "@/lib/studio-plan-chat-storage";
import type { SynopsisDeliverable, SynopsisSection } from "@/lib/plan-synopsis-catalog";
import { useAuthStore } from "@/store/auth-store";
import { cn, randomId } from "@/lib/utils";
import type { Message, PlanChatRunLogEntry } from "@/types";

type HistoryTurn = StoredPlanChatTurn;

type PlanStudioChatProps = {
  planId: string;
  projectPrompt: string;
  section: SynopsisSection;
  deliverable: SynopsisDeliverable;
  content: PlanDeliverableContent;
  onContentChange: (content: PlanDeliverableContent) => void;
  onClose: () => void;
  width: number;
};

type Suggestion = { label: string; prompt: string };

function hydrateChatState(planId: string): { messages: Message[]; history: HistoryTurn[] } {
  const stored = readStudioPlanChat(planId);
  if (!stored) {
    return { messages: [], history: [] };
  }

  return {
    messages: stored.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: new Date(message.timestamp),
      ...(message.runLogs?.length
        ? { metadata: { planChatRun: { logs: message.runLogs } } }
        : {}),
    })),
    history: stored.history,
  };
}

function buildSuggestions(deliverable: SynopsisDeliverable): Suggestion[] {
  if (deliverable.format === "diagram") {
    return [
      {
        label: "Expand diagram with more components and flows",
        prompt: "Expand this Mermaid diagram with more components and data flows.",
      },
      {
        label: "Add authentication and error-handling paths",
        prompt: "Add authentication and error-handling paths to the diagram.",
      },
      {
        label: "Simplify the diagram for executives",
        prompt: "Simplify the diagram for an executive audience.",
      },
    ];
  }
  if (deliverable.format === "matrix") {
    return [
      {
        label: "Fill the matrix with owners and statuses",
        prompt: "Fill this matrix with realistic priorities, owners, and statuses.",
      },
      {
        label: "Add rows for risks and requirements",
        prompt: "Add three more rows for key risks or requirements.",
      },
      {
        label: "Align the matrix with the project brief",
        prompt: "Align the matrix with our project brief and constraints.",
      },
    ];
  }
  return [
    {
      label: "Expand with more detail and bullets",
      prompt: "Expand this section with more detail and actionable bullets.",
    },
    {
      label: "Rewrite for clarity and professionalism",
      prompt: "Rewrite this deliverable to be clearer and more professional.",
    },
    {
      label: "Add assumptions, risks, and open questions",
      prompt: "Add assumptions, risks, and open questions to this section.",
    },
  ];
}

function PlanChatRunTimeline({
  logs,
  live = false,
}: {
  logs: PlanChatRunLogEntry[];
  live?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const activeIndex = logs.findLastIndex((entry) => entry.level === "active");

  useEffect(() => {
    if (!live) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [live, logs.length, activeIndex]);

  if (!logs.length) return null;

  return (
    <div
      className="plan-ws-chat-timeline"
      aria-live={live ? "polite" : undefined}
      aria-label="Edit progress"
    >
      <div className="plan-ws-chat-timeline-rail" aria-hidden />
      <ol className="m-0 list-none p-0">
        {logs.map((entry, index) => {
          const isActive = live && entry.level === "active";
          const isLast = index === logs.length - 1;

          return (
            <li
              key={entry.id}
              className={cn(
                "plan-ws-chat-timeline-step",
                entry.level === "success" && "plan-ws-chat-timeline-step--success",
                entry.level === "error" && "plan-ws-chat-timeline-step--error",
                isActive && "plan-ws-chat-timeline-step--active",
                isLast && entry.level === "success" && "plan-ws-chat-timeline-step--done",
              )}
            >
              <span className="plan-ws-chat-timeline-node" aria-hidden>
                {entry.level === "success" ? (
                  <Check className="size-2 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                ) : null}
              </span>
              <span
                className={cn(
                  "plan-ws-chat-timeline-label",
                  isActive && "plan-ws-chat-timeline-shimmer",
                )}
              >
                {entry.message}
              </span>
            </li>
          );
        })}
      </ol>
      <div ref={endRef} />
    </div>
  );
}

function PlanChatAssistantBody({
  logs,
  content,
  live = false,
  isStreaming = false,
}: {
  logs: PlanChatRunLogEntry[];
  content?: string;
  live?: boolean;
  isStreaming?: boolean;
}) {
  const hasLogs = logs.length > 0;
  const hasContent = Boolean(content?.trim());

  if (!hasLogs && !hasContent) return null;

  return (
    <div className="py-1">
      <div
        className={cn(
          "max-w-[92%] rounded-2xl rounded-bl-md",
          hasContent
            ? "border border-border/45 bg-card/75 px-3 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.03]"
            : "bg-transparent px-1 py-0.5",
        )}
      >
        {hasLogs ? <PlanChatRunTimeline logs={logs} live={live} /> : null}
        {hasContent ? (
          <div
            className={cn(
              "plan-ws-chat-turn-prose min-w-0",
              hasLogs && "mt-2.5 border-t border-border/40 pt-2.5 dark:border-white/[0.06]",
            )}
          >
            <PlanMarkdownContent content={content ?? ""} isStreaming={isStreaming} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlanChatTurn({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";
  const runLogs = message.metadata?.planChatRun?.logs ?? [];

  if (isUser) {
    return (
      <div className="flex justify-end py-1">
        <div className="max-w-[92%] rounded-2xl rounded-br-md bg-muted/55 px-3 py-2 dark:bg-white/[0.07]">
          <p className="whitespace-pre-wrap text-[13px] leading-snug tracking-[-0.01em] text-foreground">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PlanChatAssistantBody
      logs={runLogs}
      content={message.content}
      isStreaming={isStreaming}
    />
  );
}

function PlanChatEmptyState({
  suggestions,
  onSelect,
}: {
  suggestions: Suggestion[];
  onSelect: (prompt: string) => void;
}) {
  return (
    <section className="plan-ws-chat-empty px-2 py-3" aria-label="Suggested prompts">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
        Suggestions
      </p>
      <ul className="flex flex-col gap-1.5">
        {suggestions.map((suggestion) => (
          <li key={suggestion.label}>
            <button
              type="button"
              onClick={() => onSelect(suggestion.prompt)}
              className="glass-surface glass-card glass-card-interactive group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors"
            >
              <span className="text-[13px] leading-snug text-muted-foreground transition-colors group-hover:text-foreground">
                {suggestion.label}
              </span>
              <Sparkles className="size-3.5 shrink-0 text-primary/50 transition-colors group-hover:text-primary" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PlanStudioChat({
  planId,
  projectPrompt,
  section,
  deliverable,
  content,
  onContentChange,
  onClose,
  width,
}: PlanStudioChatProps) {
  const { openAuthPrompt } = useAppShell();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadedPlanIdRef = useRef<string | null>(null);
  const initialChat = useMemo(() => hydrateChatState(planId), [planId]);
  const [messages, setMessages] = useState<Message[]>(initialChat.messages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryTurn[]>(initialChat.history);
  const [pinnedContext, setPinnedContext] = useState<PlanChatContextPin | null>(null);
  const [runLogs, setRunLogs] = useState<PlanChatLogEntry[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const runLogsRef = useRef<PlanChatLogEntry[]>([]);

  const suggestions = useMemo(() => buildSuggestions(deliverable), [deliverable]);
  const isEmpty = messages.length === 0;

  useLayoutEffect(() => {
    if (loadedPlanIdRef.current === planId) return;
    loadedPlanIdRef.current = planId;
    const stored = hydrateChatState(planId);
    setMessages(stored.messages);
    setHistory(stored.history);
  }, [planId]);

  useEffect(() => {
    if (!planId || loadedPlanIdRef.current !== planId) return;
    const handle = window.setTimeout(() => {
      writeStudioPlanChat(planId, {
        messages: messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp.getTime(),
          ...(message.metadata?.planChatRun?.logs?.length
            ? { runLogs: message.metadata.planChatRun.logs }
            : {}),
        })),
        history,
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [history, messages, planId]);

  useEffect(() => {
    setInput("");
    setPinnedContext(null);
  }, [deliverable.id, section.id]);

  const contextScope: PlanChatContextScope = pinnedContext ? "section" : "plan";
  const contextModeLabel =
    contextScope === "section" && pinnedContext
      ? `Section ${pinnedContext.sectionNumber}`
      : "Plan";

  const pinActiveSection = () => {
    setPinnedContext({
      sectionId: section.id,
      sectionNumber: section.number,
      sectionLabel: section.label,
      deliverableLabel: deliverable.label,
      deliverableId: deliverable.id,
    });
  };

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
  }, [input]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: isLoading ? "instant" : "smooth",
      block: "end",
    });
  }, [messages, isLoading, runLogs.length]);

  const handleSend = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || isLoading) return;

      if (!isAuthenticated) {
        openAuthPrompt();
        return;
      }

      const userMessage: Message = {
        id: randomId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };
      setMessages((current) => [...current, userMessage]);
      setIsLoading(true);
      setRunLogs([]);
      runLogsRef.current = [];

      const diagramHint =
        deliverable.format === "diagram"
          ? "\n\n[Format note] Store diagram updates as Mermaid inside a paragraph block: ```mermaid ... ```"
          : "";

      try {
        const contextPayload = buildPlanChatContextPayload({
          scope: contextScope,
          projectPrompt,
          pin: pinnedContext,
          sectionContent: content,
        });

        let streamLogs: PlanChatLogEntry[] = [];
        let streamResult: {
          reply: string;
          worksheet?: Record<string, unknown>;
          worksheetUpdated: boolean;
        } | null = null;

        for await (const event of projectPlanningApi.aiAssistStream({
          projectId: planId,
          artifactId: deliverable.id,
          message: trimmed + diagramHint,
          projectName: projectPrompt.slice(0, 80) || "Studio plan",
          projectSummary: projectPrompt,
          phaseLabel: section.label,
          artifactLabel: deliverable.label,
          artifactDescription: deliverable.description,
          artifactFormat: deliverable.format,
          worksheet: contentToWorksheet(content, deliverable.label),
          history,
          ...contextPayload,
        })) {
          if (event.type === "stage_start" || event.type === "stage_done" || event.type === "error") {
            streamLogs = applyPlanningAssistStreamEvent(streamLogs, event);
            runLogsRef.current = streamLogs;
            setRunLogs(streamLogs);
          }

          if (event.type === "error") {
            throw new ApiError(event.message ?? "Edit failed", 500);
          }

          if (event.type === "done") {
            streamResult = {
              reply: event.reply?.trim() ?? "",
              worksheet: event.worksheet,
              worksheetUpdated: Boolean(event.worksheetUpdated),
            };
            streamLogs = finalizePlanningAssistStreamLogs(streamLogs);
            runLogsRef.current = streamLogs;
            setRunLogs(streamLogs);
          }
        }

        if (!streamResult) {
          throw new ApiError("Planning assist stream ended without a result", 500);
        }

        if (streamResult.worksheetUpdated && streamResult.worksheet) {
          const next = worksheetToContent(
            streamResult.worksheet as ApiProjectPlanningWorksheetContent,
            deliverable.format,
            content,
          );
          onContentChange(
            deliverable.format === "diagram"
              ? coerceDiagramContent(deliverable, next, projectPrompt)
              : next,
          );
        }

        const assistantText =
          streamResult.reply ||
          (streamResult.worksheetUpdated
            ? `I've updated **${deliverable.label}** in the center panel.`
            : "Done.");

        const assistantMessage: Message = {
          id: randomId(),
          role: "assistant",
          content: assistantText,
          timestamp: new Date(),
          metadata: {
            planChatRun: { logs: finalizePlanningAssistStreamLogs(streamLogs) },
          },
        };

        setMessages((current) => [...current, assistantMessage]);
        setHistory((current) => [
          ...current,
          { role: "user", content: trimmed },
          { role: "assistant", content: assistantText },
        ]);
      } catch (err) {
        const errorText =
          err instanceof ApiError
            ? err.message
            : "Sorry, something went wrong. Please try again.";
        setMessages((current) => [
          ...current,
          {
            id: randomId(),
            role: "assistant",
            content: errorText,
            timestamp: new Date(),
            metadata: runLogsRef.current.length
              ? { planChatRun: { logs: runLogsRef.current as PlanChatRunLogEntry[] } }
              : undefined,
          },
        ]);
      } finally {
        setIsLoading(false);
        setRunLogs([]);
      }
    },
    [
      content,
      contextScope,
      deliverable,
      history,
      isAuthenticated,
      isLoading,
      onContentChange,
      openAuthPrompt,
      pinnedContext,
      planId,
      projectPrompt,
      section.label,
    ],
  );

  const canSend = Boolean(input.trim()) && !isLoading;

  const submitInput = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    void handleSend(trimmed);
  };

  return (
    <aside
      className="plan-ws-chat platform-side-panel flex min-h-[280px] w-full shrink-0 flex-col overflow-hidden border-t lg:min-h-0 lg:w-[var(--chat-panel-width)] lg:border-t-0"
      style={{ ["--chat-panel-width" as string]: `${width}px` }}
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-3">
        <span className="text-xs font-medium text-foreground">ClovAI</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Close ClovAI"
          aria-label="Close ClovAI"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div ref={scrollRef} className="plan-ws-chat-scroll">
        {isEmpty ? (
          <PlanChatEmptyState
            suggestions={suggestions}
            onSelect={(prompt) => void handleSend(prompt)}
          />
        ) : (
          <div className="flex flex-col gap-2 px-2.5 py-2">
            {messages.map((message) => (
              <PlanChatTurn key={message.id} message={message} />
            ))}
            {isLoading && runLogs.length ? (
              <PlanChatAssistantBody logs={runLogs} live />
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border/60 bg-card px-2 pb-2 pt-1.5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitInput();
          }}
          className="w-full"
        >
          <div className="glass-surface glass-composer w-full rounded-lg border border-border/70 bg-card px-2 pb-1.5 pt-1.5 transition-all focus-within:border-foreground/15 dark:border-white/[0.08] dark:bg-[oklch(0.142_0.005_258)]">
            <PlanWsContextPicker
              section={section}
              deliverable={deliverable}
              pinnedContext={pinnedContext}
              onPin={pinActiveSection}
              onClearPin={() => setPinnedContext(null)}
            />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitInput();
                }
              }}
              rows={1}
              disabled={isLoading}
              placeholder="Describe what to change…"
              className="max-h-[96px] min-h-[1.75rem] w-full resize-none bg-transparent py-0 text-[13px] leading-snug tracking-[-0.01em] text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-60"
              aria-label="Message ClovAI"
            />
            <div className="mt-1 flex items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-0.5">
                {!pinnedContext ? (
                  <>
                    <button
                      type="button"
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/75 transition-colors hover:bg-muted/50 hover:text-foreground"
                      onClick={pinActiveSection}
                      title="Add section to context"
                      aria-label="Add section to context"
                    >
                      <Plus className="size-3.5" strokeWidth={1.75} />
                    </button>
                    <span className="mx-0.5 h-2.5 w-px shrink-0 bg-border/70" aria-hidden />
                  </>
                ) : null}
                <span className="text-[11px] font-medium text-muted-foreground/75">{contextModeLabel}</span>
              </div>
              <button
                type="submit"
                disabled={!canSend}
                className={cn(
                  "press inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-all",
                  canSend
                    ? "bg-foreground text-background shadow-sm hover:opacity-90"
                    : "bg-black/[0.06] text-muted-foreground/50 dark:bg-white/[0.08]",
                )}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="size-3.5" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </aside>
  );
}
