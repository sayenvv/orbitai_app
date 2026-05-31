"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

import {
  SidebarCollapsedNav,
  SidebarRecentsList,
  SidebarSectionNav,
  type SidebarSection,
} from "@/components/home/app-sidebar-panels";
import { SettingsHelpFooterTab } from "@/components/home/support-modal";
import { useSidebarChats } from "@/hooks/use-sidebar-chats";
import { navigateToNewChat } from "@/lib/chat-navigation";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";

type AppSidebarContentProps = {
  expanded: boolean;
  onExpand?: () => void;
  onNavigate?: () => void;
  /** Drawer uses outer scroll; rail keeps inner flex + scroll. */
  variant?: "rail" | "drawer";
  className?: string;
};

export function AppSidebarContent({
  expanded,
  onExpand,
  onNavigate,
  variant = "rail",
  className,
}: AppSidebarContentProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const { section, setSection, openLogin, openSupport } = useAppShell();
  const [focusSearch, setFocusSearch] = useState(false);
  const {
    conversations,
    loading: chatsLoading,
    loadingMore,
    hasMore,
    hydrated: chatsHydrated,
    loadMore,
    removeConversation,
    refresh,
  } = useSidebarChats();

  useEffect(() => {
    if (!expanded || !isAuthenticated || chatsHydrated || chatsLoading) return;
    void refresh();
  }, [expanded, isAuthenticated, chatsHydrated, chatsLoading, refresh]);

  const labelClassName = cn(
    "transition-[opacity,max-width] duration-150 ease-out",
    expanded ? "max-w-[12rem] opacity-100" : "max-w-0 opacity-0",
  );

  const handleSectionChange = (next: SidebarSection) => {
    setSection(next);
    if (next === "plans") {
      router.push("/plans");
    } else if (next === "apps") {
      router.push("/apps");
    } else if (next === "library") {
      router.push("/?section=library");
    } else if (next === "agents") {
      router.push("/?section=agents");
    } else if (next === "insights") {
      router.push("/insights");
    }
    onNavigate?.();
  };

  const handleNewChat = () => {
    setSection("home");
    navigateToNewChat(router);
    onNavigate?.();
  };

  const openChat = (id: string) => {
    router.push(`/c/${encodeURIComponent(id)}`);
    onNavigate?.();
  };

  const handleLibrary = () => {
    handleSectionChange("library");
  };

  const handleAgents = () => {
    handleSectionChange("agents");
  };

  const handleApps = () => {
    handleSectionChange("apps");
  };

  const handleSearch = () => {
    setFocusSearch(true);
    onExpand?.();
  };

  const historyLoading = chatsLoading || !chatsHydrated;
  const isDrawer = variant === "drawer";

  return (
    <div
      className={cn(
        "flex flex-col",
        !isDrawer && "min-h-0 flex-1",
        expanded
          ? isDrawer
            ? "py-3"
            : "px-2 py-3"
          : "items-center px-0 pb-3 pt-1",
        className,
      )}
    >
      {expanded ? (
        <SidebarSectionNav
          expanded
          section={section}
          onSectionChange={handleSectionChange}
          onNewChat={handleNewChat}
          isAuthenticated={isAuthenticated}
          labelClassName={labelClassName}
        />
      ) : (
        <SidebarCollapsedNav
          section={section}
          onNewChat={handleNewChat}
          onLibrary={handleLibrary}
          onAgents={handleAgents}
          onApps={handleApps}
          onSearch={handleSearch}
        />
      )}

      {expanded && isAuthenticated && (
        <div
          className={cn(
            "mt-3 border-t border-sidebar-border/60 pt-3",
            !isDrawer && "flex min-h-0 flex-1 flex-col",
          )}
        >
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recents
          </p>
          <SidebarRecentsList
            conversations={conversations}
            loading={chatsLoading}
            historyLoading={historyLoading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={() => void loadMore()}
            activeId={activeConversationId}
            onSelect={openChat}
            onDelete={(id) => void removeConversation(id)}
            autoFocusSearch={focusSearch}
            onSearchFocused={() => setFocusSearch(false)}
            useOuterScroll={isDrawer}
          />
        </div>
      )}

      {expanded && !isAuthenticated && (
        <div className="mt-3 space-y-3 border-t border-sidebar-border/60 pt-3">
          <button
            type="button"
            onClick={() => {
              openLogin("login");
              onNavigate?.();
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/90 p-3 text-left text-sm font-medium shadow-sm transition-all hover:border-primary/30 hover:bg-card"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LogIn className="h-4 w-4" />
            </span>
            <span>
              <span className="block">Sign in / Join</span>
              <span className="text-[11px] text-muted-foreground">
                Save chats and library items
              </span>
            </span>
          </button>
        </div>
      )}

      <SettingsHelpFooterTab
        collapsed={!expanded}
        showTopBorder={expanded}
        labelClassName={labelClassName}
        onOpen={() => {
          openSupport("settings");
          onNavigate?.();
        }}
      />
    </div>
  );
}
