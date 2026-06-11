"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ClovopsAgentOutputPanel } from "@/components/code/clovops-agent-output-panel";
import { type PlanReviewPayload } from "@/components/code/clovops-plan-review-card";
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
  type ApiCodeWorkspaceAgentEdit,
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

const PLAN_APPROVED_RESPONSE =
  "Plan approved. Planning the next steps…";

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
  onAgentChange?: (edit: ApiCodeWorkspaceAgentEdit) => void;
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
  onAgentChange,
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

  const activeOutputMessageId =
    streamingMsgId ??
    (awaitingHuman?.messageId ?? null);

  const activeOutputMessage = useMemo(() => {
    if (!activeOutputMessageId) return null;
    return displayMessages.find((message) => message.id === activeOutputMessageId) ?? null;
  }, [activeOutputMessageId, displayMessages]);

  const threadMessages = useMemo(() => {
    if (!activeOutputMessageId) return displayMessages;
    return displayMessages.filter((message) => message.id !== activeOutputMessageId);
  }, [activeOutputMessageId, displayMessages]);

  const showAgentOutputPanel = Boolean(activeOutputMessageId);
  const outputPanelLive = isLoading;

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
      const isPlanApproval = isResume && !prompt.trim();
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
      setAgentPhase(
        isPlanApproval
          ? "Planning next steps…"
          : isResume
            ? "Resuming after your review…"
            : "Understanding request…",
      );
      setStreamingMsgId(assistantMsgId);
      if (isPlanApproval) {
        streamBufferRef.current = PLAN_APPROVED_RESPONSE;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMsgId
              ? { ...message, content: PLAN_APPROVED_RESPONSE }
              : message,
          ),
        );
        setMessagePlanReview((current) => {
          const next = { ...current };
          delete next[assistantMsgId];
          return next;
        });
      } else if (!isResume) {
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
          } else if (event.type === "workflow" && event.kind === "plan_approved") {
            const approvalText = event.message?.trim() || PLAN_APPROVED_RESPONSE;
            streamBufferRef.current = approvalText;
            setAgentPhase("Planning next steps…");
            setMessagePlanReview((current) => {
              const next = { ...current };
              delete next[assistantMsgId];
              return next;
            });
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMsgId
                  ? { ...message, content: approvalText }
                  : message,
              ),
            );
            await yieldToUi();
          } else if (event.type === "phase") {
            flushSync(() => setAgentPhase(event.message));
            await yieldToUi();
          } else if (event.type === "log") {
            if (event.status === "running") {
              flushSync(() => setAgentPhase(event.message));
            }
            await yieldToUi();
          } else if (event.type === "token") {
            if (streamBufferRef.current === PLAN_APPROVED_RESPONSE) {
              streamBufferRef.current = event.content;
            } else {
              streamBufferRef.current += event.content;
            }
          } else if (event.type === "files") {
            collectedFiles = dedupeFiles([...collectedFiles, ...event.files]);
            setMessageFiles((current) => ({
              ...current,
              [assistantMsgId]: dedupeFiles(collectedFiles),
            }));
          } else if (event.type === "edit") {
            onAgentChange?.(event.edit);
            if (event.edit.created) {
              onProjectChanged?.();
            }
            onFileEdited?.(event.edit.fileId);
          } else if (event.type === "project_changed") {
            onProjectChanged?.();
          } else if (event.type === "terminal") {
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
            if (
              event.content &&
              (!streamBufferRef.current ||
                streamBufferRef.current === PLAN_APPROVED_RESPONSE)
            ) {
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
            for (const edit of event.edits) {
              onAgentChange?.(edit);
              onFileEdited?.(edit.fileId);
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
      onAgentChange,
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
        messages={threadMessages}
        isLoading={isLoading && !activeOutputMessageId}
        streamingMsgId={null}
        className="max-md:pb-0 [scrollbar-width:thin]"
        style={
          mobileDockHeight > 0 ? { paddingBottom: mobileDockHeight + 8 } : undefined
        }
        contentClassName="px-2"
        threadClassName="chat-thread space-y-4 py-4"
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
          "border-t border-border/40 bg-background/85 pb-3 pt-2 backdrop-blur-md max-md:border-t-0 max-md:pt-3",
        )}
      >
        <ClovopsAgentOutputPanel
          visible={showAgentOutputPanel}
          live={outputPanelLive}
          agentPhase={agentPhase}
          responseMessage={activeOutputMessage}
          workflow={activeOutputMessageId ? messageWorkflow[activeOutputMessageId] : undefined}
          workflowRevision={workflowRevision}
          terminals={activeOutputMessageId ? messageTerminals[activeOutputMessageId] : undefined}
          files={activeOutputMessageId ? messageFiles[activeOutputMessageId] : undefined}
          reviews={activeOutputMessageId ? messageReviews[activeOutputMessageId] : undefined}
          planReview={
            activeOutputMessageId
              ? messagePlanReview[activeOutputMessageId] ?? null
              : null
          }
          onApprovePlan={
            awaitingHuman?.messageId === activeOutputMessageId ? approvePlan : undefined
          }
          approvingPlan={isLoading && awaitingHuman?.messageId === activeOutputMessageId}
          onOpenFile={onOpenSearchResult}
        />
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
