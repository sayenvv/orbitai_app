"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Loader2, Sparkles } from "lucide-react";
import { ChatMessages } from "@/components/chat/chat-messages";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";
import { buildAgentGreeting } from "@/lib/agent-greeting";
import { getAgentSuggestions } from "@/lib/agent-suggestions";
import { ApiError, chatApi, mapMessage, publicApi } from "@/lib/orbit-api";
import { isSourceProcessing, mapRagDocumentToSource } from "@/lib/rag-upload";
import { useChatStore } from "@/store/chat-store";
import { randomId } from "@/lib/utils";
import type { Message, StudySource } from "@/types";

const AGENT_SLUG = "study-helper";
const AGENT_NAME = "Study Helper";
const APP_SLUG = "research-companion";

function workspaceChatStorageKey(sourceId: string): string {
  return `rc-workspace-chat:${sourceId}`;
}

function readStoredConversationId(sourceId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(workspaceChatStorageKey(sourceId));
}

function writeStoredConversationId(sourceId: string, conversationId: string | null): void {
  if (typeof window === "undefined") return;
  const key = workspaceChatStorageKey(sourceId);
  if (conversationId) {
    localStorage.setItem(key, conversationId);
    return;
  }
  localStorage.removeItem(key);
}

type ResearchCompanionWorkspaceChatProps = {
  sourceId: string;
  sourceName?: string | null;
  activePage: number;
  initialConversationId?: string | null;
  onClose: () => void;
};

export function ResearchCompanionWorkspaceChat({
  sourceId,
  sourceName,
  activePage,
  initialConversationId = null,
  onClose,
}: ResearchCompanionWorkspaceChatProps) {
  const { openAuthPrompt } = useAppShell();
  const { isAuthenticated } = useAuthStore();
  const [selectedSource, setSelectedSource] = useState<StudySource | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamBufferRef = useRef("");
  const rafRef = useRef<number | null>(null);

  const greeting = useMemo<Message>(
    () => ({
      id: "workspace-greeting",
      role: "assistant",
      content: buildAgentGreeting(AGENT_NAME),
      timestamp: new Date(),
    }),
    [],
  );

  const displayMessages = messages.length === 0 ? [greeting] : messages;
  const suggestions = useMemo(() => getAgentSuggestions(AGENT_SLUG).slice(0, 3), []);
  const showSuggestions = messages.length === 0 && !isLoading;

  useEffect(() => {
    let active = true;
    setSourceLoading(true);

    publicApi
      .getFile(sourceId)
      .then((doc) => {
        if (!active) return;
        setSelectedSource(mapRagDocumentToSource(doc));
      })
      .catch(() => {
        if (!active) return;
        setSelectedSource({
          id: sourceId,
          name: sourceName?.trim() || "Document",
          type: "uploaded-file",
          createdAt: new Date(),
        });
      })
      .finally(() => {
        if (active) setSourceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sourceId, sourceName]);

  useEffect(() => {
    if (!selectedSource || !isSourceProcessing(selectedSource)) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const doc = await publicApi.getFile(selectedSource.id);
        if (!cancelled) {
          setSelectedSource(mapRagDocumentToSource(doc));
        }
      } catch {
        // ignore polling errors
      }
    };

    void poll();
    const intervalId = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedSource?.id, selectedSource?.status]);

  useEffect(() => {
    if (!isAuthenticated) {
      setConversationId(null);
      setMessages([]);
      return;
    }

    const resolvedConversationId =
      initialConversationId?.trim() || readStoredConversationId(sourceId);
    if (!resolvedConversationId) {
      setConversationId(null);
      setMessages([]);
      return;
    }

    writeStoredConversationId(sourceId, resolvedConversationId);

    let active = true;
    setHistoryLoading(true);
    setConversationId(resolvedConversationId);

    chatApi
      .getConversation(resolvedConversationId)
      .then((data) => {
        if (!active) return;
        setMessages(data.messages.map(mapMessage));
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          writeStoredConversationId(sourceId, null);
          setConversationId(null);
          setMessages([]);
        }
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialConversationId, isAuthenticated, sourceId]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
  }, [input]);

  const handleSend = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
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
      const assistantMsgId = randomId();
      const assistantMessage: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((current) => [...current, userMessage, assistantMessage]);
      setStreamingMsgId(assistantMsgId);
      setIsLoading(true);
      streamBufferRef.current = "";

      let streamConversationId = conversationId;
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
        for await (const event of chatApi.streamMessage({
          message: trimmed,
          conversation_id: conversationId,
          source_id: selectedSource?.id ?? sourceId,
          source_type: selectedSource?.type ?? "uploaded-file",
          agent_id: AGENT_SLUG,
          app_slug: APP_SLUG,
        })) {
          if (event.type === "start" && event.conversation_id) {
            streamConversationId = event.conversation_id;
            setConversationId(event.conversation_id);
            writeStoredConversationId(sourceId, event.conversation_id);
            void useChatStore.getState().refreshConversationsList();
          } else if (event.type === "meta" || event.type === "message") {
            // Orchestration metadata only — not message body.
          } else if (event.type === "error") {
            streamBufferRef.current += event.detail;
          } else if (event.type === "token") {
            streamBufferRef.current += event.content;
          }
        }

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMsgId
              ? { ...message, content: streamBufferRef.current }
              : message,
          ),
        );
      } catch (err) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        const errorText =
          err instanceof ApiError
            ? err.message
            : streamBufferRef.current || "Sorry, something went wrong. Please try again.";
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMsgId ? { ...message, content: errorText } : message,
          ),
        );
      } finally {
        setStreamingMsgId(null);
        setIsLoading(false);
      }
    },
    [conversationId, isAuthenticated, isLoading, openAuthPrompt, selectedSource, sourceId],
  );

  const submitInput = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    void handleSend(trimmed);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/30 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/30 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Back to tools"
            title="Back to tools"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Ask about document</p>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              Page {activePage}
              {selectedSource?.name ? ` · ${selectedSource.name}` : ""}
            </p>
          </div>
        </div>
      </div>

      <ChatMessages
        messages={displayMessages}
        isLoading={isLoading || historyLoading}
        streamingMsgId={streamingMsgId}
        className="px-1"
        contentClassName="px-2"
        footer={
          historyLoading ? (
            <div className="flex items-center justify-center gap-2 px-2 pb-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading chat history…
            </div>
          ) : showSuggestions ? (
            <div className="space-y-2 px-2 pb-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => void handleSend(suggestion.prompt)}
                  className="flex w-full items-start gap-2 rounded-xl border border-border/30 bg-background/80 px-3 py-2.5 text-left text-xs leading-relaxed text-foreground transition-colors hover:bg-muted/50"
                >
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{suggestion.label}</span>
                </button>
              ))}
            </div>
          ) : null
        }
      />

      <div className="shrink-0 border-t border-border/30 p-3">
        {sourceLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading document context…
          </div>
        ) : (
          <div className="rounded-xl border border-border/30 bg-background/55 p-1.5">
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
              placeholder="Ask about this page…"
              className="max-h-[7.5rem] min-h-[2.5rem] w-full resize-none bg-transparent px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label="Ask about this document"
            />
            <div className="flex items-center justify-end px-1 pb-1">
              <button
                type="button"
                onClick={submitInput}
                disabled={!input.trim() || isLoading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
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
        )}
      </div>
    </div>
  );
}
