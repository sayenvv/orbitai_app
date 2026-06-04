"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Crown,
  Folders,
  LogIn,
  MessageCirclePlus,
  type LucideIcon,
} from "lucide-react";

import {
  SidebarCollapsedNav,
  SidebarRecentsList,
  type SidebarSection,
} from "@/components/home/app-sidebar-panels";
import { SettingsHelpFooterTab } from "@/components/home/support-modal";
import { SidebarUserFooter } from "@/components/layout/sidebar-user-footer";
import { useSidebarChats } from "@/hooks/use-sidebar-chats";
import { navigateToNewChat, conversationPath } from "@/lib/chat-navigation";
import { routes, homeWithSection } from "@/lib/routes";
import {
  buildAppChatHref,
  isSameWorkspaceAppChat,
} from "@/lib/app-chat";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";
import {
  SIDEBAR_COLLAPSED_COLUMN_CLASS,
  SIDEBAR_PADDING_X,
  SIDEBAR_ICON_SLOT_CLASS,
  SIDEBAR_NAV_GLYPH_CLASS,
  sidebarNavRowClassName,
} from "@/components/layout/sidebar-layout";
import type { Conversation } from "@/types";

function SidebarNavRow({
  icon: Icon,
  label,
  active = false,
  onClick,
  labelClassName,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  labelClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        sidebarNavRowClassName("w-full rounded-full text-[13px] font-medium transition-all"),
        active
          ? "bg-foreground/[0.07] text-foreground dark:bg-white/[0.14]"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]",
      )}
    >
      <span className={SIDEBAR_ICON_SLOT_CLASS}>
        <Icon
          className={cn(
            SIDEBAR_NAV_GLYPH_CLASS,
            active ? "text-foreground" : "text-muted-foreground",
          )}
          strokeWidth={1.75}
        />
      </span>
      <span className={cn("truncate", labelClassName)}>{label}</span>
    </button>
  );
}

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
      router.push(routes.plans);
    } else if (next === "apps") {
      router.push(routes.apps.store);
    } else if (next === "library") {
      router.push(homeWithSection("library"));
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
    router.push(conversationPath(id));
    onNavigate?.();
  };

  const handleLibrary = () => {
    handleSectionChange("library");
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

  const navItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    active?: boolean;
  }> = isAuthenticated
    ? [
        { key: "new", icon: MessageCirclePlus, label: "New chat", onClick: handleNewChat },
        { key: "library", icon: Folders, label: "Library", onClick: handleLibrary, active: section === "library" },
      ]
    : [
        { key: "new", icon: MessageCirclePlus, label: "New chat", onClick: handleNewChat },
        { key: "plans", icon: Crown, label: "Plans", onClick: handlePlans, active: section === "plans" },
      ];

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
          expanded ? cn(SIDEBAR_PADDING_X, "py-3") : cn(SIDEBAR_COLLAPSED_COLUMN_CLASS, "py-3"),
        )}
      >
        {expanded ? (
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <SidebarNavRow
                key={item.key}
                icon={item.icon}
                label={item.label}
                active={item.active}
                onClick={item.onClick}
                labelClassName={labelClassName}
              />
            ))}
          </nav>
        ) : (
          <SidebarCollapsedNav
            section={section}
            onNewChat={handleNewChat}
            onLibrary={handleLibrary}
            onPlans={handlePlans}
            onSearch={handleSearch}
            isAuthenticated={isAuthenticated}
          />
        )}
      </div>

      {expanded && isAuthenticated && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pt-3">
          <p className="mb-1 shrink-0 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
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
            onOpenWorkspaceChat={openWorkspaceChat}
            workspaceSourceId={workspaceSourceId}
            onDelete={(id) => void removeConversation(id)}
            autoFocusSearch={focusSearch}
            onSearchFocused={() => setFocusSearch(false)}
            useOuterScroll={false}
            flatList
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
