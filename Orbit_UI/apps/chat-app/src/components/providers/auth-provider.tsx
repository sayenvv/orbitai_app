"use client";

import { useCurrentUser } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuthStore();
  useCurrentUser();

  if (isLoading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
