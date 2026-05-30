"use client";

import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { PlansContent } from "@/components/plans/plans-content";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useTokenUsage } from "@/hooks/use-token-usage";
import { useAuthStore } from "@/store/auth-store";

export default function PlansPage() {
  const { setHeader, openLogin } = useAppShell();
  const { isAuthenticated } = useAuthStore();
  const { usage, loading: usageLoading } = useTokenUsage();

  useEffect(() => {
    setHeader({
      title: "Plans",
      subtitle: "Scale your AI workflow with the right allowance",
    });
    return () => setHeader(null);
  }, [setHeader]);

  if (!isAuthenticated) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
        <div className="aurora" aria-hidden />
        <div className="relative w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-mac ring-1 ring-primary/15">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">Sign in to view plans</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Compare allowances and choose the plan that fits how you work with Orbit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openLogin("login")}
            className="inline-flex rounded-xl bg-gradient-to-r from-primary to-[oklch(0.58_0.20_330)] px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 press"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

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
              Choose your plan
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              Every plan includes access to all assistants. Upgrade anytime as your usage grows —
              allowances reset monthly.
            </p>
          </header>

          <PlansContent
            currentPlan={usage?.plan ?? "free"}
            usage={usage}
            usageLoading={usageLoading}
          />
        </div>
      </div>
    </div>
  );
}
