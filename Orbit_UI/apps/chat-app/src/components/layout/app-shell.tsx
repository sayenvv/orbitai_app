"use client";

import { Suspense, useEffect, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import { PdfPageLimitDialogHost } from "@/components/rag/pdf-page-limit-dialog";
import { NavbarUpgradeLink } from "@/components/plans/upgrade-cta";
import {
  MainLibraryPanel,
} from "@/components/home/app-sidebar-panels";
import { LoginModal } from "@/components/login-modal";
import { AuthPromptModal } from "@/components/auth-prompt-modal";
import { InvalidChatModal } from "@/components/chat/invalid-chat-modal";
import { ProfilePanel } from "@/components/profile-panel";
import { SupportModal } from "@/components/home/support-modal";
import { AppShellProvider, useAppShell } from "@/components/layout/app-shell-context";
import { WorkspaceTopBar } from "@/components/layout/workspace-top-bar";
import { ChatHistoryRail } from "@/components/chat/chat-history-rail";
import { NavbarBrand } from "@/components/layout/navbar-brand";
import { MobileAppDrawer } from "@/components/layout/mobile-app-drawer";
import { useChatSideRail } from "@/hooks/use-chat-side-rail";
import { useLibrary } from "@/hooks/use-library";
import { useLogout } from "@/hooks/use-auth";
import {
  navigateToAgentChat,
  navigateToChatLaunch,
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
import { routes } from "@/lib/routes";

function ShellSectionSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setSection } = useAppShell();

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "library" || section === "apps") {
      setSection(section);
    }
  }, [pathname, searchParams, setSection]);

  return null;
}

function AppShellLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const handleLogout = useLogout();
  const invalidChatNoticeOpen = useChatSessionStore((s) => s.invalidChatNoticeOpen);
  const dismissInvalidChatNotice = useChatSessionStore((s) => s.dismissInvalidChatNotice);
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

  useEffect(() => {
    if (pathname === routes.plans) {
      setSection("plans");
    } else if (pathname.startsWith("/apps")) {
      setSection("apps");
    } else if (pathname !== routes.home) {
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

  const showSectionPanel = pathname === routes.home && section === "library";

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
      <header className="safe-top safe-x relative z-10 flex shrink-0 items-center justify-between gap-2 bg-background/80 px-4 pb-3 pt-2 backdrop-blur-sm md:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          {header?.title ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-none">{header.title}</p>
              {header.subtitle && (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{header.subtitle}</p>
              )}
            </div>
          ) : (
            <NavbarBrand showText />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {header?.actions}
          {isAuthenticated ? (
            <NavbarUpgradeLink />
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openLogin("login")}
                className="inline-flex h-9 items-center rounded-full border border-border px-3.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openLogin("register")}
                className="inline-flex h-9 items-center rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Sign Up
              </button>
            </div>
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
        <div className="relative z-30 hidden h-full min-h-0 overflow-visible md:block">
          <ChatHistoryRail />
        </div>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="hidden shrink-0 md:block">
            <WorkspaceTopBar />
          </div>

          <div className="home-warm-canvas relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden">
              {showSectionPanel ? (
                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 md:px-6 md:py-8">
                  <MainLibraryPanel
                      uploads={uploads}
                      generated={generated}
                      loading={libraryLoading}
                      isAuthenticated={isAuthenticated}
                      onRefresh={refreshLibrary}
                      onRequireAuth={() => openLogin("login")}
                      onSelectUpload={(upload) => {
                        navigateToChatLaunch(router, {
                          source: {
                            id: upload.id,
                            name: upload.title,
                            type: "uploaded-file",
                            createdAt: new Date(),
                          },
                        });
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
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
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
