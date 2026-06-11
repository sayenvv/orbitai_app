"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowUp, Check, Loader2, Sparkles } from "lucide-react";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ClovopsChatFileResults } from "@/components/code/clovops-chat-file-results";
import { ClovopsChatTerminal } from "@/components/code/clovops-chat-terminal";
import { ClovopsPlanReviewCard, type PlanReviewPayload } from "@/components/code/clovops-plan-review-card";
import { ClovopsChatReviewResults } from "@/components/code/clovops-chat-review-results";
import { ClovopsWorkflowPanel } from "@/components/code/clovops-workflow-panel";
import { buildAgentGreeting } from "@/lib/agent-greeting";
import {
  appendWorkflowEventsFromStream,
  finalizeWorkflowEvents,
  type ApiCodeWorkspaceWorkflowEvent,
} from "@/lib/clovops-workflow-events";
import {
  codeWorkspaceApi,
  getApiErrorMessage,
  type ApiCodeWorkspaceAgentReview,
  type ApiCodeWorkspaceSearchMatch,
  type ApiCodeWorkspaceTerminalEntry,
} from "@/lib/orbit-api";
import { cn, randomId } from "@/lib/utils";
import type { Message } from "@/types";

export const RIGHT_SIDEBAR_PANEL = {
  id: "clovops" as const,
  label: "Clovops",
  icon: Sparkles,
};

const CLOVOPS_SUGGESTIONS = [
  {
    id: "retry",
    label: "Add retry logic with exponential backoff to the API client",
    prompt:
      "Find the API client file, read it, and add retry logic with exponential backoff to failed requests.",
  },
  {
    id: "rate-limit",
    label: "Improve rate limiting error handling",
    prompt:
      "Find the rate limiter implementation, read it, and improve error handling when limits are exceeded.",
  },
  {
    id: "entry",
    label: "Explain the main entry point and key modules",
    prompt: "Find and read the main entry point, then summarize how the project boots.",
  },
];

function upsertTerminalEntry(
  entries: ApiCodeWorkspaceTerminalEntry[],
  event: {
    command: string;
    output: string;
    exitCode?: number | null;
    executed?: boolean;
    purpose?: string | null;
  },
): ApiCodeWorkspaceTerminalEntry[] {
  const status: ApiCodeWorkspaceTerminalEntry["status"] =
    event.exitCode != null && event.exitCode !== 0
      ? "error"
      : event.output.trim()
        ? "done"
        : "running";
  const existingIndex = entries.findIndex((entry) => entry.command === event.command);

  if (existingIndex >= 0) {
    return entries.map((entry, index) =>
      index === existingIndex
        ? {
            ...entry,
            output: event.output || entry.output,
            exitCode: event.exitCode ?? entry.exitCode,
            executed: event.executed ?? entry.executed,
            purpose: event.purpose ?? entry.purpose,
            status: status === "running" && entry.output.trim() ? entry.status : status,
          }
        : entry.status === "running" && index !== existingIndex
          ? { ...entry, status: "done" as const }
          : entry,
    );
  }

  return [
    ...entries.map((entry) =>
      entry.status === "running" ? { ...entry, status: "done" as const } : entry,
    ),
    {
      id: randomId(),
      command: event.command,
      output: event.output,
      exitCode: event.exitCode,
      executed: event.executed,
      purpose: event.purpose ?? null,
      status,
    },
  ];
}

function finalizeTerminalEntries(
  entries: ApiCodeWorkspaceTerminalEntry[],
): ApiCodeWorkspaceTerminalEntry[] {
  return entries.map((entry) =>
    entry.status === "running" ? { ...entry, status: "done" as const } : entry,
  );
}

function dedupeFiles(files: ApiCodeWorkspaceSearchMatch[]): ApiCodeWorkspaceSearchMatch[] {
  const seen = new Set<string>();
  const out: ApiCodeWorkspaceSearchMatch[] = [];
  for (const file of files) {
    if (seen.has(file.fileId)) continue;
    seen.add(file.fileId);
    out.push(file);
  }
  return out;
}

type IdeRightSidebarProps = {
  activeFileLabel?: string;
  activeFilePath?: string;
  activeFileId?: string | null;
  projectId?: string | null;
  persisted?: boolean;
  onOpenSearchResult?: (fileId: string, line: number) => void;
  onFileEdited?: (fileId: string) => void;
  onProjectChanged?: () => void;
  onTerminalOutput?: (command: string, output: string, exitCode?: number | null) => void;
};

export function IdeRightSidebar({
  activeFileLabel,
  activeFilePath,
  activeFileId,
  projectId,
  persisted = false,
  onOpenSearchResult,
  onFileEdited,
  onProjectChanged,
  onTerminalOutput,
}: IdeRightSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageFiles, setMessageFiles] = useState<Record<string, ApiCodeWorkspaceSearchMatch[]>>({});
  const [messageReviews, setMessageReviews] = useState<
    Record<string, ApiCodeWorkspaceAgentReview[]>
  >({});
  const [messageWorkflow, setMessageWorkflow] = useState<
    Record<string, ApiCodeWorkspaceWorkflowEvent[]>
  >({});
  const [messageTerminals, setMessageTerminals] = useState<
    Record<string, ApiCodeWorkspaceTerminalEntry[]>
  >({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentPhase, setAgentPhase] = useState<string | null>(null);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [workflowRevision, setWorkflowRevision] = useState(0);
  const [awaitingHuman, setAwaitingHuman] = useState<{
    sessionId: string;
    messageId: string;
  } | null>(null);
  const [messagePlanReview, setMessagePlanReview] = useState<
    Record<string, PlanReviewPayload>
  >({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mobileDockRef = useRef<HTMLDivElement>(null);
  const [mobileDockHeight, setMobileDockHeight] = useState(0);
  const streamBufferRef = useRef("");
  const rafRef = useRef<number | null>(null);

  const greeting = useMemo<Message>(
    () => ({
      id: "clovops-greeting",
      role: "assistant",
      content: `${buildAgentGreeting("Clovops")} I can search files, read code for context, apply edits, and run a review pass after changes.`,
      timestamp: new Date(),
    }),
    [],
  );

  const displayMessages = messages.length === 0 ? [greeting] : messages;
  const showSuggestions = messages.length === 0 && !isLoading;

  const contextHint = awaitingHuman
    ? "Review the proposed plan — reply with feedback or send empty to approve."
    : activeFileLabel
      ? `Using context: ${activeFileLabel}`
      : "Clovops can search, read, edit, and review project files.";

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [input]);

  useLayoutEffect(() => {
    const el = mobileDockRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (window.innerWidth >= 768) {
        setMobileDockHeight(0);
        return;
      }
      setMobileDockHeight(el.offsetHeight);
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    window.addEventListener("resize", updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [showSuggestions, isLoading, input, agentPhase]);

  const handleSend = useCallback(
    async (rawPrompt: string, options?: { resumeSessionId?: string }) => {
      const prompt = rawPrompt.trim();
      const resumeSessionId = options?.resumeSessionId ?? awaitingHuman?.sessionId;
      const isResume = Boolean(resumeSessionId);
      if ((!prompt && !isResume) || isLoading) return;

      if (!persisted || !projectId) {
        const userMsgId = randomId();
        const assistantMsgId = randomId();
        setMessages((current) => [
          ...current,
          {
            id: userMsgId,
            role: "user",
            content: prompt,
            timestamp: new Date(),
          },
          {
            id: assistantMsgId,
            role: "assistant",
            content:
              "Sign in and open a saved project to use the search agent. Demo projects run locally only.",
            timestamp: new Date(),
          },
        ]);
        return;
      }

      const userMsgId = randomId();
      const assistantMsgId = isResume && streamingMsgId ? streamingMsgId : randomId();
      const history = isResume
        ? []
        : messages.map((message) => ({
            role: message.role,
            content: message.content,
          }));

      if (isResume) {
        if (prompt) {
          setMessages((current) => [
            ...current,
            {
              id: userMsgId,
              role: "user",
              content: prompt,
              timestamp: new Date(),
            },
          ]);
        }
      } else {
        setMessages((current) => [
          ...current,
          {
            id: userMsgId,
            role: "user",
            content: prompt,
            timestamp: new Date(),
          },
          {
            id: assistantMsgId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
          },
        ]);
      }
      setAwaitingHuman(null);
      setIsLoading(true);
      setAgentPhase(isResume ? "Resuming after your review…" : "Understanding request…");
      setStreamingMsgId(assistantMsgId);
      if (!isResume) {
        streamBufferRef.current = "";
      }
      setMessageWorkflow((current) => ({
        ...current,
        [assistantMsgId]: isResume ? current[assistantMsgId] ?? [] : [],
      }));
      setMessageTerminals((current) => ({
        ...current,
        [assistantMsgId]: isResume ? current[assistantMsgId] ?? [] : [],
      }));

      let collectedFiles: ApiCodeWorkspaceSearchMatch[] = messageFiles[assistantMsgId] ?? [];
      let collectedReviews: ApiCodeWorkspaceAgentReview[] = messageReviews[assistantMsgId] ?? [];
      let collectedWorkflow: ApiCodeWorkspaceWorkflowEvent[] = isResume
        ? [...(messageWorkflow[assistantMsgId] ?? [])]
        : [];
      let collectedTerminals: ApiCodeWorkspaceTerminalEntry[] = isResume
        ? [...(messageTerminals[assistantMsgId] ?? [])]
        : [];
      let hitAwaitHuman = false;

      const paintWorkflow = (snapshot: ApiCodeWorkspaceWorkflowEvent[]) => {
        flushSync(() => {
          setMessageWorkflow((current) => ({
            ...current,
            [assistantMsgId]: snapshot,
          }));
          setWorkflowRevision((value) => value + 1);
        });
      };

      const recordStreamEvent = (event: Parameters<typeof appendWorkflowEventsFromStream>[1]) => {
        collectedWorkflow = appendWorkflowEventsFromStream(collectedWorkflow, event);
        paintWorkflow([...collectedWorkflow]);
      };

      const paintTerminals = (snapshot: ApiCodeWorkspaceTerminalEntry[]) => {
        flushSync(() => {
          setMessageTerminals((current) => ({
            ...current,
            [assistantMsgId]: snapshot,
          }));
        });
      };

      const yieldToUi = () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      let lastFlushed = "";

      const flushBuffer = () => {
        if (streamBufferRef.current !== lastFlushed) {
          lastFlushed = streamBufferRef.current;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMsgId ? { ...message, content: lastFlushed } : message,
            ),
          );
        }
        rafRef.current = requestAnimationFrame(flushBuffer);
      };
      rafRef.current = requestAnimationFrame(flushBuffer);

      try {
        const eventStream = isResume
          ? codeWorkspaceApi.streamSearchAgentResume(projectId, {
              sessionId: resumeSessionId!,
              humanInput: prompt,
            })
          : codeWorkspaceApi.streamSearchAgent(projectId, {
              message: prompt,
              history,
              activeFileId: activeFileId ?? null,
              activeFilePath: activeFilePath ?? activeFileLabel ?? null,
            });

        for await (const event of eventStream) {
          recordStreamEvent(event);

          if (event.type === "await_human") {
            hitAwaitHuman = true;
            const review: PlanReviewPayload = {
              prompt: event.human_prompt,
              plan: event.plan,
              discussion: event.discussion,
              pendingAgent: event.pending_agent,
            };
            setAwaitingHuman({ sessionId: event.session_id, messageId: assistantMsgId });
            setMessagePlanReview((current) => ({
              ...current,
              [assistantMsgId]: review,
            }));
            setAgentPhase("Waiting for your plan review");
            collectedWorkflow = finalizeWorkflowEvents(collectedWorkflow);
            collectedTerminals = finalizeTerminalEntries(collectedTerminals);
            paintWorkflow([...collectedWorkflow]);
            paintTerminals([...collectedTerminals]);
            if (!streamBufferRef.current.trim()) {
              streamBufferRef.current = "Review the proposed plan below, then approve or send feedback.";
            }
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMsgId
                  ? { ...message, content: streamBufferRef.current }
                  : message,
              ),
            );
            break;
          } else if (event.type === "phase") {
            flushSync(() => setAgentPhase(event.message));
            await yieldToUi();
          } else if (event.type === "log") {
            if (event.status === "running") {
              flushSync(() => setAgentPhase(event.message));
            }
            await yieldToUi();
          } else if (event.type === "token") {
            streamBufferRef.current += event.content;
          } else if (event.type === "files") {
            collectedFiles = dedupeFiles([...collectedFiles, ...event.files]);
            setMessageFiles((current) => ({
              ...current,
              [assistantMsgId]: dedupeFiles(collectedFiles),
            }));
          } else if (event.type === "edit") {
            if (event.edit.created) {
              onProjectChanged?.();
            }
            onFileEdited?.(event.edit.fileId);
          } else if (event.type === "project_changed") {
            onProjectChanged?.();
          } else if (event.type === "terminal") {
            onTerminalOutput?.(event.command, event.output, event.exitCode);
            collectedTerminals = upsertTerminalEntry(collectedTerminals, {
              command: event.command,
              output: event.output,
              exitCode: event.exitCode,
              executed: event.executed,
              purpose: event.purpose,
            });
            paintTerminals([...collectedTerminals]);
          } else if (event.type === "review") {
            collectedReviews = [...collectedReviews, event.review];
            setMessageReviews((current) => ({
              ...current,
              [assistantMsgId]: collectedReviews,
            }));
          } else if (event.type === "error") {
            streamBufferRef.current += event.detail;
          } else if (event.type === "done") {
            collectedWorkflow = finalizeWorkflowEvents(collectedWorkflow);
            collectedTerminals = finalizeTerminalEntries(collectedTerminals);
            paintWorkflow([...collectedWorkflow]);
            paintTerminals([...collectedTerminals]);
            if (event.content && !streamBufferRef.current) {
              streamBufferRef.current = event.content;
            }
            if (event.files.length) {
              collectedFiles = dedupeFiles([...collectedFiles, ...event.files]);
              setMessageFiles((current) => ({
                ...current,
                [assistantMsgId]: dedupeFiles(collectedFiles),
              }));
            }
            if (event.reviews.length) {
              collectedReviews = event.reviews;
              setMessageReviews((current) => ({
                ...current,
                [assistantMsgId]: event.reviews,
              }));
            }
          } else {
            await yieldToUi();
          }
        }
      } catch (err) {
        streamBufferRef.current =
          getApiErrorMessage(err) ||
          streamBufferRef.current ||
          "Something went wrong. Please try again.";
      } finally {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        collectedWorkflow = finalizeWorkflowEvents(collectedWorkflow);
        collectedTerminals = finalizeTerminalEntries(collectedTerminals);
        paintWorkflow([...collectedWorkflow]);
        paintTerminals([...collectedTerminals]);
        if (!hitAwaitHuman) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMsgId
                ? { ...message, content: streamBufferRef.current || "No response." }
                : message,
            ),
          );
          setStreamingMsgId(null);
          setAgentPhase(null);
        }
        setIsLoading(false);
      }
    },
    [
      activeFileId,
      activeFileLabel,
      activeFilePath,
      awaitingHuman,
      isLoading,
      messageFiles,
      messagePlanReview,
      messageWorkflow,
      messageTerminals,
      messageReviews,
      messages,
      onFileEdited,
      onProjectChanged,
      onTerminalOutput,
      persisted,
      projectId,
      streamingMsgId,
    ],
  );

  const submitInput = () => {
    const trimmed = input.trim();
    if (awaitingHuman) {
      setInput("");
      void handleSend(trimmed, { resumeSessionId: awaitingHuman.sessionId });
      return;
    }
    if (!trimmed) return;
    setInput("");
    void handleSend(trimmed);
  };

  const approvePlan = () => {
    if (!awaitingHuman || isLoading) return;
    void handleSend("", { resumeSessionId: awaitingHuman.sessionId });
  };

  const canSend =
    !isLoading && (input.trim().length > 0 || awaitingHuman !== null);

  const suggestionsPanel = showSuggestions ? (
    <section className="px-1.5 md:px-2" aria-label="Suggested prompts">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
        Suggestions
      </p>
      <ul className="flex flex-col gap-1.5">
        {CLOVOPS_SUGGESTIONS.map((suggestion) => (
          <li key={suggestion.id}>
            <button
              type="button"
              onClick={() => void handleSend(suggestion.prompt)}
              className="glass-surface glass-card glass-card-interactive group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors"
            >
              <span className="text-[13px] leading-snug text-muted-foreground transition-colors group-hover:text-foreground">
                {suggestion.label}
              </span>
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/50 transition-colors group-hover:text-primary" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <ChatMessages
        messages={displayMessages}
        isLoading={isLoading}
        streamingMsgId={streamingMsgId}
        className="max-md:pb-0 [scrollbar-width:thin]"
        style={
          mobileDockHeight > 0 ? { paddingBottom: mobileDockHeight + 8 } : undefined
        }
        contentClassName="px-2"
        threadClassName="chat-thread space-y-4 py-4"
        renderMessageFooter={(message) => {
          if (message.role !== "assistant") return null;
          const files = messageFiles[message.id];
          const reviews = messageReviews[message.id];
          const workflow = messageWorkflow[message.id];
          const terminals = messageTerminals[message.id];
          const planReview = messagePlanReview[message.id];
          const isStreamingMessage = isLoading && streamingMsgId === message.id;
          const showPlanReview =
            planReview &&
            (awaitingHuman?.messageId === message.id || !awaitingHuman);
          if (
            !files?.length &&
            !reviews?.length &&
            !workflow?.length &&
            !terminals?.length &&
            !showPlanReview
          ) {
            return null;
          }
          return (
            <div className="mt-2 space-y-1.5">
              {showPlanReview ? (
                <ClovopsPlanReviewCard
                  review={planReview}
                  onApprove={
                    awaitingHuman?.messageId === message.id ? approvePlan : undefined
                  }
                  approving={isLoading && awaitingHuman?.messageId === message.id}
                />
              ) : null}
              {workflow?.length ? (
                <ClovopsWorkflowPanel
                  key={isStreamingMessage ? `live-${workflowRevision}` : message.id}
                  events={workflow}
                  live={isStreamingMessage}
                />
              ) : null}
              {terminals?.length ? (
                <ClovopsChatTerminal
                  entries={terminals}
                  live={isStreamingMessage}
                />
              ) : null}
              {files?.length ? (
                <ClovopsChatFileResults files={files} onOpenFile={onOpenSearchResult} />
              ) : null}
              {reviews?.length ? <ClovopsChatReviewResults reviews={reviews} /> : null}
            </div>
          );
        }}
        footer={
          showSuggestions ? (
            <div className="hidden px-2 pb-2 md:block">{suggestionsPanel}</div>
          ) : null
        }
      />

      <div
        ref={mobileDockRef}
        className={cn(
          "shrink-0 w-full safe-bottom safe-x",
          "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40",
          "max-md:bg-gradient-to-t max-md:from-background max-md:via-background/95 max-md:to-transparent",
          "border-t border-border/40 bg-background/80 pb-3 pt-2 backdrop-blur-sm max-md:border-t-0 max-md:pt-3",
        )}
      >
        {awaitingHuman ? (
          <div className="mb-2 px-1.5 md:px-2">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2">
              <p className="text-[12px] text-foreground/90">Plan review required</p>
              <button
                type="button"
                onClick={approvePlan}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>
            </div>
          </div>
        ) : null}
        {showSuggestions ? (
          <div className="mb-2 md:hidden">{suggestionsPanel}</div>
        ) : null}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitInput();
          }}
          className="w-full px-1.5 md:px-2"
        >
            <div className="glass-surface glass-composer w-full rounded-[1.25rem] px-3 pb-2.5 pt-2.5 transition-all">
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
                placeholder={
                  awaitingHuman
                    ? "Request changes to the plan…"
                    : messages.length > 0
                      ? "Continue the conversation…"
                      : "How can I help you edit this project?"
                }
                rows={1}
                disabled={isLoading}
                className="max-h-[160px] min-h-[2rem] w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-60"
              />

              <div className="mt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={!canSend}
                  className={cn(
                    "press inline-flex h-9 w-9 items-center justify-center rounded-full transition-all",
                    canSend
                      ? "bg-foreground text-background shadow-sm hover:opacity-90"
                      : "bg-black/[0.06] text-muted-foreground/50 dark:bg-white/[0.08]",
                  )}
                  aria-label="Send"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>

          <p className="mt-2 flex items-center justify-center px-1 text-center text-[11px] text-muted-foreground/65">
            {awaitingHuman
              ? "Approve the plan above, or send feedback to request changes."
              : isLoading && agentPhase
                ? agentPhase
                : contextHint}
          </p>
        </form>
      </div>
    </div>
  );
}
