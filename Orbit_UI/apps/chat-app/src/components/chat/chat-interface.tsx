"use client";

import { useChatStore } from "@/store/chat-store";
import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { Message, Conversation, StudySource } from "@/types";
import { chatApi, mapConversationSummary, mapMessage } from "@/lib/orbit-api";
import { Bot, PanelLeftClose, PanelLeftOpen, Share2, MoreHorizontal, LogIn, LogOut, Settings, User, ArrowLeft } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfilePanel } from "@/components/profile-panel";
import { LoginModal } from "@/components/login-modal";

export function ChatInterface({ initialSource, agentId }: { initialSource?: StudySource | null; agentId?: string }) {
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
    deleteConversation,
    setLoading,
  } = useChatStore();
  const { user, isAuthenticated } = useAuthStore();
  const handleLogout = useLogout();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Load conversations from API
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadConversations = async () => {
      try {
        const data = await chatApi.listConversations();
        setConversations(data.data.map(mapConversationSummary));
      } catch {
        // silently fail
      }
    };
    loadConversations();
  }, [isAuthenticated, setConversations]);

  // Load conversation messages when selecting one
  const loadConversationMessages = useCallback(async (id: string) => {
    setActiveConversation(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv && conv.messages.length > 0) return; // already loaded
    try {
      const data = await chatApi.getConversation(id);
      data.messages.map(mapMessage).forEach((msg) => addMessage(id, msg));
    } catch {
      // silently fail
    }
  }, [conversations, setActiveConversation, addMessage]);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const displayName = user?.name || "User";
  const displayEmail = user?.email || "";

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

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

    // Create a placeholder assistant message for streaming
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

    // Batched update: flush accumulated content at ~30fps
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

      // Final flush
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      updateMessage(conversationId!, assistantMsgId, streamBufferRef.current);
    } catch {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      updateMessage(
        conversationId!,
        assistantMsgId,
        streamBufferRef.current || "Sorry, I encountered an error. Please try again."
      );
    } finally {
      setStreamingMsgId(null);
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversation(null);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await chatApi.deleteConversation(id);
    } catch {
      // ignore
    }
    deleteConversation(id);
  };

  return (
    <div className="flex h-full bg-background">
      {isAuthenticated && sidebarOpen && (
        <ChatSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={loadConversationMessages}
          onNewChat={handleNewChat}
          onDelete={handleDeleteConversation}
        />
      )}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex items-center justify-between h-14 px-4 border-b bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-accent transition-colors"
              title="Back to agents"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {isAuthenticated && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-accent transition-colors"
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
            )}
            {activeConversation ? (
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm font-medium truncate">{activeConversation.title}</h1>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                  {activeConversation.messages.length} msgs
                </span>
              </div>
            ) : agentDisplayName ? (
              <h1 className="text-sm font-medium">{agentDisplayName}</h1>
            ) : (
              <h1 className="text-sm font-medium text-muted-foreground">New Conversation</h1>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-accent transition-colors text-muted-foreground"
              title="Share conversation"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <ThemeToggle />
            {/* User Profile */}
            {isAuthenticated ? (
            <div className="relative ml-1 group">
              <button
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors"
                title="Profile"
              >
                <div className="relative">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-border/60">
                    <span className="text-[10px] font-bold text-primary">{initials}</span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                </div>
                <span className="text-xs font-medium hidden lg:block">{displayName}</span>
              </button>
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-card shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => setProfileOpen(true)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <User className="h-4 w-4" /> Profile
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors">
                    <Settings className="h-4 w-4" /> Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </div>
            </div>
            ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="ml-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <ChatMessages
          messages={activeConversation?.messages || []}
          isLoading={isLoading}
          streamingMsgId={streamingMsgId}
        />

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          selectedSource={isAuthenticated ? selectedSource : null}
          onSelectSource={isAuthenticated ? setSelectedSource : () => {}}
          showContextSelector={isAuthenticated}
        />
      </div>

      {/* Profile Panel */}
      {isAuthenticated && (
        <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
      )}

      {/* Login Modal */}
      {!isAuthenticated && (
        <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      )}
    </div>
  );
}
