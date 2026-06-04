"use client";

import { usePathname, useRouter } from "next/navigation";
import { catalogAppIds, getAppWorkspaceHref } from "@orbit/clovai-apps";

import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type WorkspaceTab = "chats" | "canvas" | "projects" | "code";

const CANVAS_HREF = getAppWorkspaceHref(catalogAppIds.photoGenerator);
const PROJECTS_HREF = getAppWorkspaceHref(catalogAppIds.projectPlanning);

const TABS: Array<{ id: WorkspaceTab; label: string; href?: string }> = [
  { id: "chats", label: "Chats", href: routes.home },
  { id: "canvas", label: "Canvas", href: CANVAS_HREF },
  { id: "projects", label: "Projects", href: PROJECTS_HREF },
  { id: "code", label: "Code" },
];

function resolveActiveTab(pathname: string): WorkspaceTab {
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
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = resolveActiveTab(pathname);

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between gap-3 px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">{header?.leading}</div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="pointer-events-auto inline-flex items-center rounded-full border border-black/[0.05] bg-white/60 p-0.5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/[0.08] dark:bg-white/[0.06]"
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
                  active
                    ? "bg-white text-foreground shadow-[0_1px_4px_rgba(15,23,42,0.08)] dark:bg-white/[0.14]"
                    : "text-muted-foreground/70 hover:text-foreground",
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openLogin("login")}
              className="inline-flex items-center rounded-full border border-black/[0.08] px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/[0.04] dark:border-white/[0.12] dark:hover:bg-white/[0.06]"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => openLogin("register")}
              className="inline-flex items-center rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Sign Up
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
