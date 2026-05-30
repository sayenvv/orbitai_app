"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUp,
  ChevronDown,
  Loader2,
  Maximize2,
  MessageCircle,
  Minimize2,
  Sparkles,
  X,
} from "lucide-react";
import {
  studyPanelClass,
  studyPanelHeaderClass,
  StudySectionLabel,
} from "@/components/insights/insights-shell";
import { useAppShell } from "@/components/layout/app-shell-context";
import { ApiError, chatApi } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";
import type { Message } from "@/types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const DOUBT_STARTERS = [
  "Explain the hardest concept in this document simply",
  "What should I focus on for an exam from this PDF?",
  "Can you clarify something I didn't understand?",
  "Give me a real-world example from this material",
] as const;

type InsightDoubtChatProps = {
  sourceDocumentId: string | null;
  sourceName: string | null;
  insightTitle: string;
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  className?: string;
};

function DoubtMessage({ message, streaming }: { message: Message; streaming?: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/15">
          <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground shadow-sm"
            : "border border-border/45 bg-background/80 text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1.5 [&_p:last-child]:mb-0">
            {streaming && !message.content ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </span>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DoubtChatBody({
  sourceDocumentId,
  sourceName,
  insightTitle,
  messages,
  setMessages,
  conversationId,
  setConversationId,
  isFullscreen,
  onExpandFullscreen,
  onCollapseFullscreen,
}: {
  sourceDocumentId: string;
  sourceName: string | null;
  insightTitle: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  conversationId: string | null;
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  isFullscreen?: boolean;
  onExpandFullscreen?: () => void;
  onCollapseFullscreen?: () => void;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { openAuthPrompt } = useAppShell();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamBufferRef = useRef("");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: streamingMsgId ? "instant" : "smooth" });
  }, [messages, streamingMsgId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isLoading) return;

      if (!isAuthenticated) {
        openAuthPrompt();
        return;
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      const assistantMsgId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantMsgId, role: "assistant", content: "", timestamp: new Date() },
      ]);
      setIsLoading(true);
      setStreamingMsgId(assistantMsgId);
      streamBufferRef.current = "";

      const flushBuffer = () => {
        const snapshot = streamBufferRef.current;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, content: snapshot } : msg)),
        );
        rafRef.current = requestAnimationFrame(flushBuffer);
      };
      rafRef.current = requestAnimationFrame(flushBuffer);

      try {
        for await (const event of chatApi.streamMessage({
          message: content,
          conversation_id: conversationId,
          source_id: sourceDocumentId,
          source_type: "uploaded-file",
        })) {
          if (event.type === "start" && event.conversation_id) {
            setConversationId(event.conversation_id);
          } else if (event.type === "token") {
            streamBufferRef.current += event.content;
          }
        }
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: streamBufferRef.current || msg.content }
              : msg,
          ),
        );
      } catch (err) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        const errorText =
          err instanceof ApiError
            ? err.message
            : "Sorry, I couldn't answer that. Please try again.";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: errorText } : msg,
          ),
        );
      } finally {
        setStreamingMsgId(null);
        setIsLoading(false);
      }
    },
    [
      conversationId,
      isAuthenticated,
      isLoading,
      openAuthPrompt,
      setConversationId,
      setMessages,
      sourceDocumentId,
    ],
  );

  const handleSubmit = () => {
    if (!input.trim()) return;
    void sendMessage(input);
    setInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/35 px-4 py-3 md:px-5">
        <div className="min-w-0">
          <StudySectionLabel>Doubt clearing</StudySectionLabel>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Context: {sourceName ?? insightTitle}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {isFullscreen && onCollapseFullscreen && (
            <button
              type="button"
              onClick={onCollapseFullscreen}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/45 bg-background/80 px-3 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              Exit
            </button>
          )}
          {!isFullscreen && onExpandFullscreen && (
            <button
              type="button"
              onClick={onExpandFullscreen}
              title="Focus mode"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/45 bg-background/80 px-3 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Focus
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-5">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ask anything about this document — definitions, clarifications, examples, or exam
              prep. Answers are grounded in your uploaded PDF.
            </p>
            <div className="flex flex-wrap gap-2">
              {DOUBT_STARTERS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isLoading}
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-full border border-border/45 bg-background/70 px-3.5 py-2 text-left text-[11px] font-medium text-foreground transition-colors hover:border-violet-500/30 hover:bg-violet-500/[0.06] disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message) => (
              <DoubtMessage
                key={message.id}
                message={message}
                streaming={message.id === streamingMsgId}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border/35 p-3.5 md:p-4">
        <div className="flex items-end gap-2.5 rounded-2xl border border-border/50 bg-background/80 px-4 py-2.5 shadow-sm focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/15">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            placeholder="Type your doubt…"
            disabled={isLoading}
            className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InsightDoubtChat({
  sourceDocumentId,
  sourceName,
  insightTitle,
  fullscreen = false,
  onFullscreenChange,
  className,
}: InsightDoubtChatProps) {
  const [dockedOpen, setDockedOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!fullscreen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFullscreenChange?.(false);
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [fullscreen, onFullscreenChange]);

  if (!sourceDocumentId) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border/50 bg-muted/10 px-6 py-8 text-center",
          className,
        )}
      >
        <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-medium text-foreground">Doubt clearing unavailable</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Link a source PDF to ask follow-up questions grounded in your document.
        </p>
      </div>
    );
  }

  const bodyProps = {
    sourceDocumentId,
    sourceName,
    insightTitle,
    messages,
    setMessages,
    conversationId,
    setConversationId,
    onExpandFullscreen: () => {
      setDockedOpen(true);
      onFullscreenChange?.(true);
    },
    onCollapseFullscreen: () => onFullscreenChange?.(false),
  };

  const chatBody = (
    <DoubtChatBody
      {...bodyProps}
      isFullscreen={fullscreen}
      onExpandFullscreen={fullscreen ? undefined : bodyProps.onExpandFullscreen}
      onCollapseFullscreen={fullscreen ? bodyProps.onCollapseFullscreen : undefined}
    />
  );

  const fullscreenOverlay =
    mounted && fullscreen
      ? createPortal(
          <div className="fixed inset-0 z-[10004] flex flex-col bg-background/95 backdrop-blur-md">
            <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-5 py-3.5 md:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/15">
                  <MessageCircle className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Doubt clearing</p>
                  <p className="text-xs text-muted-foreground">Focus mode · grounded in your PDF</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onFullscreenChange?.(false)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/50 bg-background px-3.5 text-xs font-medium text-foreground hover:bg-muted/50"
              >
                <X className="h-3.5 w-3.5" />
                Close
              </button>
            </div>
            <div className="mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-hidden px-4 py-4 md:px-6 md:py-6">
              <div className="h-full overflow-hidden rounded-2xl border border-border/40 bg-card/50">
                {chatBody}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        className={cn(
          studyPanelClass,
          "border-t-2 border-t-violet-500/20",
          fullscreen && "ring-1 ring-violet-500/20",
          className,
        )}
      >
        <div className={cn(studyPanelHeaderClass, "bg-gradient-to-r from-violet-500/[0.04] to-transparent")}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/15">
              <MessageCircle className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Doubt clearing chat
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {dockedOpen || fullscreen
                  ? "Ask follow-up questions — answers use your PDF"
                  : "Expand to ask doubts and get clarifications"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {(dockedOpen || fullscreen) && !fullscreen && (
              <button
                type="button"
                onClick={() => onFullscreenChange?.(true)}
                title="Focus mode"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/45 bg-background/80 px-3 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Focus</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (fullscreen) {
                  onFullscreenChange?.(false);
                  return;
                }
                setDockedOpen((open) => !open);
              }}
              aria-expanded={dockedOpen || fullscreen}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/45 bg-background/80 px-3 text-xs font-medium text-foreground hover:bg-muted/50"
            >
              {dockedOpen || fullscreen ? (
                <>
                  Collapse
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Expand
                  <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                </>
              )}
            </button>
          </div>
        </div>

        {dockedOpen && !fullscreen && (
          <div className="h-[min(44vh,440px)] border-t border-border/35">{chatBody}</div>
        )}
      </div>
      {fullscreenOverlay}
    </>
  );
}
