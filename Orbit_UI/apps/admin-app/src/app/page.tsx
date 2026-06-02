"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminLoginPage } from "@/components/admin-login-page";
import { useAdminSession } from "@/hooks/use-session";
import { useSessionStore } from "@/store/session-store";
import { sanitizeInternalRedirect } from "@orbit/security";

function AdminHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useSessionStore();
  useAdminSession();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const next = sanitizeInternalRedirect(searchParams.get("next"), "/dashboard");
    router.replace(next);
  }, [isAuthenticated, isLoading, router, searchParams]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <AdminLoginPage />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <AdminHomeContent />
    </Suspense>
  );
}
