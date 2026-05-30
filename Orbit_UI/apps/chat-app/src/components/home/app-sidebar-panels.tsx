"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  FileText,
  FolderOpen,
  LayoutGrid,
  Loader2,
  MessageSquarePlus,
  Search,
  Trash2,
} from "lucide-react";
import { AgentCardTint, AgentListingIcon } from "@orbit/ui";
import { SidebarRecentsShimmer } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";
import type { GeneratedMaterial } from "@/lib/orbit-api";
import type { HomeAgent } from "@/lib/home-data";

export type SidebarSection = "home" | "library" | "agents";

type SidebarSectionNavProps = {
  expanded: boolean;
  section: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  onNewChat: () => void;
  labelClassName?: string;
};

export function SidebarSectionNav({
  expanded,
  section,
  onSectionChange,
  onNewChat,
  labelClassName = "",
}: SidebarSectionNavProps) {
  const tabs: { id: SidebarSection; label: string; icon: typeof FolderOpen }[] = [
    { id: "library", label: "Library", icon: FolderOpen },
    { id: "agents", label: "Agents", icon: LayoutGrid },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onNewChat}
        className={cn(
          "flex h-11 items-center rounded-2xl transition-all duration-300",
          expanded ? "gap-3 px-3 justify-start" : "justify-center",
          "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
        title="New chat"
        aria-label="New chat"
      >
        <MessageSquarePlus className="h-4 w-4 shrink-0" />
        {expanded && (
          <span className={cn("truncate text-sm font-medium", labelClassName)}>New chat</span>
        )}
      </button>

      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSectionChange(id)}
          className={cn(
            "flex h-11 items-center rounded-2xl transition-all duration-300",
            expanded ? "gap-3 px-3 justify-start" : "justify-center",
            section === id
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
          title={label}
          aria-label={label}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {expanded && (
            <span className={cn("truncate text-sm font-medium", labelClassName)}>{label}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Gemini-style recents ────────────────────────────────────────────────────

type RecentGroup = { label: string; items: Conversation[] };

function groupRecents(conversations: Conversation[]): RecentGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const previousWeek: Conversation[] = [];
  const older: Conversation[] = [];

  for (const conv of conversations) {
    const d = new Date(conv.updatedAt ?? conv.createdAt);
    if (d >= startOfToday) today.push(conv);
    else if (d >= startOfYesterday) yesterday.push(conv);
    else if (d >= startOfWeek) previousWeek.push(conv);
    else older.push(conv);
  }

  const groups: RecentGroup[] = [];
  if (today.length) groups.push({ label: "Today", items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (previousWeek.length) groups.push({ label: "Previous 7 days", items: previousWeek });
  if (older.length) groups.push({ label: "Older", items: older });
  return groups;
}

type SidebarRecentsListProps = {
  conversations: Conversation[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  activeId?: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
};

export function SidebarRecentsList({
  conversations,
  loading,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  activeId,
  onSelect,
  onDelete,
  compact = false,
}: SidebarRecentsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      conversations.filter((conv) =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [conversations, searchQuery],
  );

  const groups = useMemo(() => groupRecents(filtered), [filtered]);
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    if (!onLoadMore || !hasMore || loading || loadingMore || isSearching) return;

    const root = scrollRootRef.current;
    const target = loadMoreRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root, rootMargin: "80px", threshold: 0 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loading, loadingMore, isSearching, groups.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!compact && (
        <div className="relative mb-2 px-0.5">
          <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recents…"
            className="w-full rounded-full border-0 bg-muted/50 py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      <div ref={scrollRootRef} className="min-h-0 flex-1 overflow-y-auto pb-2">
        {loading && conversations.length === 0 ? (
          <SidebarRecentsShimmer />
        ) : groups.length === 0 ? (
          <p className="px-1 py-6 text-center text-[11px] text-muted-foreground">
            {searchQuery ? "No matching chats" : "No recent chats"}
          </p>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="mb-1 px-2 text-[10px] font-medium text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((conv) => (
                  <RecentChatItem
                    key={conv.id}
                    conversation={conv}
                    isActive={activeId === conv.id}
                    onSelect={onSelect}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            ))}
            {!isSearching && hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-3">
                {loadingMore && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading more chats" />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RecentChatItem({
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
  const agentLabel = conversation.agentShortName ?? conversation.agentName;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "group mb-0.5 flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-foreground/80 hover:bg-muted/80",
      )}
    >
      <span className="min-w-0 flex-1 truncate text-[13px] leading-snug">
        {conversation.title || "Untitled chat"}
      </span>
      {agentLabel && (
        <span
          className={cn(
            "hidden shrink-0 truncate text-[10px] group-hover:inline",
            isActive ? "text-accent-foreground/70" : "text-muted-foreground",
          )}
        >
          {agentLabel}
        </span>
      )}
      {onDelete && (
        <span
          role="button"
          tabIndex={0}
          className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(conversation.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onDelete(conversation.id);
            }
          }}
        >
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </span>
      )}
    </button>
  );
}

// ─── Main content panels (right side) ────────────────────────────────────────

type MainLibraryPanelProps = {
  materials: GeneratedMaterial[];
  loading: boolean;
  onSelect: (material: GeneratedMaterial) => void;
};

export function MainLibraryPanel({ materials, loading, onSelect }: MainLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = materials.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.agentName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pt-14">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground">
          Files and outputs generated by your agents
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search library…"
          className="w-full rounded-xl border bg-background/80 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <FolderOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Your library is empty</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((material) => (
            <button
              key={material.id}
              type="button"
              onClick={() => onSelect(material)}
              className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <AgentListingIcon
                iconKey={material.iconKey}
                colorKey={material.colorKey}
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-sm">{material.title}</p>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <FileText className="h-3 w-3 shrink-0" />
                  {material.type} · {material.agentName}
                </p>
                {material.date && (
                  <p className="mt-1 text-[10px] text-muted-foreground/70">{material.date}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** @deprecated use MainLibraryPanel */
export const MainMaterialsPanel = MainLibraryPanel;

type MainAgentsPanelProps = {
  agents: HomeAgent[];
  loading: boolean;
  onSelect: (agentId: string) => void;
};

export function MainAgentsPanel({ agents, loading, onSelect }: MainAgentsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pt-14">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
        <p className="text-sm text-muted-foreground">
          Specialized AI assistants for every task
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search agents…"
          className="w-full rounded-xl border bg-background/80 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => onSelect(agent.id)}
              className="w-full text-left"
            >
              <AgentCardTint
                colorKey={agent.colorKey}
                className="group flex h-full items-start gap-3 p-4 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <AgentListingIcon
                  iconKey={agent.iconKey}
                  colorKey={agent.colorKey}
                  className="shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0 space-y-1">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {agent.name}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {agent.description}
                  </p>
                </div>
              </AgentCardTint>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** @deprecated use SidebarRecentsList */
export const SidebarChatsList = SidebarRecentsList;

/** @deprecated use MainLibraryPanel in main content */
export const SidebarMaterialsList = MainLibraryPanel;
