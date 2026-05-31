"use client";

import { useChatStore } from "@/store/chat-store";
import { useAuthStore } from "@/store/auth-store";
import { ChatMessages } from "./chat-messages";
import { AgentSuggestions } from "./agent-suggestions";
import { ChatSideRail } from "./chat-side-rail";
import { ChatActionsMenu } from "./chat-actions-menu";
import { ChatThreadShimmer } from "@/components/ui/skeleton";
import { ChatInput, type ChatInputHandle } from "./chat-input";
import { Message, StudySource } from "@/types";
import { ApiError, chatApi, mapMessage, publicApi } from "@/lib/orbit-api";
import { chatContentClass } from "@/lib/chat-layout";
import {
  isSourceProcessing,
  isSourceReady,
  mapRagDocumentToSource,
} from "@/lib/rag-upload";
import { buildAgentGreeting } from "@/lib/agent-greeting";
import { conversationPath, navigateToNewChat } from "@/lib/chat-navigation";
import { expandChatSideRail } from "@/store/chat-side-rail-store";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useUsageStore } from "@/store/usage-store";
import { useChatSessionStore } from "@/store/chat-session-store";
import { useAgents } from "@/hooks/use-agents";
import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

/** Survives React Strict Mode remounts — one auto-send per pending launch. */
const processedInitialSends = new Set<string>();
const processedAgentGreets = new Set<string>();

export function ChatInterface({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const { setHeader, openUpgrade, openAuthPrompt } = useAppShell();
  const { agents } = useAgents();
  const draftAgentSlug = useChatSessionStore((s) => s.draftAgentSlug);
  const launchSeq = useChatSessionStore((s) => s.launchSeq);
  const consumePending = useChatSessionStore((s) => s.consumePending);
  const showInvalidChatNotice = useChatSessionStore((s) => s.showInvalidChatNotice);
  const setDraftAgentSlug = useChatSessionStore((s) => s.setDraftAgentSlug);
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

  const [selectedSource, setSelectedSource] = useState<StudySource | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [agentGreeting, setAgentGreeting] = useState<Message | null>(null);
  const [conversationError, setConversationError] = useState(false);
  const handleSendMessageRef = useRef<(content: string) => Promise<void>>(async () => {});
  const streamingConversationRef = useRef(false);
  const chatInputRef = useRef<ChatInputHandle>(null);
  const agentGreetingRef = useRef<Message | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const effectiveAgentSlug =
    activeConversation?.agentSlug ?? draftAgentSlug ?? null;
  const activeAgent = agents.find((agent) => agent.id === effectiveAgentSlug);

  agentGreetingRef.current = agentGreeting;

  const displayMessages = useMemo(() => {
    const msgs = activeConversation?.messages ?? [];
    const base =
      agentGreeting && msgs.length === 0 && !conversationId ? [agentGreeting, ...msgs] : msgs;
    const seenIds = new Set<string>();
    const seenContent = new Set<string>();
    return base.filter((msg) => {
      if (seenIds.has(msg.id)) return false;
      const contentKey = `${msg.role}:${msg.content.trim()}`;
      if (msg.content.trim() && seenContent.has(contentKey)) return false;
      seenIds.add(msg.id);
      if (msg.content.trim()) seenContent.add(contentKey);
      return true;
    });
  }, [activeConversation?.messages, agentGreeting, conversationId]);

  useEffect(() => {
    if (!conversationId) {
      expandChatSideRail();
    }
  }, [conversationId]);

  useEffect(() => {
    setConversationError(false);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationError || !conversationId) return;
    showInvalidChatNotice();
    setConversationError(false);
    router.replace("/");
  }, [conversationError, conversationId, router, showInvalidChatNotice]);

  useEffect(() => {
    setHeader(null);
    return () => setHeader(null);
  }, [setHeader]);

  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
      setAgentGreeting(null);
      return;
    }

    setActiveConversation(null);

    const pending = consumePending();
    if (!pending) return;

    if (pending.agentSlug) {
      setDraftAgentSlug(pending.agentSlug);
    }
    if (pending.source) {
      setSelectedSource(pending.source);
    }
    if (pending.prompt?.trim()) {
      setPendingPrompt(pending.prompt.trim());
    }
  }, [conversationId, launchSeq, consumePending, setActiveConversation, setDraftAgentSlug]);

  useLayoutEffect(() => {
    if (conversationId) {
      setAgentGreeting(null);
      return;
    }
    if (!effectiveAgentSlug || !activeAgent) {
      setAgentGreeting(null);
      return;
    }
    if (pendingPrompt) return;
    if ((activeConversation?.messages.length ?? 0) > 0) {
      setAgentGreeting(null);
      return;
    }

    const dedupeKey = `${effectiveAgentSlug}:${launchSeq}`;
    if (processedAgentGreets.has(dedupeKey)) return;
    processedAgentGreets.add(dedupeKey);

    setAgentGreeting({
      id: `greet-${dedupeKey}`,
      role: "assistant",
      content: buildAgentGreeting(activeAgent.name),
      timestamp: new Date(),
    });
    requestAnimationFrame(() => chatInputRef.current?.focus());
  }, [
    conversationId,
    effectiveAgentSlug,
    activeAgent,
    launchSeq,
    pendingPrompt,
    activeConversation?.messages.length,
  ]);

  useEffect(() => {
    if (!selectedSource || selectedSource.type !== "uploaded-file") return;
    if (!isSourceProcessing(selectedSource)) return;

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
  }, [selectedSource?.id, selectedSource?.status, selectedSource?.type]);

  const loadConversationMessages = useCallback(
    async (id: string) => {
      if (streamingConversationRef.current) return;

      const conv = useChatStore.getState().conversations.find((c) => c.id === id);
      if (conv && conv.messages.length > 0) {
        setActiveConversation(id);
        if (conv.agentSlug) setDraftAgentSlug(conv.agentSlug);
        return;
      }

      setActiveConversation(id);
      setLoadingMessages(true);
      setConversationError(false);
      try {
        await refreshConversationsList();
        const summary = useChatStore.getState().conversations.find((c) => c.id === id);

        const data = await chatApi.getConversation(id);
        const messages = data.messages.map(mapMessage);
        const latest = useChatStore.getState().conversations.find((c) => c.id === id);
        if (latest && latest.messages.length > 0) {
          if (latest.agentSlug) setDraftAgentSlug(latest.agentSlug);
          return;
        }

        if (!latest) {
          addConversation({
            id,
            title: summary?.title ?? "Chat",
            messages,
            createdAt: summary?.createdAt ?? new Date(),
            updatedAt: summary?.updatedAt ?? new Date(),
            agentSlug: summary?.agentSlug ?? null,
            agentName: summary?.agentName ?? null,
            agentShortName: summary?.agentShortName ?? null,
            iconKey: summary?.iconKey ?? null,
            colorKey: summary?.colorKey ?? null,
          });
        } else {
          const existingIds = new Set(latest.messages.map((m) => m.id));
          for (const msg of messages) {
            if (!existingIds.has(msg.id)) addMessage(id, msg);
          }
        }

        if (summary?.agentSlug) setDraftAgentSlug(summary.agentSlug);
        else setDraftAgentSlug(null);
      } catch (err) {
        const isMissing =
          err instanceof ApiError && (err.status === 404 || err.status === 422 || err.status === 403);
        if (isMissing) {
          deleteConversation(id);
          setActiveConversation(null);
          setConversationError(true);
        }
      } finally {
        setLoadingMessages(false);
      }
    },
    [setActiveConversation, addConversation, addMessage, setDraftAgentSlug, refreshConversationsList, deleteConversation],
  );

  useEffect(() => {
    if (!conversationId || !isAuthenticated || !conversationsHydrated) {
      return;
    }
    if (streamingConversationRef.current || isLoading) return;

    const conv = useChatStore.getState().conversations.find((c) => c.id === conversationId);
    if (conv?.agentSlug) {
      setDraftAgentSlug(conv.agentSlug);
    } else if (conv) {
      setDraftAgentSlug(null);
    }

    if (conv && conv.messages.length > 0) {
      setActiveConversation(conversationId);
      return;
    }

    void loadConversationMessages(conversationId);
  }, [
    conversationId,
    isAuthenticated,
    conversationsHydrated,
    isLoading,
    loadConversationMessages,
    setActiveConversation,
    setDraftAgentSlug,
  ]);

  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [upgradeMessageId, setUpgradeMessageId] = useState<string | null>(null);
  const streamBufferRef = useRef("");
  const rafRef = useRef<number | null>(null);

  const syncConversationToUrl = useCallback(
    (id: string) => {
      router.replace(conversationPath(id));
    },
    [router],
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!isAuthenticated) {
        openAuthPrompt();
        return;
      }

      const greeting = agentGreetingRef.current;
      if (greeting) {
        setAgentGreeting(null);
      }

      let activeSource = selectedSource;
      if (activeSource && !isSourceReady(activeSource)) {
        setLoading(true);
        try {
          const doc = await publicApi.waitForFileReady(activeSource.id);
          activeSource = mapRagDocumentToSource(doc);
          setSelectedSource(activeSource);
        } catch (err) {
          setLoading(false);
          const errorText =
            err instanceof ApiError ? err.message : "Document is still processing. Try again shortly.";
          const existingId = activeConversationId;
          const tempId = existingId ?? crypto.randomUUID();
          const assistantMsgId = crypto.randomUUID();
          const opening = greeting
            ? [greeting, { id: crypto.randomUUID(), role: "user" as const, content, timestamp: new Date() }]
            : [{ id: crypto.randomUUID(), role: "user" as const, content, timestamp: new Date() }];
          if (!existingId) {
            addConversation({
              id: tempId,
              title: content.slice(0, 50),
              messages: [
                ...opening,
                { id: assistantMsgId, role: "assistant", content: errorText, timestamp: new Date() },
              ],
              createdAt: new Date(),
              updatedAt: new Date(),
              ...(effectiveAgentSlug ? { agentSlug: effectiveAgentSlug } : {}),
            });
          } else {
            addMessage(existingId, { id: crypto.randomUUID(), role: "user", content, timestamp: new Date() });
            addMessage(existingId, { id: assistantMsgId, role: "assistant", content: errorText, timestamp: new Date() });
          }
          return;
        } finally {
          setLoading(false);
        }
      }

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

      let streamConversationId = tempId;

      const openingMessages = greeting
        ? [greeting, userMessage, assistantMessage]
        : [userMessage, assistantMessage];

      if (isNewConversation) {
        addConversation({
          id: tempId,
          title: content.slice(0, 50),
          messages: openingMessages,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...(effectiveAgentSlug ? { agentSlug: effectiveAgentSlug } : {}),
        });
      } else {
        addMessage(existingId, userMessage);
        addMessage(existingId, assistantMessage);
      }

      setLoading(true);
      setStreamingMsgId(assistantMsgId);
      setUpgradeMessageId(null);
      streamingConversationRef.current = true;
      streamBufferRef.current = "";

      let lastFlushed = "";
      const flushBuffer = () => {
        if (streamBufferRef.current !== lastFlushed) {
          lastFlushed = streamBufferRef.current;
          updateMessage(streamConversationId, assistantMsgId, lastFlushed);
        }
        rafRef.current = requestAnimationFrame(flushBuffer);
      };
      rafRef.current = requestAnimationFrame(flushBuffer);

      try {
        for await (const event of chatApi.streamMessage({
          message: content,
          conversation_id: isNewConversation ? null : existingId,
          source_id: activeSource?.id || null,
          source_type: activeSource?.type || null,
          agent_id: effectiveAgentSlug,
        })) {
          if (event.type === "start" && event.conversation_id) {
            if (isNewConversation) {
              updateConversationId(tempId, event.conversation_id);
              streamConversationId = event.conversation_id;
              syncConversationToUrl(event.conversation_id);
              void refreshConversationsList();
            } else if (event.conversation_id !== streamConversationId) {
              updateConversationId(streamConversationId, event.conversation_id);
              streamConversationId = event.conversation_id;
            }
          } else if (event.type === "token") {
            streamBufferRef.current += event.content;
          } else if (event.type === "done" && event.usage) {
            const current = useUsageStore.getState().usage;
            useUsageStore.getState().setUsage({
              plan: current?.plan ?? "free",
              period_start: current?.period_start,
              period_end: current?.period_end,
              ...event.usage,
            });
          }
        }

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        updateMessage(streamConversationId, assistantMsgId, streamBufferRef.current);
        void refreshConversationsList();
      } catch (err) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (err instanceof ApiError && err.status === 429) {
          publicApi
            .subscription()
            .then((data) => useUsageStore.getState().setUsage(data))
            .catch(() => {});
          setUpgradeMessageId(assistantMsgId);
        }
        const errorText =
          err instanceof ApiError && err.status === 429
            ? err.message
            : streamBufferRef.current || "Sorry, I encountered an error. Please try again.";
        updateMessage(streamConversationId, assistantMsgId, errorText);
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
      effectiveAgentSlug,
      refreshConversationsList,
      selectedSource,
      setLoading,
      syncConversationToUrl,
      updateConversationId,
      updateMessage,
      isAuthenticated,
      openAuthPrompt,
      setSelectedSource,
    ],
  );

  handleSendMessageRef.current = handleSendMessage;

  useLayoutEffect(() => {
    const trimmed = pendingPrompt?.trim();
    if (!trimmed) return;

    const dedupeKey = trimmed;
    if (processedInitialSends.has(dedupeKey)) return;

    if (!isAuthenticated) {
      openAuthPrompt();
      setPendingPrompt(null);
      return;
    }

    processedInitialSends.add(dedupeKey);
    setPendingPrompt(null);
    setAgentGreeting(null);

    void handleSendMessageRef.current(trimmed);
  }, [pendingPrompt, isAuthenticated, openAuthPrompt]);

  const handleDeleteConversation = useCallback(async () => {
    if (!activeConversationId || !isAuthenticated) return;
    await chatApi.deleteConversation(activeConversationId);
    deleteConversation(activeConversationId);
    navigateToNewChat(router);
  }, [activeConversationId, isAuthenticated, deleteConversation, router]);

  const handleNewChat = useCallback(() => {
    navigateToNewChat(router);
  }, [router]);

  const showActionsMenu =
    displayMessages.length > 0 || Boolean(activeConversationId) || isLoading;

  const hasUserMessages = displayMessages.some((message) => message.role === "user");
  const showAgentSuggestions =
    Boolean(activeAgent) &&
    !hasUserMessages &&
    !isLoading &&
    !loadingMessages &&
    !pendingPrompt &&
    !conversationId;

  const contentClass = chatContentClass(showActionsMenu);

  return (
    <div className="flex min-h-0 w-full flex-1 overflow-hidden">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {showActionsMenu && (
        <div className="pointer-events-none absolute inset-y-0 right-3 z-20 flex items-center overflow-visible py-28 md:right-5 xl:hidden">
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
          upgradeMessageId={upgradeMessageId}
          onUpgrade={openUpgrade}
          footer={
            showAgentSuggestions && activeAgent ? (
              <AgentSuggestions
                agentSlug={activeAgent.id}
                className="pt-3 pb-1"
                onSelect={(prompt) => {
                  void handleSendMessage(prompt);
                  chatInputRef.current?.focus();
                }}
              />
            ) : null
          }
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
        conversationId={activeConversationId}
      />
      </div>

      <ChatSideRail
        className="hidden xl:flex"
        showActionsMenu={showActionsMenu}
        actions={{
          conversationId: activeConversationId,
          conversationTitle: activeConversation?.title,
          messages: displayMessages,
          canDelete: Boolean(activeConversationId && isAuthenticated),
          onDelete: handleDeleteConversation,
          onNewChat: handleNewChat,
        }}
      />
    </div>
  );
}
