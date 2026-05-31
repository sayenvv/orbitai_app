"use client";

import { Suspense, useEffect, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogIn, Menu } from "lucide-react";
import { PdfPageLimitDialogHost } from "@/components/rag/pdf-page-limit-dialog";
import { NavbarUpgradeLink } from "@/components/plans/upgrade-cta";
import {
  MainAgentsPanel,
  MainLibraryPanel,
} from "@/components/home/app-sidebar-panels";
import { LoginModal } from "@/components/login-modal";
import { AuthPromptModal } from "@/components/auth-prompt-modal";
import { InvalidChatModal } from "@/components/chat/invalid-chat-modal";
import { ProfilePanel } from "@/components/profile-panel";
import { SupportModal } from "@/components/home/support-modal";
import { AppShellProvider, useAppShell } from "@/components/layout/app-shell-context";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { ChatHistoryRail } from "@/components/chat/chat-history-rail";
import { NavbarBrand } from "@/components/layout/navbar-brand";
import { MobileAppDrawer } from "@/components/layout/mobile-app-drawer";
import { useChatSideRail } from "@/hooks/use-chat-side-rail";
import { useAgents } from "@/hooks/use-agents";
import { useLibrary } from "@/hooks/use-library";
import { useLogout } from "@/hooks/use-auth";
import {
  navigateToAgentChat,
  navigateToConversation,
} from "@/lib/chat-navigation";
import { publicApi } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";
import { useChatSessionStore } from "@/store/chat-session-store";
import { useChatStore } from "@/store/chat-store";
import {
  COLLAPSIBLE_RAIL_COLLAPSED_WIDTH_PX,
  COLLAPSIBLE_RAIL_EXPANDED_WIDTH_PX,
} from "@/components/layout/collapsible-rail";

function ShellSectionSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setSection } = useAppShell();

  useEffect(() => {
    if (pathname.startsWith("/insights")) {
      setSection("insights");
      return;
    }
    const section = searchParams.get("section");
    if (section === "library" || section === "agents") {
      setSection(section);
    }
  }, [pathname, searchParams, setSection]);

  return null;
}

function AppShellLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const handleLogout = useLogout();
  const invalidChatNoticeOpen = useChatSessionStore((s) => s.invalidChatNoticeOpen);
  const dismissInvalidChatNotice = useChatSessionStore((s) => s.dismissInvalidChatNotice);
  const { agents, loading: agentsLoading } = useAgents();
  const { uploads, generated, loading: libraryLoading, refresh: refreshLibrary } = useLibrary();

  const {
    setMobileDrawerOpen,
    section,
    setSection,
    profileOpen,
    setProfileOpen,
    loginModalOpen,
    setLoginModalOpen,
    authMode,
    supportOpen,
    supportTab,
    openSupport,
    closeSupport,
    setSupportTab,
    openLogin,
    openAuthPrompt,
    closeAuthPrompt,
    authPromptOpen,
    header,
  } = useAppShell();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";


  useEffect(() => {
    if (pathname === "/plans") {
      setSection("plans");
    } else if (pathname.startsWith("/insights")) {
      setSection("insights");
    } else if (pathname !== "/") {
      setSection("home");
    }
  }, [pathname, setSection]);

  useEffect(() => {
    if (isAuthenticated) {
      void useChatStore.getState().refreshConversationsList();
      return;
    }
    useChatStore.getState().clearConversations();
    useChatStore.setState({ conversationsHydrated: true });
  }, [isAuthenticated]);

  const showSectionPanel =
    pathname === "/" && (section === "library" || section === "agents");

  const { open: sidebarOpen, hydrated: sidebarHydrated } = useChatSideRail("left");
  const sidebarWidth =
    !sidebarHydrated || sidebarOpen
      ? COLLAPSIBLE_RAIL_EXPANDED_WIDTH_PX
      : COLLAPSIBLE_RAIL_COLLAPSED_WIDTH_PX;

  return (
    <>
      <Suspense fallback={null}>
        <ShellSectionSync />
      </Suspense>

      {/* Mobile header */}
      <header className="safe-top safe-x flex shrink-0 items-center justify-between bg-background px-4 pb-3 pt-2 md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card/90 text-foreground transition-colors hover:bg-muted"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <NavbarBrand showText={!header?.title} />
          {header?.title && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-none">{header.title}</p>
              {header.subtitle && (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{header.subtitle}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAuthenticated ? (
            <>
              <NavbarUpgradeLink className="hidden sm:inline-flex" />
              <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20"
              aria-label="Profile"
            >
              <span className="text-[10px] font-bold text-primary">{initials}</span>
            </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => openLogin("login")}
              className="flex h-9 items-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              <LogIn className="h-3.5 w-3.5" />
              Join
            </button>
          )}
        </div>
      </header>

      <MobileAppDrawer />

      <main
        className="app-shell app-shell-grid relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:grid"
        data-sidebar={sidebarHydrated ? (sidebarOpen ? "expanded" : "collapsed") : undefined}
        style={
          {
            "--sidebar-width": sidebarWidth,
          } as CSSProperties
        }
      >
        <div className="hidden h-full min-h-0 overflow-hidden md:block">
          <ChatHistoryRail />
        </div>

        <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="hidden shrink-0 md:block">
            <AppTopBar />
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
              <div className="aurora" />
            </div>

            <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden">
              {showSectionPanel ? (
                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 md:px-6 md:py-8">
                  {section === "library" ? (
                    <MainLibraryPanel
                      uploads={uploads}
                      generated={generated}
                      loading={libraryLoading}
                      isAuthenticated={isAuthenticated}
                      onRefresh={refreshLibrary}
                      onRequireAuth={() => openLogin("login")}
                      onSelectUpload={(upload) => {
                        const params = new URLSearchParams({
                          sourceId: upload.id,
                          sourceName: upload.title,
                          sourceType: "uploaded-file",
                        });
                        router.push(`/c?${params.toString()}`);
                      }}
                      onSelectGenerated={(file) => {
                        if (file.conversationId) {
                          navigateToConversation(router, file.conversationId);
                          return;
                        }
                        navigateToAgentChat(router, file.agentSlug);
                      }}
                      onGenerateInsights={
                        isAuthenticated
                          ? (upload) => publicApi.generateUploadInsights(upload.id)
                          : undefined
                      }
                      onDownloadUpload={
                        isAuthenticated
                          ? (upload) => void publicApi.downloadUpload(upload.id, upload.title)
                          : undefined
                      }
                      onDeleteUpload={
                        isAuthenticated
                          ? async (upload) => {
                              await publicApi.deleteFile(upload.id);
                              await refreshLibrary();
                            }
                          : undefined
                      }
                      onDownloadGenerated={
                        isAuthenticated
                          ? (file) => void publicApi.downloadGenerated(file.id, file.title)
                          : undefined
                      }
                      onDeleteGenerated={
                        isAuthenticated
                          ? async (file) => {
                              await publicApi.deleteGenerated(file.id);
                              await refreshLibrary();
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <MainAgentsPanel
                      agents={agents}
                      loading={agentsLoading}
                      onSelect={(agentId) => navigateToAgentChat(router, agentId)}
                    />
                  )}
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {!isAuthenticated && (
        <>
          <AuthPromptModal
            open={authPromptOpen}
            onClose={closeAuthPrompt}
            onSignIn={() => openLogin("login")}
          />
          <LoginModal
            open={loginModalOpen}
            onClose={() => setLoginModalOpen(false)}
            defaultMode={authMode}
          />
        </>
      )}

      <SupportModal
        open={supportOpen}
        tab={supportTab}
        onClose={closeSupport}
        onTabChange={setSupportTab}
        isAuthenticated={isAuthenticated}
        onSignOut={handleLogout}
      />

      {isAuthenticated && (
        <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
      )}

      <PdfPageLimitDialogHost />

      <InvalidChatModal open={invalidChatNoticeOpen} onClose={dismissInvalidChatNotice} />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppShellProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <AppShellLayout>{children}</AppShellLayout>
      </div>
    </AppShellProvider>
  );
}
