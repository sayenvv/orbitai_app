"use client";

import { BrandMark } from "@orbit/ui";
import { useRouter } from "next/navigation";
import { LogIn, X } from "lucide-react";
import { SettingsHelpFooterTab } from "@/components/home/support-modal";
import {
  SidebarRecentsList,
  SidebarSectionNav,
} from "@/components/home/app-sidebar-panels";
import { useSidebarChats } from "@/hooks/use-sidebar-chats";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";

export function MobileAppDrawer() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const {
    mobileDrawerOpen,
    setMobileDrawerOpen,
    section,
    setSection,
    setProfileOpen,
    openLogin,
    openSupport,
  } = useAppShell();
  const {
    conversations,
    loading: chatsLoading,
    loadingMore,
    hasMore,
    loadMore,
    removeConversation,
  } = useSidebarChats();

  if (!mobileDrawerOpen) return null;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const close = () => setMobileDrawerOpen(false);

  const handleSectionChange = (next: typeof section) => {
    setSection(next);
    if (next === "library" || next === "agents" || next === "plans") close();
    if (next === "plans") {
      router.push("/plans");
    } else if (next === "library") {
      router.push("/?section=library");
    } else if (next === "agents") {
      router.push("/?section=agents");
    }
  };

  const handleNewChat = () => {
    setSection("home");
    useChatStore.getState().setActiveConversation(null);
    close();
    router.push("/");
  };

  const goHome = () => {
    setSection("home");
    close();
    router.push("/");
  };

  const openChat = (id: string) => {
    close();
    router.push(`/c?conversation=${encodeURIComponent(id)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <button
        type="button"
        aria-label="Close sidebar"
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={close}
      />
      <aside className="relative z-10 flex h-full w-80 max-w-[88vw] flex-col bg-sidebar shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
          <div>
            <BrandMark size="sm" />
            <p className="mt-0.5 text-[11px] text-muted-foreground">Navigation</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/70 text-foreground hover:bg-muted"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
          <SidebarSectionNav
            expanded
            section={section}
            onSectionChange={handleSectionChange}
            onNewChat={handleNewChat}
            isAuthenticated={isAuthenticated}
          />

          {isAuthenticated && (
            <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-border/60 pt-3">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recents
              </p>
              <SidebarRecentsList
                conversations={conversations}
                loading={chatsLoading}
                loadingMore={loadingMore}
                hasMore={hasMore}
                onLoadMore={() => void loadMore()}
                onSelect={openChat}
                onDelete={(id) => void removeConversation(id)}
              />
            </div>
          )}

          {!isAuthenticated && (
            <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
              <button
                onClick={() => {
                  close();
                  openLogin("login");
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

          {isAuthenticated && (
            <button
              onClick={() => {
                close();
                setProfileOpen(true);
              }}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/90 p-3 text-left text-sm font-medium shadow-sm transition-all hover:border-primary/30 hover:bg-card"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="text-xs font-bold">{initials}</span>
              </span>
              <span>
                <span className="block">Profile</span>
                <span className="text-[11px] text-muted-foreground">Account & security</span>
              </span>
            </button>
          )}
        </div>

        <div className="border-t border-border/60 px-2 py-2">
          <SettingsHelpFooterTab
            showTopBorder={false}
            onOpen={() => {
              close();
              openSupport("settings");
            }}
          />
        </div>
      </aside>
    </div>
  );
}
