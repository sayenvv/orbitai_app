"use client";

import { useMemo, useState, useRef, useEffect, type ChangeEvent } from "react";
import {
  AlertCircle,
  Download,
  FileText,
  FolderOpen,
  LayoutGrid,
  Loader2,
  MessageSquarePlus,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { AgentCardTint, AgentListingIcon } from "@orbit/ui";
import { SidebarRecentsShimmer } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatFileSize, formatRelativeDate } from "@/lib/format-library";
import { LibraryDeleteDialog } from "@/components/library/library-delete-dialog";
import { useRagUpload } from "@/hooks/use-rag-upload";
import type { LibraryGeneratedFile, LibraryUpload } from "@/hooks/use-library";
import type { Conversation } from "@/types";
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
  onDownloadUpload?: (upload: LibraryUpload) => void;
  onDeleteUpload?: (upload: LibraryUpload) => void | Promise<void>;
  onDownloadGenerated?: (file: LibraryGeneratedFile) => void;
  onDeleteGenerated?: (file: LibraryGeneratedFile) => void | Promise<void>;
};

type DeleteTarget =
  | { kind: "upload"; item: LibraryUpload }
  | { kind: "generated"; item: LibraryGeneratedFile };

function LibraryCardFooter({
  onUseInChat,
  onDownload,
  onDelete,
  useInChatDisabled = false,
  useInChatTitle = "Use in chat",
  downloadLabel = "Download",
  deleteLabel = "Delete",
}: {
  onUseInChat?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  useInChatDisabled?: boolean;
  useInChatTitle?: string;
  downloadLabel?: string;
  deleteLabel?: string;
}) {
  if (!onUseInChat && !onDownload && !onDelete) return null;

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
      {onUseInChat && (
        <button
          type="button"
          onClick={onUseInChat}
          disabled={useInChatDisabled}
          title={useInChatDisabled ? "Available when processing completes" : useInChatTitle}
          className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Use in chat</span>
        </button>
      )}
      <div className="flex shrink-0 items-center gap-1">
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={downloadLabel}
            title={downloadLabel}
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
            aria-label={deleteLabel}
            title={deleteLabel}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
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
  onDownloadUpload,
  onDeleteUpload,
  onDownloadGenerated,
  onDeleteGenerated,
}: MainLibraryPanelProps) {
  const [tab, setTab] = useState<LibraryTab>("uploads");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
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
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
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
                ? "bg-background text-foreground shadow-sm"
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
                ? "bg-background text-foreground shadow-sm"
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUploads.map((upload) => (
            <div
              key={upload.id}
              className="flex flex-col rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sm">{upload.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        uploadStatusClass(upload.status),
                      )}
                    >
                      {uploadStatusLabel(upload.status)}
                    </span>
                    {upload.status === "ready" && upload.pageCount > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {upload.pagesProcessed}/{upload.pageCount} pages
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {formatFileSize(upload.fileSizeBytes)} · {formatRelativeDate(upload.createdAt)}
                  </p>
                  {upload.status === "failed" && upload.errorMessage && (
                    <p className="mt-1 flex items-start gap-1 text-[10px] text-destructive">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">{upload.errorMessage}</span>
                    </p>
                  )}
                </div>
              </div>
              <LibraryCardFooter
                onUseInChat={() => onSelectUpload(upload)}
                useInChatDisabled={upload.status !== "ready"}
                onDownload={onDownloadUpload ? () => onDownloadUpload(upload) : undefined}
                onDelete={
                  onDeleteUpload
                    ? () => setDeleteTarget({ kind: "upload", item: upload })
                    : undefined
                }
                downloadLabel="Download PDF"
                deleteLabel="Delete upload"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGenerated.map((file) => (
            <div
              key={file.id}
              className="flex flex-col rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex min-w-0 items-start gap-3">
                <AgentListingIcon
                  iconKey={file.iconKey}
                  colorKey={file.colorKey}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sm">{file.title}</p>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 shrink-0" />
                    {file.type} · {file.agentName}
                  </p>
                  {file.preview && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground/80">
                      {file.preview}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {formatRelativeDate(file.createdAt)}
                  </p>
                </div>
              </div>
              <LibraryCardFooter
                onUseInChat={() => onSelectGenerated(file)}
                onDownload={onDownloadGenerated ? () => onDownloadGenerated(file) : undefined}
                onDelete={
                  onDeleteGenerated
                    ? () => setDeleteTarget({ kind: "generated", item: file })
                    : undefined
                }
                downloadLabel="Download file"
                deleteLabel="Delete generated file"
              />
            </div>
          ))}
        </div>
      )}
      </div>
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
