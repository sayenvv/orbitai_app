"use client";

import { usePathname, useRouter } from "next/navigation";
import { catalogAppIds, getAppWorkspaceHref } from "@orbit/clovai-apps";

import { AuthNavTabs } from "@/components/layout/auth-nav-tabs";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";
import { isStudioPath, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type WorkspaceTab = "chats" | "canvas" | "projects" | "studio" | "code";

const CANVAS_HREF = getAppWorkspaceHref(catalogAppIds.photoGenerator);
const PROJECTS_HREF = getAppWorkspaceHref(catalogAppIds.projectPlanning);

const TABS: Array<{ id: WorkspaceTab; label: string; href?: string }> = [
  { id: "chats", label: "Chats", href: routes.home },
  { id: "canvas", label: "Canvas", href: CANVAS_HREF },
  { id: "projects", label: "Projects", href: PROJECTS_HREF },
  { id: "studio", label: "Studio", href: routes.studio },
  { id: "code", label: "Clovops", href: routes.code },
];

function resolveActiveTab(pathname: string): WorkspaceTab {
  if (pathname === routes.code || pathname.startsWith(`${routes.code}/`)) return "code";
  if (isStudioPath(pathname)) return "studio";
  if (pathname.startsWith(`/apps/${catalogAppIds.photoGenerator}`)) return "canvas";
  if (pathname.startsWith(`/apps/${catalogAppIds.projectPlanning}`)) return "projects";
  return "chats";
}

/**
 * Warm, minimal top bar shared by Home + Chat: centered section tabs with the
 * active conversation title (or auth actions) on the right.
 */
export function WorkspaceTopBar() {
  const { header, openLogin } = useAppShell();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = resolveActiveTab(pathname);

  return (
    <header className="workspace-top-bar relative flex h-14 shrink-0 items-center justify-between gap-3 px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {header?.leading}
        {header?.nav}
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="workspace-tab-surface pointer-events-auto inline-flex items-center rounded-full p-0.5"
          role="tablist"
          aria-label="Workspace sections"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (tab.href) router.push(tab.href);
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[13px] font-medium transition-all",
                  active && "workspace-tab-active",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {header?.actions}
        {header?.title ? (
          <span className="max-w-[16rem] truncate text-sm font-medium text-foreground/80">
            {header.title}
          </span>
        ) : !isAuthenticated ? (
          <AuthNavTabs
            onSignIn={() => openLogin("login")}
            onSignUp={() => openLogin("register")}
          />
        ) : null}
      </div>
    </header>
  );
}
