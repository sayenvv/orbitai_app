"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Crown,
  Folders,
  MessageCirclePlus,
  Rocket,
  type LucideIcon,
} from "lucide-react";

import {
  SidebarCollapsedNav,
  SidebarRecentsList,
  type SidebarSection,
} from "@/components/home/app-sidebar-panels";
import { SettingsHelpFooterTab } from "@/components/home/support-modal";
import { SidebarAuthFooter } from "@/components/layout/sidebar-auth-footer";
import { SidebarUserFooter } from "@/components/layout/sidebar-user-footer";
import { useSidebarChats } from "@/hooks/use-sidebar-chats";
import { useTokenUsage } from "@/hooks/use-token-usage";
import { useUsageStore } from "@/store/usage-store";
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
          ? "workspace-tab-active"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]",
      )}
    >
      <span className={SIDEBAR_ICON_SLOT_CLASS}>
        <Icon className={SIDEBAR_NAV_GLYPH_CLASS} strokeWidth={1.75} />
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
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useTokenUsage();
  const plan = useUsageStore((s) => s.usage?.plan ?? "free");
  const planLabel = `${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan`;
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

  const handlePlatform = () => {
    router.push(routes.platform);
    onNavigate?.();
  };

  const isPlatformActive = pathname === routes.platform || pathname.startsWith(`${routes.platform}/`);
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
        { key: "platform", icon: Rocket, label: "Platform", onClick: handlePlatform, active: isPlatformActive },
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
            onPlatform={handlePlatform}
            platformActive={isPlatformActive}
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

      {!isAuthenticated && (
        <SidebarAuthFooter
          expanded={expanded}
          labelClassName={labelClassName}
          onSignIn={() => {
            openLogin("login");
            onNavigate?.();
          }}
          onSignUp={() => {
            openLogin("register");
            onNavigate?.();
          }}
        />
      )}

      {isAuthenticated ? (
        <SidebarUserFooter
          expanded={expanded}
          name={user?.name ?? "Account"}
          initials={initials}
          subtitle={planLabel}
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
