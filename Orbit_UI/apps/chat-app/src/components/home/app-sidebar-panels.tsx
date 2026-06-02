"use client";

import { useMemo, useState, useRef, useEffect, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bot,
  Crown,
  Download,
  FileText,
  FolderOpen,
  LibraryBig,
  Loader2,
  Maximize2,
  MessageSquarePlus,
  Plus,
  Search,
  Sparkles,
  SquarePen,
  Store,
  MessageSquare,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { AgentCardTint, AgentListingIcon } from "@orbit/ui";
import { SidebarRecentsRowsShimmer } from "@/components/ui/skeleton";
import { SidebarTooltip } from "@/components/layout/sidebar-tooltip";
import { cn } from "@/lib/utils";
import { chatApi, mapConversationSummary } from "@/lib/orbit-api";
import { getAppChatLabel, isAppChatConversation, isSameWorkspaceAppChat } from "@/lib/app-chat";
import { formatFileSize, formatRelativeDate } from "@/lib/format-library";
import { LibraryDeleteDialog } from "@/components/library/library-delete-dialog";
import { InsightGeneratingOverlay } from "@/components/insights/insight-generating-overlay";
import { InsightSectionTabs } from "@/components/insights/insight-panel";
import { InsightsMarkdown } from "@/components/insights/insights-markdown";
import { parseInsightSections } from "@/lib/parse-insight-sections";
import { isAiInsight } from "@/lib/insights";
import { useRagUpload } from "@/hooks/use-rag-upload";
import type { LibraryGeneratedFile, LibraryUpload } from "@/hooks/use-library";
import type { Conversation } from "@/types";
import type { HomeAgent } from "@/lib/home-data";
import { catalogAppIds, getAppWorkspaceHref, visibleAppsCatalog, type CatalogApp } from "@orbit/clovai-apps";

export type SidebarSection = "home" | "library" | "agents" | "apps" | "plans";

type SidebarSectionNavProps = {
  expanded: boolean;
  section: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  onNewChat: () => void;
  isAuthenticated?: boolean;
  labelClassName?: string;
};

const collapsedNavBtnClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-foreground";

function sidebarNavItemClass(active: boolean) {
  return cn(
    "flex w-full items-center gap-2.5 rounded-lg px-2 py-[7px] text-[13px] transition-colors",
    active
      ? "bg-sidebar-accent font-medium text-foreground"
      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
  );
}

type SidebarNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
};

type SidebarCollapsedNavProps = {
  section: SidebarSection;
  onNewChat: () => void;
  onLibrary: () => void;
  onApps: () => void;
  onPlans: () => void;
  onSearch: () => void;
  isAuthenticated?: boolean;
};

export function SidebarCollapsedNav({
  section,
  onNewChat,
  onLibrary,
  onApps,
  onPlans,
  onSearch,
  isAuthenticated = true,
}: SidebarCollapsedNavProps) {
  const authenticatedItems: SidebarNavItem[] = [
    { key: "library", label: "Library", icon: LibraryBig, active: section === "library", onClick: onLibrary },
    { key: "apps", label: "Apps", icon: Store, active: section === "apps", onClick: onApps },
    { key: "search", label: "Search chats", icon: Search, active: false, onClick: onSearch },
  ];
  const guestItems: SidebarNavItem[] = [
    { key: "apps", label: "Apps", icon: Store, active: section === "apps", onClick: onApps },
    { key: "plans", label: "Plans", icon: Crown, active: section === "plans", onClick: onPlans },
    { key: "search", label: "Search chats", icon: Search, active: false, onClick: onSearch },
  ];
  const items = isAuthenticated ? authenticatedItems : guestItems;

  return (
    <div className="flex w-full flex-col items-center gap-1 py-1">
      <SidebarTooltip label="New chat" side="right">
        <button
          type="button"
          onClick={onNewChat}
          aria-label="New chat"
          className={collapsedNavBtnClass}
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
        </button>
      </SidebarTooltip>

      {items.map(({ key, label, icon: Icon, active, onClick }) => (
        <SidebarTooltip key={key} label={label} side="right">
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={cn(
              collapsedNavBtnClass,
              active && "bg-sidebar-accent font-medium text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          </button>
        </SidebarTooltip>
      ))}
    </div>
  );
}

export function SidebarSectionNav({
  expanded,
  section,
  onSectionChange,
  onNewChat,
  isAuthenticated = true,
  labelClassName = "",
}: SidebarSectionNavProps) {
  const authenticatedTabs: { id: SidebarSection; label: string; icon: LucideIcon }[] = [
    { id: "library", label: "Library", icon: LibraryBig },
    { id: "apps", label: "Apps", icon: Store },
  ];

  const guestTabs: { id: SidebarSection; label: string; icon: LucideIcon }[] = [
    { id: "apps", label: "Apps", icon: Store },
    { id: "plans", label: "Plans", icon: Crown },
  ];

  const tabs = isAuthenticated ? authenticatedTabs : guestTabs;

  return (
    <nav className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={onNewChat}
        className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-foreground"
        title="New chat"
        aria-label="New chat"
      >
        <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
        {expanded && <span className={cn("truncate", labelClassName)}>New chat</span>}
      </button>

      <div className="mt-1 flex flex-col gap-0.5">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = section === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSectionChange(id)}
              className={sidebarNavItemClass(isActive)}
              title={label}
              aria-label={label}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
                strokeWidth={1.75}
              />
              {expanded && (
                <span className={cn("truncate", labelClassName)}>{label}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
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

function buildFlatRecentGroups(conversations: Conversation[]): RecentGroup[] {
  const sorted = [...conversations].sort(
    (a, b) =>
      new Date(b.updatedAt ?? b.createdAt).getTime() -
      new Date(a.updatedAt ?? a.createdAt).getTime(),
  );
  return groupRecents(sorted);
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
  onOpenWorkspaceChat?: (conversation: Conversation) => void;
  workspaceSourceId?: string | null;
  compact?: boolean;
  autoFocusSearch?: boolean;
  onSearchFocused?: () => void;
  historyLoading?: boolean;
  /** When true, list grows naturally and parent scrolls (mobile drawer). */
  useOuterScroll?: boolean;
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
  onOpenWorkspaceChat,
  workspaceSourceId = null,
  compact = false,
  autoFocusSearch = false,
  onSearchFocused,
  historyLoading,
  useOuterScroll = false,
}: SidebarRecentsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Conversation[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const trimmedSearch = searchQuery.trim();
  const isSearching = debouncedQuery.length > 0;
  const awaitingSearch = trimmedSearch.length > 0 && !isSearching;
  const showHistoryShimmer =
    (historyLoading ?? loading) && conversations.length === 0 && trimmedSearch.length === 0;

  useEffect(() => {
    if (!trimmedSearch) {
      setDebouncedQuery("");
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmedSearch);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [trimmedSearch]);

  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);

    void chatApi
      .listConversations({ q: debouncedQuery, limit: 50 })
      .then((data) => {
        if (controller.signal.aborted) return;
        setSearchResults(data.data.map(mapConversationSummary));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setSearchResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearchLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  const displayConversations =
    trimmedSearch.length === 0
      ? conversations
      : awaitingSearch
        ? conversations
        : searchLoading
          ? []
          : (searchResults ?? []);

  const showListShimmer =
    showHistoryShimmer || (trimmedSearch.length > 0 && isSearching && searchLoading);

  const recentGroups = useMemo(
    () => buildFlatRecentGroups(displayConversations),
    [displayConversations],
  );
  const hasHistoryItems = recentGroups.some((group) => group.items.length > 0);

  useEffect(() => {
    if (!onLoadMore || !hasMore || loading || loadingMore || trimmedSearch.length > 0) return;

    const root = useOuterScroll ? null : scrollRootRef.current;
    const target = loadMoreRef.current;
    if (!useOuterScroll && !root) return;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root, rootMargin: "80px", threshold: 0 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loading, loadingMore, trimmedSearch, recentGroups.length, useOuterScroll]);

  useEffect(() => {
    if (!autoFocusSearch) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
      onSearchFocused?.();
    }, 320);
    return () => window.clearTimeout(timer);
  }, [autoFocusSearch, onSearchFocused]);

  return (
    <div className={cn("flex flex-col", !useOuterScroll && "min-h-0 flex-1")}>
      {!compact && (
        <div
          className={cn(
            "relative mb-2 w-full shrink-0",
            useOuterScroll && "sticky top-0 z-10 bg-sidebar pb-2",
          )}
        >
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/45"
            strokeWidth={1.75}
          />
          <input
            ref={searchInputRef}
            type="search"
            enterKeyHint="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="h-8 w-full rounded-lg border-0 bg-transparent pl-7 pr-7 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 transition-colors hover:bg-sidebar-accent/50 focus:bg-sidebar-accent/70 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          {(awaitingSearch || searchLoading) && (
            <Loader2 className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-muted-foreground/60" />
          )}
          {!awaitingSearch && !searchLoading && trimmedSearch && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      <div
        ref={scrollRootRef}
        className={cn("pb-2", !useOuterScroll && "min-h-0 flex-1 overflow-y-auto")}
      >
        {showListShimmer ? (
          <SidebarRecentsRowsShimmer />
        ) : !hasHistoryItems ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            {trimmedSearch.length > 0 ? "No matching chats" : "No conversations yet"}
          </p>
        ) : (
          <>
            {recentGroups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="mb-1 px-2 text-[11px] font-medium text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((conv) => (
                  <RecentChatItem
                    key={conv.id}
                    conversation={conv}
                    isActive={activeId === conv.id}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onOpenWorkspaceChat={onOpenWorkspaceChat}
                    workspaceSourceId={workspaceSourceId}
                  />
                ))}
              </div>
            ))}
            {trimmedSearch.length === 0 && hasMore && (
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
  onOpenWorkspaceChat,
  workspaceSourceId = null,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenWorkspaceChat?: (conversation: Conversation) => void;
  workspaceSourceId?: string | null;
}) {
  const appLabel = getAppChatLabel(conversation);
  const agentLabel = appLabel ?? conversation.agentShortName ?? conversation.agentName;
  const isAppChat = isAppChatConversation(conversation);
  const isCurrentWorkspaceChat = isSameWorkspaceAppChat(conversation, workspaceSourceId);
  const showWorkspaceChatAction = Boolean(isAppChat && onOpenWorkspaceChat);
  const workspaceActionLabel =
    workspaceSourceId && isCurrentWorkspaceChat ? "Open in app" : "Open workspace";

  return (
    <div
      className={cn(
        "group flex w-full items-center gap-0.5 rounded-lg pr-1 transition-colors",
        isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left",
          isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] leading-snug">
          {conversation.title || "Untitled chat"}
        </span>
        {agentLabel && !showWorkspaceChatAction && (
          <span className="hidden max-w-[5rem] shrink-0 truncate text-[10px] text-muted-foreground group-hover:inline">
            {agentLabel}
          </span>
        )}
      </button>
      {showWorkspaceChatAction && (
        <button
          type="button"
          title={workspaceActionLabel}
          aria-label={workspaceActionLabel}
          onClick={() => onOpenWorkspaceChat?.(conversation)}
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-medium transition-colors",
            isActive
              ? "bg-background/70 text-foreground hover:bg-background"
              : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="max-w-[5.5rem] truncate">{workspaceActionLabel}</span>
        </button>
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
    </div>
  );
}

// ─── Main content panels (right side) ────────────────────────────────────────

// ─── Library panel ───────────────────────────────────────────────────────────

type LibraryTab = "uploads" | "generated";

function uploadStatusLabel(status: LibraryUpload["status"]): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "processing":
      return "Processing";
    case "pending":
      return "Queued";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function uploadStatusClass(status: LibraryUpload["status"]): string {
  switch (status) {
    case "ready":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "failed":
      return "bg-destructive/10 text-destructive";
    case "processing":
    case "pending":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

type MainLibraryPanelProps = {
  uploads: LibraryUpload[];
  generated: LibraryGeneratedFile[];
  loading: boolean;
  isAuthenticated?: boolean;
  onRefresh?: () => void | Promise<void>;
  onRequireAuth?: () => void;
  onSelectUpload: (upload: LibraryUpload) => void;
  onSelectGenerated: (file: LibraryGeneratedFile) => void;
  onGenerateInsights?: (upload: LibraryUpload) => Promise<{ id: string } | void> | { id: string } | void;
  onDownloadUpload?: (upload: LibraryUpload) => void;
  onDeleteUpload?: (upload: LibraryUpload) => void | Promise<void>;
  onDownloadGenerated?: (file: LibraryGeneratedFile) => void;
  onDeleteGenerated?: (file: LibraryGeneratedFile) => void | Promise<void>;
};

type DeleteTarget =
  | { kind: "upload"; item: LibraryUpload }
  | { kind: "generated"; item: LibraryGeneratedFile };

type OpenInTarget = {
  upload: LibraryUpload;
  insight?: LibraryGeneratedFile;
};

const LIBRARY_OPEN_IN_APP_IDS = [catalogAppIds.researchCompanion] as const;
const libraryOpenInApps = visibleAppsCatalog.filter((app) =>
  LIBRARY_OPEN_IN_APP_IDS.includes(app.id as (typeof LIBRARY_OPEN_IN_APP_IDS)[number]),
);

function OpenInAppPicker({
  target,
  onCancel,
  onSelect,
}: {
  target: OpenInTarget | null;
  onCancel: () => void;
  onSelect: (app: CatalogApp) => void;
}) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-[10004] flex items-center justify-center overflow-hidden bg-background/70 px-4 backdrop-blur-md">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close app picker"
        onClick={onCancel}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-80">
        <div className="aurora opacity-70" />
        <div className="grid-dots absolute inset-0 opacity-25" />
      </div>

      <div className="relative w-full max-w-[24rem] overflow-hidden rounded-[1.75rem] border border-border/55 bg-card/92 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.2)] ring-1 ring-white/10 backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Open in
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Choose an app</h2>
            <p className="mt-1 truncate text-xs text-muted-foreground">{target.upload.title}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            aria-label="Close app picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {libraryOpenInApps.map((app) => {
            const compatible = app.id === catalogAppIds.researchCompanion;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => compatible && onSelect(app)}
                disabled={!compatible}
                title={compatible ? `Open in ${app.name}` : "Uploaded files are not compatible with this app"}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-background/70 p-3 text-left transition-all",
                  compatible
                    ? "hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background"
                    : "cursor-not-allowed opacity-55",
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm",
                    app.heroGradient,
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {app.name}
                  </span>
                  <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {compatible ? app.shortDescription : "Incompatible with uploaded files"}
                  </span>
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                    compatible
                      ? "bg-primary/10 text-primary opacity-80 transition-opacity group-hover:opacity-100"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {compatible ? "Open" : "Blocked"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LibraryCardIconActions({
  onDownload,
  onDelete,
  shareSlot,
  downloadLabel = "Download",
  deleteLabel = "Delete",
  className,
}: {
  onDownload?: () => void;
  onDelete?: () => void;
  shareSlot?: ReactNode;
  downloadLabel?: string;
  deleteLabel?: string;
  className?: string;
}) {
  if (!onDownload && !onDelete && !shareSlot) return null;

  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", className)}>
      {shareSlot}
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
          aria-label={downloadLabel}
          title={downloadLabel}
        >
          <Download className="h-4 w-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label={deleteLabel}
          title={deleteLabel}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function LibraryCardActions({
  onUseInChat,
  onGenerateInsights,
  onToggleExpand,
  expanded = false,
  useInChatDisabled = false,
  insightsLoading = false,
  insightsLabel = "Generate",
  insightsTitle = "Generate AI insights",
  useInChatTitle = "Use in chat",
}: {
  onUseInChat?: () => void;
  onGenerateInsights?: () => void;
  onToggleExpand?: () => void;
  expanded?: boolean;
  useInChatDisabled?: boolean;
  insightsLoading?: boolean;
  insightsLabel?: string;
  insightsTitle?: string;
  useInChatTitle?: string;
}) {
  if (!onUseInChat && !onGenerateInsights && !onToggleExpand) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {onToggleExpand && (
        <button
          type="button"
          onClick={onToggleExpand}
          title={expanded ? "Collapse preview" : "Expand preview"}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/50 px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          <Maximize2 className="h-3.5 w-3.5 shrink-0 text-primary" />
          {expanded ? "Collapse" : "Expand"}
        </button>
      )}
      {onUseInChat && (
        <button
          type="button"
          onClick={onUseInChat}
          disabled={useInChatDisabled}
          title={useInChatDisabled ? "Available when processing completes" : useInChatTitle}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
          Chat
        </button>
      )}
      {onGenerateInsights && (
        <button
          type="button"
          onClick={onGenerateInsights}
          disabled={useInChatDisabled}
          title={useInChatDisabled ? "Available when processing completes" : insightsTitle}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/50 px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {insightsLoading ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
          )}
          {insightsLoading ? "Generating…" : insightsLabel}
        </button>
      )}
    </div>
  );
}

type LibraryItemCardProps = {
  icon: ReactNode;
  title: string;
  badges?: ReactNode;
  meta?: string;
  description?: string;
  error?: ReactNode;
  onDownload?: () => void;
  onDelete?: () => void;
  shareSlot?: ReactNode;
  downloadLabel?: string;
  deleteLabel?: string;
  onUseInChat?: () => void;
  onGenerateInsights?: () => void;
  expandContent?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
  useInChatDisabled?: boolean;
  insightsLoading?: boolean;
  insightsLabel?: string;
  insightsTitle?: string;
};

function LibraryItemCard({
  icon,
  title,
  badges,
  meta,
  description,
  error,
  onDownload,
  onDelete,
  shareSlot,
  downloadLabel,
  deleteLabel,
  onUseInChat,
  onGenerateInsights,
  expandContent,
  expanded = false,
  onToggleExpand,
  useInChatDisabled,
  insightsLoading,
  insightsLabel,
  insightsTitle,
}: LibraryItemCardProps) {
  const sections = useMemo(
    () => (expandContent ? parseInsightSections(expandContent) : []),
    [expandContent],
  );
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "overview");
  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0];

  return (
    <article
      className={cn(
        "group rounded-xl border border-border/40 bg-card/50 p-4 transition-colors hover:border-border/70 hover:bg-card",
        expanded && "border-border/70 bg-card",
      )}
    >
      <div className="flex gap-3.5">
        <div className="shrink-0 pt-0.5">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1.5">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug tracking-tight text-foreground">
                {title}
              </h3>
              {(badges || meta) && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {badges}
                  {meta && (
                    <span className="text-[11px] tabular-nums text-muted-foreground">{meta}</span>
                  )}
                </div>
              )}
            </div>
            <LibraryCardIconActions
              onDownload={onDownload}
              onDelete={onDelete}
              shareSlot={shareSlot}
              downloadLabel={downloadLabel}
              deleteLabel={deleteLabel}
              className="-mr-1 -mt-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            />
          </div>

          {description && !expanded && (
            <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}

          {expanded && expandContent && (
            <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
              <InsightSectionTabs
                sections={sections}
                activeId={activeSectionId}
                onChange={setActiveSectionId}
                size="sm"
              />
              <div className="max-h-[240px] overflow-y-auto rounded-lg bg-muted/20 px-3 py-3">
                <InsightsMarkdown
                  content={activeSection?.content ?? expandContent}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {error}

          <LibraryCardActions
            onUseInChat={onUseInChat}
            onGenerateInsights={onGenerateInsights}
            onToggleExpand={expandContent ? onToggleExpand : undefined}
            expanded={expanded}
            useInChatDisabled={useInChatDisabled}
            insightsLoading={insightsLoading}
            insightsLabel={insightsLabel}
            insightsTitle={insightsTitle}
          />
        </div>
      </div>
    </article>
  );
}

export function MainLibraryPanel({
  uploads,
  generated,
  loading,
  isAuthenticated = true,
  onRefresh,
  onRequireAuth,
  onSelectUpload,
  onSelectGenerated,
  onGenerateInsights,
  onDownloadUpload,
  onDeleteUpload,
  onDownloadGenerated,
  onDeleteGenerated,
}: MainLibraryPanelProps) {
  const router = useRouter();
  const [tab, setTab] = useState<LibraryTab>("uploads");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [insightsGeneratingId, setInsightsGeneratingId] = useState<string | null>(null);
  const [insightsError, setInsightsError] = useState("");
  const [expandedGeneratedId, setExpandedGeneratedId] = useState<string | null>(null);
  const [openInTarget, setOpenInTarget] = useState<OpenInTarget | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, progress, error: uploadError, uploadPdf, clearError } = useRagUpload();

  const handleUploadClick = () => {
    clearError();
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await uploadPdf(file);
    if (result) {
      await onRefresh?.();
      setTab("uploads");
    }
    event.target.value = "";
  };

  const handleGenerateInsights = async (upload: LibraryUpload) => {
    if (insightsGeneratingId === upload.id) return;
    if (!onGenerateInsights || upload.status !== "ready") return;
    setInsightsError("");
    setInsightsGeneratingId(upload.id);
    try {
      await onGenerateInsights(upload);
      await onRefresh?.();
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Failed to generate insights");
    } finally {
      setInsightsGeneratingId(null);
    }
  };

  const findGeneratedInsightForUpload = (upload: LibraryUpload) =>
    generated.find((file) => {
      if (!isAiInsight(file)) return false;
      return (
        file.sourceDocumentId === upload.id ||
        file.sourceFilename === upload.title ||
        file.title === `Insights: ${upload.title}`
      );
    });

  const handleOpenInApp = (target: OpenInTarget, app: CatalogApp) => {
    const params = new URLSearchParams({
      sourceId: target.upload.id,
      sourceName: target.upload.title,
      sourceType: "uploaded-file",
    });
    if (target.insight?.id) {
      params.set("insightId", target.insight.id);
    }
    router.push(`${getAppWorkspaceHref(app)}?${params.toString()}`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "upload") {
        await onDeleteUpload?.(deleteTarget.item);
      } else {
        await onDeleteGenerated?.(deleteTarget.item);
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const deleteDialogCopy =
    deleteTarget?.kind === "upload"
      ? {
          title: "Delete uploaded file?",
          description:
            "This PDF will be removed from your library and deleted from storage. Chats that used it will no longer be able to reference this document.",
        }
      : {
          title: "Delete generated file?",
          description:
            "This generated output will be permanently removed from your library. This action cannot be undone.",
        };

  const filteredUploads = uploads.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredGenerated = generated.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeItems = tab === "uploads" ? filteredUploads : filteredGenerated;
  const emptyCopy =
    tab === "uploads"
      ? "No uploads yet. Upload a PDF to add it to your library."
      : "No generated files yet. Outputs saved by agents will appear here.";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />

      <LibraryDeleteDialog
        open={deleteTarget != null}
        title={deleteDialogCopy.title}
        itemName={deleteTarget?.item.title ?? ""}
        description={deleteDialogCopy.description}
        deleting={deleting}
        onCancel={() => !deleting && setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      <OpenInAppPicker
        target={openInTarget}
        onCancel={() => setOpenInTarget(null)}
        onSelect={(app) => {
          if (!openInTarget) return;
          const target = openInTarget;
          setOpenInTarget(null);
          handleOpenInApp(target, app);
        }}
      />

      <div className="mx-auto w-full max-w-5xl space-y-6 pt-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Library</h1>
          <p className="text-sm text-muted-foreground">
            Your uploaded PDFs and agent-generated files in one place
          </p>
        </div>
        {tab === "uploads" && (
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={uploading}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {uploading ? progress || "Uploading…" : "Upload PDF"}
          </button>
        )}
      </div>

      {uploadError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {uploadError}
        </div>
      )}

      {insightsError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {insightsError}
        </div>
      )}

      {uploading && progress && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          {progress}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-border/60 bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setTab("uploads")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "uploads"
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            Uploads
            {uploads.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                {uploads.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("generated")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "generated"
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generated
            {generated.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                {generated.length}
              </span>
            )}
          </button>
        </div>

        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tab === "uploads" ? "Search uploads…" : "Search generated files…"}
            className="w-full rounded-xl border bg-background/80 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {!isAuthenticated ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <FolderOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Sign in to view your library</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : activeItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center">
          {tab === "uploads" ? (
            <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          ) : (
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          )}
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "No matching items" : emptyCopy}
          </p>
          {tab === "uploads" && !searchQuery && isAuthenticated && (
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={uploading}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload PDF
            </button>
          )}
        </div>
      ) : tab === "uploads" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredUploads.map((upload) => {
            const generatedInsight = findGeneratedInsightForUpload(upload);
            const isGenerating = insightsGeneratingId === upload.id;
            const insightsReady = Boolean(generatedInsight);
            return (
              <LibraryItemCard
                key={upload.id}
                icon={
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/[0.08] text-red-600 dark:text-red-400">
                    <FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </div>
                }
                title={upload.title}
                badges={
                  <>
                    <span
                      className={cn(
                        "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        uploadStatusClass(upload.status),
                      )}
                    >
                      {uploadStatusLabel(upload.status)}
                    </span>
                    {insightsReady && (
                      <span className="inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                        Insights ready
                      </span>
                    )}
                    {upload.status === "ready" && upload.pageCount > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        {upload.pagesProcessed}/{upload.pageCount} pg
                      </span>
                    )}
                  </>
                }
                meta={`${formatFileSize(upload.fileSizeBytes)} · ${formatRelativeDate(upload.createdAt)}`}
                error={
                  upload.status === "failed" && upload.errorMessage ? (
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-destructive">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-2">{upload.errorMessage}</span>
                    </p>
                  ) : undefined
                }
                onDownload={onDownloadUpload ? () => onDownloadUpload(upload) : undefined}
                onDelete={
                  onDeleteUpload
                    ? () => setDeleteTarget({ kind: "upload", item: upload })
                    : undefined
                }
                downloadLabel="Download PDF"
                deleteLabel="Delete upload"
                onUseInChat={() => onSelectUpload(upload)}
                onGenerateInsights={
                  onGenerateInsights && isAuthenticated
                    ? () => {
                        if (isGenerating) return;
                        if (generatedInsight) {
                          setOpenInTarget({ upload, insight: generatedInsight });
                          return;
                        }
                        void handleGenerateInsights(upload);
                      }
                    : undefined
                }
                insightsLoading={isGenerating}
                insightsLabel={insightsReady ? "Open in" : "Generate"}
                insightsTitle={
                  insightsReady
                    ? "Choose an app to open this document"
                    : "Generate AI insights"
                }
                useInChatDisabled={upload.status !== "ready"}
              />
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredGenerated.map((file) => (
            <LibraryItemCard
              key={file.id}
              icon={
                <AgentListingIcon
                  iconKey={file.iconKey}
                  colorKey={file.colorKey}
                  className="shrink-0"
                />
              }
              title={file.title}
              badges={
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary/80" />
                  {file.type}
                </span>
              }
              meta={`${file.agentName} · ${formatRelativeDate(file.createdAt)}`}
              description={file.preview || undefined}
              onDownload={onDownloadGenerated ? () => onDownloadGenerated(file) : undefined}
              onDelete={
                onDeleteGenerated
                  ? () => setDeleteTarget({ kind: "generated", item: file })
                  : undefined
              }
              downloadLabel="Download file"
              deleteLabel="Delete generated file"
              onUseInChat={() => onSelectGenerated(file)}
              expandContent={file.preview.trim() || undefined}
              expanded={expandedGeneratedId === file.id}
              onToggleExpand={
                file.preview.trim()
                  ? () =>
                      setExpandedGeneratedId((current) =>
                        current === file.id ? null : file.id,
                      )
                  : undefined
              }
            />
          ))}
        </div>
      )}
      </div>

      {insightsGeneratingId && (
        <InsightGeneratingOverlay
          sourceName={uploads.find((upload) => upload.id === insightsGeneratingId)?.title}
        />
      )}
    </>
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
