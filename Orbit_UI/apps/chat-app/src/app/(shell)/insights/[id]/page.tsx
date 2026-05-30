"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { InsightDetailContent } from "@/components/insights/insights-board-content";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";

export default function InsightDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { setHeader, openLogin } = useAppShell();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const insightId = params.id;

  useEffect(() => {
    setHeader({
      title: "AI Insights",
      subtitle: "Document & analysis",
    });
    return () => setHeader(null);
  }, [setHeader]);

  useEffect(() => {
    if (!isAuthenticated) {
      openLogin("login");
      router.replace("/");
    }
  }, [isAuthenticated, openLogin, router]);

  if (!isAuthenticated || !insightId) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
      <InsightDetailContent insightId={insightId} />
    </div>
  );
}
