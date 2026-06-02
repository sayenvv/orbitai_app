"use client";

import { useEffect } from "react";
import type { CatalogApp } from "@orbit/clovai-apps";
import { AppLaunchPage } from "@/components/apps/app-launch-page";
import { useAppShell } from "@/components/layout/app-shell-context";
import { PhotoStudioLaunchShimmer } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";

type AppLaunchAuthGateProps = {
  app: CatalogApp;
};

export function AppLaunchAuthGate({ app }: AppLaunchAuthGateProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { openLogin } = useAppShell();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    openLogin("login");
  }, [isAuthenticated, isLoading, openLogin]);

  if (isLoading) {
    return <PhotoStudioLaunchShimmer />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium text-foreground">Sign in to use {app.name}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create a free account or sign in to open this app and save your work.
        </p>
        <button
          type="button"
          onClick={() => openLogin("login")}
          className="mt-1 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in
        </button>
      </div>
    );
  }

  return <AppLaunchPage app={app} />;
}
