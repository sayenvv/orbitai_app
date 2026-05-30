"use client";

import { useAdminSession } from "@/hooks/use-session";
import { useSessionStore } from "@/store/session-store";
import { AdminLoginPage } from "@/components/admin-login-page";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSessionStore();
  useAdminSession();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginPage />;
  }

  return <>{children}</>;
}
