"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ClovopsChatFileResults } from "@/components/code/clovops-chat-file-results";
import { ClovopsExecutionLog } from "@/components/code/clovops-execution-log";
import { ClovopsChatReviewResults } from "@/components/code/clovops-chat-review-results";
import { buildAgentGreeting } from "@/lib/agent-greeting";
import {
  codeWorkspaceApi,
  getApiErrorMessage,
  type ApiCodeWorkspaceAgentLogEntry,
  type ApiCodeWorkspaceAgentReview,
  type ApiCodeWorkspaceSearchMatch,
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
  const [messageLogs, setMessageLogs] = useState<
    Record<string, ApiCodeWorkspaceAgentLogEntry[]>
  >({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentPhase, setAgentPhase] = useState<string | null>(null);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [logRevision, setLogRevision] = useState(0);
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

  const contextHint = activeFileLabel
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
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || isLoading) return;

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
      const assistantMsgId = randomId();
      const history = messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

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
      setIsLoading(true);
      setAgentPhase("Understanding request…");
      setStreamingMsgId(assistantMsgId);
      streamBufferRef.current = "";
      setMessageLogs((current) => ({
        ...current,
        [assistantMsgId]: [
          {
            id: "gateway-running",
            agent: "Gateway",
            agentId: "gateway",
            status: "running",
            message: "Understanding request…",
          },
        ],
      }));

      let collectedFiles: ApiCodeWorkspaceSearchMatch[] = [];
      let collectedReviews: ApiCodeWorkspaceAgentReview[] = [];
      let collectedLogs: ApiCodeWorkspaceAgentLogEntry[] = [
        {
          id: "gateway-running",
          agent: "Gateway",
          agentId: "gateway",
          status: "running",
          message: "Understanding request…",
        },
      ];

      const paintLogs = (snapshot: ApiCodeWorkspaceAgentLogEntry[]) => {
        flushSync(() => {
          setMessageLogs((current) => ({
            ...current,
            [assistantMsgId]: snapshot,
          }));
          setLogRevision((value) => value + 1);
        });
      };

      const upsertLog = (entry: ApiCodeWorkspaceAgentLogEntry) => {
        const existingIndex = collectedLogs.findIndex((log) => log.id === entry.id);
        if (existingIndex >= 0) {
          collectedLogs = collectedLogs.map((log, index) =>
            index === existingIndex ? { ...log, ...entry } : log,
          );
        } else {
          collectedLogs = [...collectedLogs, entry];
        }
        paintLogs([...collectedLogs]);
        if (entry.status === "running") {
          setAgentPhase(entry.message);
        }
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
        for await (const event of codeWorkspaceApi.streamSearchAgent(projectId, {
          message: prompt,
          history,
          activeFileId: activeFileId ?? null,
          activeFilePath: activeFilePath ?? activeFileLabel ?? null,
        })) {
          if (event.type === "phase") {
            flushSync(() => setAgentPhase(event.message));
            await yieldToUi();
          } else if (event.type === "log") {
            upsertLog({
              id: event.id,
              agent: event.agent,
              agentId: event.agentId,
              status: event.status,
              message: event.message,
              detail: event.detail ?? undefined,
            });
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
            if (event.output) {
              streamBufferRef.current += `\n\`\`\`terminal\n$ ${event.command}\n${event.output}\n\`\`\`\n`;
            }
          } else if (event.type === "review") {
            collectedReviews = [...collectedReviews, event.review];
            setMessageReviews((current) => ({
              ...current,
              [assistantMsgId]: collectedReviews,
            }));
          } else if (event.type === "error") {
            streamBufferRef.current += event.detail;
          } else if (event.type === "done") {
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
          }
        }
      } catch (err) {
        streamBufferRef.current =
          getApiErrorMessage(err) ||
          streamBufferRef.current ||
          "Something went wrong. Please try again.";
      } finally {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMsgId
              ? { ...message, content: streamBufferRef.current || "No response." }
              : message,
          ),
        );
        setStreamingMsgId(null);
        setAgentPhase(null);
        setIsLoading(false);
      }
    },
    [
      activeFileId,
      activeFileLabel,
      activeFilePath,
      isLoading,
      messages,
      onFileEdited,
      onProjectChanged,
      onTerminalOutput,
      persisted,
      projectId,
    ],
  );

  const submitInput = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    void handleSend(trimmed);
  };

  const canSend = input.trim().length > 0 && !isLoading;

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
          const logs = messageLogs[message.id];
          const isStreamingMessage = isLoading && streamingMsgId === message.id;
          if (!files?.length && !reviews?.length && !logs?.length) return null;
          return (
            <div className="space-y-3">
              {logs?.length ? (
                <ClovopsExecutionLog
                  key={isStreamingMessage ? `live-${logRevision}` : message.id}
                  logs={logs}
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
                  messages.length > 0
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

          <p className="mt-2 flex items-center justify-center gap-1.5 px-1 text-center text-[11px] text-muted-foreground/70">
            <Sparkles className="h-3 w-3 shrink-0 text-primary/60" />
            {isLoading && agentPhase ? agentPhase : contextHint}
          </p>
        </form>
      </div>
    </div>
  );
}
