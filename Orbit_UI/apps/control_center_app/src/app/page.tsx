"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginPage } from "@/components/login-page";
import { useCurrentUser } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { sanitizeInternalRedirect } from "@orbit/security";

function ControlHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuthStore();
  useCurrentUser();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const next = sanitizeInternalRedirect(searchParams.get("next"), "/agents");
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

  return <LoginPage />;
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
      <ControlHomeContent />
    </Suspense>
  );
}
