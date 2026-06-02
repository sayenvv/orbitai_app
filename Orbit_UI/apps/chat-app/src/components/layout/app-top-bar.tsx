"use client";

import { NavbarUpgradeLink } from "@/components/plans/upgrade-cta";
import { useAuthStore } from "@/store/auth-store";
import { useAppShell } from "@/components/layout/app-shell-context";

export function AppTopBar() {
  const { isAuthenticated } = useAuthStore();
  const { header, openLogin } = useAppShell();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {header?.leading}
        {header?.title && (
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-none">{header.title}</h1>
            {header.subtitle && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{header.subtitle}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {header?.actions}
        {isAuthenticated ? (
          <NavbarUpgradeLink />
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openLogin("login")}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => openLogin("register")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
