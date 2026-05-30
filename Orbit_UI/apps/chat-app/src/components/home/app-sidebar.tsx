"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { SettingsHelpFooterTab } from "@/components/home/support-modal";
import {
  SidebarRecentsList,
  SidebarSectionNav,
  type SidebarSection,
} from "@/components/home/app-sidebar-panels";
import { useSidebarChats } from "@/hooks/use-sidebar-chats";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  expanded: boolean;
  section: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  activeConversationId?: string | null;
  onOpenSettings: () => void;
};

export function AppSidebar({
  expanded,
  section,
  onSectionChange,
  activeConversationId,
  onOpenSettings,
}: AppSidebarProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { conversations, loading: chatsLoading, loadingMore, hasMore, loadMore, removeConversation } =
    useSidebarChats();

  const labelClass = expanded
    ? "pointer-events-auto opacity-100 max-w-[10rem]"
    : "pointer-events-none opacity-0 max-w-0";

  const openChat = (id: string) => {
    router.push(`/c?conversation=${encodeURIComponent(id)}`);
  };

  const goHome = () => {
    onSectionChange("home");
  };

  return (
    <aside
      className={cn(
        "relative z-10 flex flex-col bg-sidebar px-2 py-4 shadow-mac transition-[width,background-color,box-shadow] duration-300 ease-out",
        expanded ? "w-64" : "w-20",
      )}
    >
      <div className="mb-4 flex items-center justify-center">
        <button
          type="button"
          onClick={goHome}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-transform hover:-translate-y-0.5"
          aria-label="Assistants home"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      </div>

      <SidebarSectionNav
        expanded={expanded}
        section={section}
        onSectionChange={onSectionChange}
        onNewChat={goHome}
        labelClassName={labelClass}
      />

      {expanded && isAuthenticated && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-sidebar-border/60 pt-3">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recents
          </p>
          <SidebarRecentsList
            conversations={conversations}
            loading={chatsLoading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={() => void loadMore()}
            activeId={activeConversationId}
            onSelect={openChat}
            onDelete={(id) => void removeConversation(id)}
          />
        </div>
      )}

      {expanded && !isAuthenticated && (
        <p className="mt-4 px-2 text-[11px] leading-relaxed text-muted-foreground">
          Sign in to see your recent chats.
        </p>
      )}

      <SettingsHelpFooterTab collapsed={!expanded} onOpen={onOpenSettings} />
    </aside>
  );
}

export { type SidebarSection };
