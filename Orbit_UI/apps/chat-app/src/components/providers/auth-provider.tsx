"use client";

import { useCurrentUser } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { LoginPopup } from "@/components/login-popup";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuthStore();
  useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {children}
      {!isAuthenticated && <LoginPopup />}
    </>
  );
}
