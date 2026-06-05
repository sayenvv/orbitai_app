"use client";

import { useEffect } from "react";
import { PlansContent } from "@/components/plans/plans-content";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useTokenUsage } from "@/hooks/use-token-usage";
import { useAuthStore } from "@/store/auth-store";

export default function PlansPage() {
  const { setHeader, openLogin } = useAppShell();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { usage, loading: usageLoading } = useTokenUsage();

  useEffect(() => {
    setHeader({
      title: "Plans",
      subtitle: isAuthenticated
        ? "Scale your AI workflow with the right allowance"
        : "Compare plans and pricing",
    });
    return () => setHeader(null);
  }, [setHeader, isAuthenticated]);

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="aurora" aria-hidden />
      <div className="grid-dots pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <div className="relative px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-6xl space-y-10">
          <header className="mx-auto max-w-2xl space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              Subscription
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-gradient md:text-4xl">
              {isAuthenticated ? "Choose your plan" : "Plans & pricing"}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              {isAuthenticated
                ? "Every plan includes access to all assistants. Upgrade anytime as your usage grows — allowances reset monthly."
                : "Every plan includes access to all assistants. Sign up free to save chats and unlock your monthly allowance."}
            </p>
          </header>

          <PlansContent
            currentPlan={usage?.plan ?? "free"}
            usage={isAuthenticated ? usage : null}
            usageLoading={isAuthenticated && usageLoading}
            guestMode={!isAuthenticated}
            onSignUp={() => openLogin("register")}
          />
        </div>
      </div>
    </div>
  );
}
