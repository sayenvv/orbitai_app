"use client";

import { BrandMark, BRAND_NAME } from "@orbit/ui";
import { LogIn } from "lucide-react";

import {
  SidebarRecentsList,
  SidebarSectionNav,
} from "@/components/home/app-sidebar-panels";
import { SettingsHelpFooterTab } from "@/components/home/support-modal";
import { CollapsibleRail } from "@/components/layout/collapsible-rail";
import { TokenUsageMeter } from "@/components/token-usage-meter";
import { useNavRail } from "@/hooks/use-nav-rail";
import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";
import { useSidebarChats } from "@/hooks/use-sidebar-chats";
import { useTokenUsage } from "@/hooks/use-token-usage";
import { cn } from "@/lib/utils";

type ChatNavRailProps = {
  className?: string;
};

export function ChatNavRail({ className }: ChatNavRailProps) {
  const { open, hydrated, toggle } = useNavRail();
  const {
    section,
    isAuthenticated,
    activeChatId,
    handleSectionChange,
    handleNewChat,
    goHome,
    openChat,
    openSupport,
    openLogin,
  } = useSidebarNavigation();
  const { usage, loading: usageLoading } = useTokenUsage();
  const { conversations, loading: chatsLoading, loadingMore, hasMore, loadMore, removeConversation } =
    useSidebarChats();

  return (
    <CollapsibleRail
      side="left"
      open={open}
      hydrated={hydrated}
      onToggle={toggle}
      ariaLabel="Navigation"
      className={cn("hidden lg:flex", className)}
      header={
        <button
          type="button"
          onClick={goHome}
          className="rounded-lg transition-transform hover:-translate-y-0.5"
          aria-label={`${BRAND_NAME} home`}
        >
          <BrandMark size="sm" />
        </button>
      }
      expandedBody={
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-2 pb-3">
          <SidebarSectionNav
            expanded
            section={section}
            onSectionChange={handleSectionChange}
            onNewChat={handleNewChat}
            isAuthenticated={isAuthenticated}
          />

          {isAuthenticated ? (
            <div className="flex min-h-0 flex-1 flex-col border-t border-border/40 pt-3">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recents
              </p>
              <SidebarRecentsList
                conversations={conversations}
                loading={chatsLoading}
                loadingMore={loadingMore}
                hasMore={hasMore}
                onLoadMore={() => void loadMore()}
                activeId={activeChatId}
                onSelect={openChat}
                onDelete={(id) => void removeConversation(id)}
              />
            </div>
          ) : (
            <div className="border-t border-border/40 pt-3">
              <button
                type="button"
                onClick={() => openLogin("login")}
                className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-3 text-left text-sm font-medium transition-colors hover:border-primary/30 hover:bg-card"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LogIn className="h-4 w-4" />
                </span>
                <span>
                  <span className="block">Sign in / Join</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    Save chats and library items
                  </span>
                </span>
              </button>
            </div>
          )}

          <div className="mt-auto space-y-2 border-t border-border/40 pt-3">
            {isAuthenticated && (
              <div className="rounded-lg bg-card/80 px-2 py-2">
                <TokenUsageMeter usage={usage} loading={usageLoading} compact />
              </div>
            )}
            <SettingsHelpFooterTab showTopBorder={false} onOpen={() => openSupport("settings")} />
          </div>
        </div>
      }
      collapsedBody={
        <>
          <button
            type="button"
            onClick={goHome}
            className="mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted/50"
            aria-label={`${BRAND_NAME} home`}
          >
            <BrandMark size="sm" showText={false} />
          </button>

          <div className="my-3 flex min-h-0 w-full flex-1 flex-col items-center">
            <SidebarSectionNav
              expanded={false}
              section={section}
              onSectionChange={handleSectionChange}
              onNewChat={handleNewChat}
              isAuthenticated={isAuthenticated}
              compactRail
            />
          </div>

          <SettingsHelpFooterTab
            collapsed
            compactRail
            showTopBorder={false}
            onOpen={() => openSupport("settings")}
          />
        </>
      }
    />
  );
}
