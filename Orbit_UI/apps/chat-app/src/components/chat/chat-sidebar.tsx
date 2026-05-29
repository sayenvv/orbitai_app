"use client";

import { Conversation } from "@/types";
import {
  MessageSquarePlus,
  MessageCircle,
  Bot,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

import { publicApi } from "@/lib/orbit-api";

type ChatSidebarProps = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete?: (id: string) => void;
};

export function ChatSidebar({ conversations, activeId, onSelect, onNewChat, onDelete }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [plan, setPlan] = useState<string>("free");
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    publicApi.subscription()
      .then((data) => { if (data?.plan) setPlan(data.plan); })
      .catch(() => {});
  }, [user]);

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const today = new Date();
  const todayConvs = filteredConversations.filter(
    (c) => new Date(c.createdAt).toDateString() === today.toDateString()
  );
  const olderConvs = filteredConversations.filter(
    (c) => new Date(c.createdAt).toDateString() !== today.toDateString()
  );

  return (
    <aside className="hidden md:flex w-56 flex-col border-r bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight block">Study AI</span>
            <span className="text-[10px] text-muted-foreground leading-none">Chat Assistant</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <button
            onClick={onNewChat}
            className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-accent transition-colors"
            aria-label="New chat"
            title="New conversation"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border bg-background/60 pl-8 pr-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
          />
        </div>
      </div>

      {/* Conversations List */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {searchQuery ? "No matching conversations" : "Start a new conversation"}
            </p>
          </div>
        ) : (
          <>
            {todayConvs.length > 0 && (
              <div className="mb-1">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Today
                </p>
                {todayConvs.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={activeId === conv.id}
                    onSelect={onSelect}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
            {olderConvs.length > 0 && (
              <div className="mb-1">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Previous
                </p>
                {olderConvs.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={activeId === conv.id}
                    onSelect={onSelect}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 hover:bg-accent/50 transition-colors cursor-pointer group">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-border/60">
              <span className="text-xs font-bold text-primary">
                {user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
              </span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-none truncate">{user?.name || "User"}</p>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors group relative",
        isActive
          ? "bg-accent text-accent-foreground shadow-sm"
          : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"
      )}
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-medium truncate block">{conversation.title}</span>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-background transition-all"
        title="Delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.(conversation.id);
        }}
      >
        <Trash2 className="h-3 w-3 text-muted-foreground" />
      </button>
    </button>
  );
}
