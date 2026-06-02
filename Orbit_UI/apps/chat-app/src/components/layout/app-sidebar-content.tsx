"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";

import {
  SidebarCollapsedNav,
  SidebarRecentsList,
  SidebarSectionNav,
  type SidebarSection,
} from "@/components/home/app-sidebar-panels";
import { SettingsHelpFooterTab } from "@/components/home/support-modal";
import { SidebarUserFooter } from "@/components/layout/sidebar-user-footer";
import { useSidebarChats } from "@/hooks/use-sidebar-chats";
import { navigateToNewChat } from "@/lib/chat-navigation";
import {
  buildAppChatHref,
  isSameWorkspaceAppChat,
} from "@/lib/app-chat";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const { section, setSection, openLogin, openSupport, setProfileOpen } = useAppShell();
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
    "whitespace-nowrap transition-[opacity,transform,max-width] duration-200 ease-out",
    expanded ? "max-w-[12rem] translate-x-0 opacity-100" : "max-w-0 -translate-x-1 opacity-0",
  );

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const handleSectionChange = (next: SidebarSection) => {
    setSection(next);
    if (next === "plans") {
      router.push("/plans");
    } else if (next === "apps") {
      router.push("/apps");
    } else if (next === "library") {
      router.push("/?section=library");
    }
    onNavigate?.();
  };

  const handleNewChat = () => {
    setSection("home");
    navigateToNewChat(router);
    onNavigate?.();
  };

  const workspaceSourceId = /^\/apps\/[^/]+\/workspace/.test(pathname)
    ? searchParams.get("sourceId")
    : null;

  const openWorkspaceChat = (conversation: Conversation) => {
    const appHref = buildAppChatHref(conversation);
    if (!appHref) return;

    useChatStore.getState().setActiveConversation(conversation.id);

    if (isSameWorkspaceAppChat(conversation, workspaceSourceId)) {
      router.replace(appHref);
    } else {
      router.push(appHref);
    }
    onNavigate?.();
  };

  const openChat = (id: string) => {
    useChatStore.getState().setActiveConversation(id);
    router.push(`/c/${encodeURIComponent(id)}`);
    onNavigate?.();
  };

  const handleLibrary = () => {
    handleSectionChange("library");
  };

  const handleApps = () => {
    handleSectionChange("apps");
  };

  const handlePlans = () => {
    handleSectionChange("plans");
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
        "flex h-full flex-col",
        !isDrawer && "min-h-0 flex-1",
        className,
      )}
    >
      <div
        className={cn(
          "shrink-0",
          expanded ? "px-3 py-3" : "flex justify-center px-1 py-2",
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
            onApps={handleApps}
            onPlans={handlePlans}
            onSearch={handleSearch}
            isAuthenticated={isAuthenticated}
          />
        )}
      </div>

      {expanded && isAuthenticated && (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col px-3 pt-3",
            !isDrawer && "overflow-hidden",
          )}
        >
          <SidebarRecentsList
            conversations={conversations}
            loading={chatsLoading}
            historyLoading={historyLoading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={() => void loadMore()}
            activeId={activeConversationId}
            onSelect={openChat}
            onOpenWorkspaceChat={openWorkspaceChat}
            workspaceSourceId={workspaceSourceId}
            onDelete={(id) => void removeConversation(id)}
            autoFocusSearch={focusSearch}
            onSearchFocused={() => setFocusSearch(false)}
            useOuterScroll={isDrawer}
          />
        </div>
      )}

      {expanded && !isAuthenticated && (
        <div className="mt-auto px-3 py-3">
          <button
            type="button"
            onClick={() => {
              openLogin("login");
              onNavigate?.();
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-violet-500/5 to-pink-500/10 px-3 py-2.5 text-left transition-all hover:from-primary/15 hover:via-violet-500/10 hover:to-pink-500/15"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <LogIn className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <span>
              <span className="block text-[13px] font-medium">Sign in</span>
              <span className="text-[11px] text-muted-foreground">
                Save chats and library
              </span>
            </span>
          </button>
        </div>
      )}

      {isAuthenticated ? (
        <SidebarUserFooter
          expanded={expanded}
          name={user?.name ?? "Account"}
          initials={initials}
          subtitle={user?.email}
          labelClassName={labelClassName}
          onProfile={() => {
            setProfileOpen(true);
            onNavigate?.();
          }}
          onSettings={() => {
            openSupport("settings");
            onNavigate?.();
          }}
        />
      ) : (
        <SettingsHelpFooterTab
          collapsed={!expanded}
          showTopBorder={expanded}
          labelClassName={labelClassName}
          onOpen={() => {
            openSupport("settings");
            onNavigate?.();
          }}
        />
      )}
    </div>
  );
}
