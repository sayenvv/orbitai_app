"use client";

import { useChatStore } from "@/store/chat-store";
import { useAuthStore } from "@/store/auth-store";
import { ChatMessages } from "./chat-messages";
import { ChatActionsMenu } from "./chat-actions-menu";
import { ChatThreadShimmer } from "@/components/ui/skeleton";
import { ChatInput, type ChatInputHandle } from "./chat-input";
import { Message, StudySource } from "@/types";
import { chatApi, mapMessage } from "@/lib/orbit-api";
import { chatContentClass } from "@/lib/chat-layout";
import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppShell } from "@/components/layout/app-shell-context";

/** Survives React Strict Mode remounts — one auto-send per home navigation. */
const processedInitialSends = new Set<string>();

export function ChatInterface({
  initialSource,
  agentId,
  initialConversationId,
  initialPrompt,
}: {
  initialSource?: StudySource | null;
  agentId?: string;
  initialConversationId?: string;
  initialPrompt?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeader } = useAppShell();
  const {
    conversations,
    activeConversationId,
    isLoading,
    conversationsHydrated,
    setActiveConversation,
    addConversation,
    addMessage,
    updateMessage,
    updateConversationId,
    refreshConversationsList,
    setLoading,
    deleteConversation,
  } = useChatStore();
  const { isAuthenticated } = useAuthStore();

  const [selectedSource, setSelectedSource] = useState<StudySource | null>(initialSource ?? null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const handleSendMessageRef = useRef<(content: string) => Promise<void>>(async () => {});
  const streamingConversationRef = useRef(false);
  const chatInputRef = useRef<ChatInputHandle>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const displayMessages = useMemo(() => {
    const msgs = activeConversation?.messages ?? [];
    const seenIds = new Set<string>();
    const seenContent = new Set<string>();
    return msgs.filter((msg) => {
      if (seenIds.has(msg.id)) return false;
      const contentKey = `${msg.role}:${msg.content.trim()}`;
      if (msg.content.trim() && seenContent.has(contentKey)) return false;
      seenIds.add(msg.id);
      if (msg.content.trim()) seenContent.add(contentKey);
      return true;
    });
  }, [activeConversation?.messages]);

  useEffect(() => {
    setHeader(null);
    return () => setHeader(null);
  }, [setHeader]);

  useEffect(() => {
    if (initialConversationId) {
      setActiveConversation(initialConversationId);
    } else if (initialPrompt) {
      setActiveConversation(null);
    }
  }, [initialConversationId, initialPrompt, setActiveConversation]);

  const loadConversationMessages = useCallback(
    async (id: string) => {
      if (streamingConversationRef.current) return;

      const conv = useChatStore.getState().conversations.find((c) => c.id === id);
      if (conv && conv.messages.length > 0) {
        setActiveConversation(id);
        return;
      }

      setActiveConversation(id);
      setLoadingMessages(true);
      try {
        const data = await chatApi.getConversation(id);
        const messages = data.messages.map(mapMessage);
        const latest = useChatStore.getState().conversations.find((c) => c.id === id);
        if (latest && latest.messages.length > 0) return;

        if (!latest) {
          addConversation({
            id,
            title: "Chat",
            messages,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          const existingIds = new Set(latest.messages.map((m) => m.id));
          for (const msg of messages) {
            if (!existingIds.has(msg.id)) addMessage(id, msg);
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoadingMessages(false);
      }
    },
    [setActiveConversation, addConversation, addMessage],
  );

  useEffect(() => {
    if (!initialConversationId || !isAuthenticated || !conversationsHydrated) {
      return;
    }
    if (streamingConversationRef.current || isLoading) return;

    const conv = useChatStore
      .getState()
      .conversations.find((c) => c.id === initialConversationId);
    if (conv && conv.messages.length > 0) {
      setActiveConversation(initialConversationId);
      return;
    }

    void loadConversationMessages(initialConversationId);
  }, [
    initialConversationId,
    isAuthenticated,
    conversationsHydrated,
    isLoading,
    loadConversationMessages,
    setActiveConversation,
  ]);

  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const streamBufferRef = useRef("");
  const rafRef = useRef<number | null>(null);

  const syncConversationToUrl = useCallback(
    (conversationId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("prompt");
      params.delete("send");
      params.set("conversation", conversationId);
      router.replace(`/c?${params.toString()}`);
    },
    [router, searchParams],
  );

  const clearPromptFromUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has("prompt") && !params.has("send")) return;
    params.delete("prompt");
    params.delete("send");
    const query = params.toString();
    router.replace(query ? `/c?${query}` : "/c");
  }, [router, searchParams]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      const existingId = activeConversationId;
      const isNewConversation = !existingId;
      const tempId = isNewConversation ? crypto.randomUUID() : existingId;
      const assistantMsgId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      let conversationId = tempId;

      if (isNewConversation) {
        addConversation({
          id: tempId,
          title: content.slice(0, 50),
          messages: [userMessage, assistantMessage],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        addMessage(existingId, userMessage);
        addMessage(existingId, assistantMessage);
      }

      setLoading(true);
      setStreamingMsgId(assistantMsgId);
      streamingConversationRef.current = true;
      streamBufferRef.current = "";

      let lastFlushed = "";
      const flushBuffer = () => {
        if (streamBufferRef.current !== lastFlushed) {
          lastFlushed = streamBufferRef.current;
          updateMessage(conversationId, assistantMsgId, lastFlushed);
        }
        rafRef.current = requestAnimationFrame(flushBuffer);
      };
      rafRef.current = requestAnimationFrame(flushBuffer);

      try {
        for await (const event of chatApi.streamMessage({
          message: content,
          conversation_id: isNewConversation ? null : existingId,
          source_id: selectedSource?.id || null,
          source_type: selectedSource?.type || null,
          agent_id: agentId || null,
        })) {
          if (event.type === "start" && event.conversation_id) {
            if (isNewConversation) {
              updateConversationId(tempId, event.conversation_id);
              conversationId = event.conversation_id;
              syncConversationToUrl(event.conversation_id);
              void refreshConversationsList();
            } else if (event.conversation_id !== conversationId) {
              updateConversationId(conversationId, event.conversation_id);
              conversationId = event.conversation_id;
            }
          } else if (event.type === "token") {
            streamBufferRef.current += event.content;
          }
        }

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        updateMessage(conversationId, assistantMsgId, streamBufferRef.current);
        if (isAuthenticated) {
          void refreshConversationsList();
        }
      } catch {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        updateMessage(
          conversationId,
          assistantMsgId,
          streamBufferRef.current || "Sorry, I encountered an error. Please try again.",
        );
      } finally {
        streamingConversationRef.current = false;
        setStreamingMsgId(null);
        setLoading(false);
      }
    },
    [
      activeConversationId,
      addConversation,
      addMessage,
      agentId,
      refreshConversationsList,
      selectedSource,
      setLoading,
      syncConversationToUrl,
      updateConversationId,
      updateMessage,
      isAuthenticated,
    ],
  );

  handleSendMessageRef.current = handleSendMessage;

  useLayoutEffect(() => {
    const trimmed = initialPrompt?.trim();
    if (!trimmed) return;

    const sendId = searchParams.get("send");
    const dedupeKey = sendId ?? trimmed;
    if (processedInitialSends.has(dedupeKey)) return;
    processedInitialSends.add(dedupeKey);

    void handleSendMessageRef.current(trimmed);
    clearPromptFromUrl();
  }, [initialPrompt, searchParams, clearPromptFromUrl]);

  const handleDeleteConversation = useCallback(async () => {
    if (!activeConversationId || !isAuthenticated) return;
    await chatApi.deleteConversation(activeConversationId);
    deleteConversation(activeConversationId);
    router.push("/");
  }, [activeConversationId, isAuthenticated, deleteConversation, router]);

  const handleNewChat = useCallback(() => {
    setActiveConversation(null);
    router.push("/");
  }, [setActiveConversation, router]);

  const showActionsMenu =
    displayMessages.length > 0 || Boolean(activeConversationId) || isLoading;

  const contentClass = chatContentClass(showActionsMenu);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {showActionsMenu && (
        <div className="pointer-events-none absolute inset-y-0 right-3 z-20 flex items-center overflow-visible py-28 md:right-5">
          <div className="pointer-events-auto">
            <ChatActionsMenu
              conversationId={activeConversationId}
              conversationTitle={activeConversation?.title}
              messages={displayMessages}
              canDelete={Boolean(activeConversationId && isAuthenticated)}
              onDelete={handleDeleteConversation}
              onNewChat={handleNewChat}
            />
          </div>
        </div>
      )}
      {loadingMessages ? (
        <div className="min-h-0 flex-1 overflow-y-auto w-full">
          <div className={contentClass}>
            <ChatThreadShimmer />
          </div>
        </div>
      ) : (
        <ChatMessages
          contentClassName={contentClass}
          messages={displayMessages}
          isLoading={isLoading}
          streamingMsgId={streamingMsgId}
          onSuggestionClick={(text) => {
            void handleSendMessage(text);
            chatInputRef.current?.focus();
          }}
        />
      )}
      <ChatInput
        ref={chatInputRef}
        columnClassName={contentClass}
        onSend={handleSendMessage}
        isLoading={isLoading}
        selectedSource={isAuthenticated ? selectedSource : null}
        onSelectSource={isAuthenticated ? setSelectedSource : () => {}}
        showContextSelector={isAuthenticated}
      />
    </div>
  );
}

