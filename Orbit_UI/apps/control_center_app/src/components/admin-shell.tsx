"use client";

import { useCurrentUser } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { AdminSidebar } from "@/components/admin-sidebar";
import { LoginPage } from "@/components/login-page";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  useCurrentUser();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <>
      <AdminSidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </>
  );
}
