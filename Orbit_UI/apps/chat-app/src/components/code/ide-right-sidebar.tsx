"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ClovopsChatFileResults } from "@/components/code/clovops-chat-file-results";
import { ClovopsChatReviewResults } from "@/components/code/clovops-chat-review-results";
import { buildAgentGreeting } from "@/lib/agent-greeting";
import {
  codeWorkspaceApi,
  getApiErrorMessage,
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
};

export function IdeRightSidebar({
  activeFileLabel,
  activeFilePath,
  activeFileId,
  projectId,
  persisted = false,
  onOpenSearchResult,
  onFileEdited,
}: IdeRightSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageFiles, setMessageFiles] = useState<Record<string, ApiCodeWorkspaceSearchMatch[]>>({});
  const [messageReviews, setMessageReviews] = useState<
    Record<string, ApiCodeWorkspaceAgentReview[]>
  >({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
      setStreamingMsgId(assistantMsgId);
      streamBufferRef.current = "";

      let collectedFiles: ApiCodeWorkspaceSearchMatch[] = [];
      let collectedReviews: ApiCodeWorkspaceAgentReview[] = [];
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
          if (event.type === "token") {
            streamBufferRef.current += event.content;
          } else if (event.type === "files") {
            collectedFiles = dedupeFiles([...collectedFiles, ...event.files]);
            setMessageFiles((current) => ({
              ...current,
              [assistantMsgId]: dedupeFiles(collectedFiles),
            }));
          } else if (event.type === "edit") {
            onFileEdited?.(event.edit.fileId);
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ChatMessages
        messages={displayMessages}
        isLoading={isLoading}
        streamingMsgId={streamingMsgId}
        className="[scrollbar-width:thin]"
        contentClassName="px-2"
        threadClassName="chat-thread space-y-4 py-4"
        renderMessageFooter={(message) => {
          if (message.role !== "assistant") return null;
          const files = messageFiles[message.id];
          const reviews = messageReviews[message.id];
          if (!files?.length && !reviews?.length) return null;
          return (
            <div className="space-y-3">
              {files?.length ? (
                <ClovopsChatFileResults files={files} onOpenFile={onOpenSearchResult} />
              ) : null}
              {reviews?.length ? <ClovopsChatReviewResults reviews={reviews} /> : null}
            </div>
          );
        }}
        footer={
          showSuggestions ? (
            <section className="px-2 pb-2" aria-label="Suggested prompts">
              <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
                Suggestions
              </p>
              <ul className="flex flex-col gap-1.5">
                {CLOVOPS_SUGGESTIONS.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      onClick={() => void handleSend(suggestion.prompt)}
                      className="group flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border/60 hover:bg-muted/40"
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
          ) : null
        }
      />

      <div className="shrink-0 w-full border-t border-border/40 bg-background/80 pb-3 pt-2 backdrop-blur-sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitInput();
          }}
          className="w-full px-2"
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
            {contextHint}
          </p>
        </form>
      </div>
    </div>
  );
}
