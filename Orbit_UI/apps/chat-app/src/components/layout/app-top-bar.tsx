"use client";

import { useAuthStore } from "@/store/auth-store";
import { useAppShell } from "@/components/layout/app-shell-context";

export function AppTopBar() {
  const { user, isAuthenticated } = useAuthStore();
  const { header, setProfileOpen, openLogin } = useAppShell();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
  const displayName = user?.name || "User";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 pl-4 lg:pl-6">
        {header?.leading}
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold leading-none">
            {header?.title || "Orbit AI"}
          </h1>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {header?.subtitle || "Your AI assistants"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {header?.actions}
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/80"
            title="Profile"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <span className="text-[10px] font-bold text-primary">{initials}</span>
            </div>
            <span className="hidden max-w-[8rem] truncate sm:inline">{displayName}</span>
          </button>
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
