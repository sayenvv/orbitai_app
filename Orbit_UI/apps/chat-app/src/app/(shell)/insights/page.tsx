"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { InsightsBoardContent } from "@/components/insights/insights-board-content";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";

export default function InsightsPage() {
  const router = useRouter();
  const { setHeader, openLogin } = useAppShell();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    setHeader({
      title: "AI Board",
      subtitle: "Insights & source documents",
    });
    return () => setHeader(null);
  }, [setHeader]);

  useEffect(() => {
    if (!isAuthenticated) {
      openLogin("login");
      router.replace("/");
    }
  }, [isAuthenticated, openLogin, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <InsightsBoardContent />
    </div>
  );
}
