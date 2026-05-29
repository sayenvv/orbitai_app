"use client";

import { useChatStore } from "@/store/chat-store";
import { useAuthStore } from "@/store/auth-store";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { Message, Conversation, StudySource } from "@/types";
import { chatApi, mapConversationSummary, mapMessage } from "@/lib/orbit-api";
import { Share2 } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAppShell } from "@/components/layout/app-shell-context";

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
  const {
    conversations,
    activeConversationId,
    isLoading,
    setActiveConversation,
    addConversation,
    addMessage,
    updateMessage,
    updateConversationId,
    setConversations,
    setLoading,
  } = useChatStore();
  const { isAuthenticated } = useAuthStore();
  const { setHeader } = useAppShell();

  const agentNames: Record<string, string> = {
    "study-helper": "Study Helper",
    "job-search": "Job Search Assistant",
    "coding-tutor": "Coding Tutor",
    "career-guidance": "Career Guidance",
    "language-learning": "Language Learning",
    "general-knowledge": "General Knowledge",
  };
  const agentDisplayName = agentId ? agentNames[agentId] || agentId : null;
  const [selectedSource, setSelectedSource] = useState<StudySource | null>(initialSource ?? null);
  const initialLoadRef = useRef(false);
  const promptSentRef = useRef(false);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  useEffect(() => {
    const title = activeConversation
      ? activeConversation.title
      : agentDisplayName || "New Conversation";
    const subtitle = activeConversation
      ? `${activeConversation.messages.length} messages`
      : undefined;

    setHeader({
      title,
      subtitle,
      actions: (
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent"
          title="Share conversation"
        >
          <Share2 className="h-4 w-4" />
        </button>
      ),
    });

    return () => setHeader(null);
  }, [activeConversation, agentDisplayName, setHeader]);

  useEffect(() => {
    if (!isAuthenticated) {
      setConversationsLoaded(true);
      return;
    }
    const loadConversations = async () => {
      try {
        const data = await chatApi.listConversations();
        setConversations(data.data.map(mapConversationSummary));
      } catch {
        // silently fail
      } finally {
        setConversationsLoaded(true);
      }
    };
    void loadConversations();
  }, [isAuthenticated, setConversations]);

  const loadConversationMessages = useCallback(
    async (id: string) => {
      setActiveConversation(id);
      const conv = conversations.find((c) => c.id === id);
      if (conv && conv.messages.length > 0) return;
      try {
        const data = await chatApi.getConversation(id);
        const messages = data.messages.map(mapMessage);
        if (!conv) {
          addConversation({
            id,
            title: "Chat",
            messages,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          messages.forEach((msg) => addMessage(id, msg));
        }
      } catch {
        // silently fail
      }
    },
    [conversations, setActiveConversation, addConversation, addMessage],
  );

  useEffect(() => {
    if (!initialConversationId || !isAuthenticated || !conversationsLoaded || initialLoadRef.current) {
      return;
    }
    initialLoadRef.current = true;
    void loadConversationMessages(initialConversationId);
  }, [initialConversationId, isAuthenticated, conversationsLoaded, loadConversationMessages]);

  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const streamBufferRef = useRef("");
  const rafRef = useRef<number | null>(null);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    let conversationId = activeConversationId;

    if (!conversationId) {
      const newConversation: Conversation = {
        id: crypto.randomUUID(),
        title: content.slice(0, 50),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addConversation(newConversation);
      conversationId = newConversation.id;
    }

    addMessage(conversationId!, userMessage);
    setLoading(true);

    const assistantMsgId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    addMessage(conversationId!, assistantMessage);
    setStreamingMsgId(assistantMsgId);
    streamBufferRef.current = "";

    let lastFlushed = "";
    const flushBuffer = () => {
      if (streamBufferRef.current !== lastFlushed) {
        lastFlushed = streamBufferRef.current;
        updateMessage(conversationId!, assistantMsgId, lastFlushed);
      }
      rafRef.current = requestAnimationFrame(flushBuffer);
    };
    rafRef.current = requestAnimationFrame(flushBuffer);

    try {
      for await (const event of chatApi.streamMessage({
        message: content,
        conversation_id: activeConversationId || null,
        source_id: selectedSource?.id || null,
        source_type: selectedSource?.type || null,
        agent_id: agentId || null,
      })) {
        if (event.type === "start" && event.conversation_id) {
          if (event.conversation_id !== conversationId && event.conversation_id !== "anonymous") {
            updateConversationId(conversationId!, event.conversation_id);
            conversationId = event.conversation_id;
          }
        } else if (event.type === "token") {
          streamBufferRef.current += event.content;
        }
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      updateMessage(conversationId!, assistantMsgId, streamBufferRef.current);
    } catch {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      updateMessage(
        conversationId!,
        assistantMsgId,
        streamBufferRef.current || "Sorry, I encountered an error. Please try again.",
      );
    } finally {
      setStreamingMsgId(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialPrompt?.trim() || promptSentRef.current) return;
    promptSentRef.current = true;
    void handleSendMessage(initialPrompt.trim());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <ChatMessages
        messages={activeConversation?.messages || []}
        isLoading={isLoading}
        streamingMsgId={streamingMsgId}
      />
      <ChatInput
        onSend={handleSendMessage}
        isLoading={isLoading}
        selectedSource={isAuthenticated ? selectedSource : null}
        onSelectSource={isAuthenticated ? setSelectedSource : () => {}}
        showContextSelector={isAuthenticated}
      />
    </div>
  );
}
