"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogIn, Menu, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { AppSidebar } from "@/components/home/app-sidebar";
import {
  MainAgentsPanel,
  MainLibraryPanel,
  type SidebarSection,
} from "@/components/home/app-sidebar-panels";
import { LoginModal } from "@/components/login-modal";
import { ProfilePanel } from "@/components/profile-panel";
import { SupportModal } from "@/components/home/support-modal";
import { AppShellProvider, useAppShell } from "@/components/layout/app-shell-context";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { MobileAppDrawer } from "@/components/layout/mobile-app-drawer";
import { useAgents } from "@/hooks/use-agents";
import { useGeneratedMaterials } from "@/hooks/use-generated-materials";
import { useLogout } from "@/hooks/use-auth";
import { routeForAgent } from "@/lib/home-data";
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
  const { materials, loading: materialsLoading } = useGeneratedMaterials();

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
    }
  };

  useEffect(() => {
    if (pathname !== "/") {
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
      <header className="safe-top safe-x flex shrink-0 items-center justify-between border-b border-border/50 bg-background px-4 pb-3 pt-2 md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card/90 text-foreground transition-colors hover:bg-muted"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/25">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-none">
              {header?.title || "Orbit AI"}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {header?.subtitle || "Your AI assistants"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20"
              aria-label="Profile"
            >
              <span className="text-[10px] font-bold text-primary">{initials}</span>
            </button>
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
              className={`absolute top-4 z-40 flex h-14 w-6 items-center justify-center rounded-r-md border border-l-0 border-sidebar-border bg-sidebar text-sidebar-foreground transition-[left,color,background-color] duration-300 ease-out hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${sidebarWidthClass}`}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" strokeWidth={2.25} />
              ) : (
                <PanelLeftOpen className="h-5 w-5" strokeWidth={2.25} />
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
                        materials={materials}
                        loading={materialsLoading}
                        onSelect={(material) => router.push(routeForAgent(material.agentSlug))}
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
        <LoginModal
          open={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
          defaultMode={authMode}
        />
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
