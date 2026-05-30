"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogIn, Menu, PanelLeft, PanelRight } from "lucide-react";
import { PdfPageLimitDialogHost } from "@/components/rag/pdf-page-limit-dialog";
import { NavbarUpgradeLink } from "@/components/plans/upgrade-cta";
import { AppSidebar } from "@/components/home/app-sidebar";
import {
  MainAgentsPanel,
  MainLibraryPanel,
  type SidebarSection,
} from "@/components/home/app-sidebar-panels";
import { LoginModal } from "@/components/login-modal";
import { AuthPromptModal } from "@/components/auth-prompt-modal";
import { ProfilePanel } from "@/components/profile-panel";
import { SupportModal } from "@/components/home/support-modal";
import { AppShellProvider, useAppShell } from "@/components/layout/app-shell-context";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { MobileAppDrawer } from "@/components/layout/mobile-app-drawer";
import { useAgents } from "@/hooks/use-agents";
import { useLibrary } from "@/hooks/use-library";
import { useLogout } from "@/hooks/use-auth";
import { routeForAgent } from "@/lib/home-data";
import { publicApi } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";

function ShellSectionSync() {
  const searchParams = useSearchParams();
  const { setSection } = useAppShell();

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "library" || section === "agents") {
      setSection(section);
    }
  }, [searchParams, setSection]);

  return null;
}

function AppShellLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const handleLogout = useLogout();
  const { agents, loading: agentsLoading } = useAgents();
  const { uploads, generated, loading: libraryLoading, refresh: refreshLibrary } = useLibrary();

  const {
    sidebarOpen,
    setSidebarOpen,
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

  const sidebarWidthClass = sidebarOpen ? "left-[16rem]" : "left-[5rem]";

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
    if (next === "home") {
      setSidebarOpen(true);
      useChatStore.getState().setActiveConversation(null);
      if (pathname !== "/") {
        router.push("/");
      } else if (searchParams.get("section")) {
        router.replace("/");
      }
    } else if (next === "library") {
      if (pathname !== "/" || searchParams.get("section") !== "library") {
        router.push("/?section=library");
      }
    } else if (next === "agents") {
      if (pathname !== "/" || searchParams.get("section") !== "agents") {
        router.push("/?section=agents");
      }
    } else if (next === "plans") {
      if (pathname !== "/plans") {
        router.push("/plans");
      }
    }
  };

  useEffect(() => {
    if (pathname === "/plans") {
      setSection("plans");
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

  const storeActiveConversationId = useChatStore((s) => s.activeConversationId);
  const sidebarActiveConversationId =
    searchParams.get("conversation") ?? storeActiveConversationId;

  const showSectionPanel =
    pathname === "/" && (section === "library" || section === "agents");

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

      <main className="app-shell relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* Desktop sidebar */}
          <div className="relative hidden shrink-0 lg:flex">
            <AppSidebar
              expanded={sidebarOpen}
              section={section}
              onSectionChange={handleSectionChange}
              activeConversationId={sidebarActiveConversationId}
              onOpenSettings={() => openSupport("settings")}
            />
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`absolute top-0 z-40 flex h-14 min-w-8 items-center justify-center rounded-r-md bg-sidebar px-2 py-2 text-muted-foreground shadow-mac transition-[left,color,background-color,box-shadow] duration-300 ease-out hover:bg-sidebar-accent/60 hover:text-primary ${sidebarWidthClass}`}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeft className="h-5 w-5" strokeWidth={2.25} />
              ) : (
                <PanelRight className="h-5 w-5" strokeWidth={2.25} />
              )}
            </button>
          </div>

          {/* Main column */}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="hidden md:block">
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
                            router.push(`/c?conversation=${encodeURIComponent(file.conversationId)}`);
                            return;
                          }
                          router.push(routeForAgent(file.agentSlug));
                        }}
                        onGenerateInsights={
                          isAuthenticated
                            ? async (upload) => {
                                await publicApi.generateUploadInsights(upload.id);
                              }
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
                        onSelect={(agentId) => router.push(routeForAgent(agentId))}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
                )}
              </div>
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
