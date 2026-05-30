"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Check,
  Crown,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";
import { TokenUsageMeter } from "@/components/token-usage-meter";
import { UpgradeCtaAnchor } from "@/components/plans/upgrade-cta";
import { formatTokenCount } from "@/lib/format-tokens";
import { publicApi, type ApiPlanLimit, type ApiTokenUsage } from "@/lib/orbit-api";
import { cn } from "@/lib/utils";

export const PLAN_ORDER = ["free", "starter", "pro", "enterprise"] as const;

const PLAN_ICONS: Record<string, typeof Sparkles> = {
  free: Sparkles,
  starter: Rocket,
  pro: Crown,
  enterprise: Building2,
};

export function formatPlanLimit(limit: number | null): string {
  if (limit == null) return "Unlimited";
  return formatTokenCount(limit);
}

export function upgradeMailto(plan: string, label?: string): string {
  const display = label ?? `${plan.charAt(0).toUpperCase()}${plan.slice(1)}`;
  const subject = encodeURIComponent(`Upgrade to ${display}`);
  const body = encodeURIComponent("Hi Orbit team,\n\nI'd like to upgrade my plan.\n\nThanks!");
  return `mailto:support@orbitai.app?subject=${subject}&body=${body}`;
}

type PlansContentProps = {
  currentPlan?: string;
  usage?: ApiTokenUsage | null;
  usageLoading?: boolean;
  className?: string;
};

function PlanCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-mac">
      <div className="space-y-4">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-muted/70" />
        <div className="h-5 w-24 animate-pulse rounded-md bg-muted/70" />
        <div className="h-8 w-32 animate-pulse rounded-md bg-muted/70" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-muted/60" style={{ width: `${70 + i * 8}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlansContent({
  currentPlan = "free",
  usage = null,
  usageLoading = false,
  className,
}: PlansContentProps) {
  const [plans, setPlans] = useState<ApiPlanLimit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    publicApi
      .plans()
      .then((data) => {
        const sorted = [...data.data].sort(
          (a, b) =>
            PLAN_ORDER.indexOf(a.plan as (typeof PLAN_ORDER)[number]) -
            PLAN_ORDER.indexOf(b.plan as (typeof PLAN_ORDER)[number]),
        );
        setPlans(sorted);
      })
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  const normalizedCurrent = currentPlan.toLowerCase();
  const currentIndex = PLAN_ORDER.indexOf(normalizedCurrent as (typeof PLAN_ORDER)[number]);
  const currentPlanMeta = plans.find((plan) => plan.plan === normalizedCurrent);

  if (loading) {
    return (
      <div className={cn("space-y-8", className)}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLAN_ORDER.map((plan) => (
            <PlanCardSkeleton key={plan} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-10", className)}>
      {usage?.tokens_limit != null && (
        <div className="glass shadow-mac rounded-2xl border border-border/60 p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Current allowance
              </p>
              <p className="text-sm font-semibold text-foreground">
                {currentPlanMeta?.label ??
                  `${normalizedCurrent.charAt(0).toUpperCase()}${normalizedCurrent.slice(1)}`}{" "}
                plan
              </p>
            </div>
            <div className="min-w-0 flex-1 sm:max-w-md">
              <TokenUsageMeter usage={usage} loading={usageLoading} compact showUpgradeButton={false} />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 overflow-visible sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const planIndex = PLAN_ORDER.indexOf(plan.plan as (typeof PLAN_ORDER)[number]);
          const isCurrent = plan.plan === normalizedCurrent;
          const isUpgrade = currentIndex >= 0 && planIndex > currentIndex;
          const features =
            plan.features.length > 0
              ? plan.features
              : ["Monthly token allowance", "All core assistants"];
          const Icon = PLAN_ICONS[plan.plan] ?? Sparkles;
          const isHighlighted = plan.highlight && !isCurrent;

          return (
            <div
              key={plan.plan}
              className={cn("relative", isHighlighted && "pt-4")}
            >
              {isHighlighted && (
                <div className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 shadow-mac ring-1 ring-amber-500/20 dark:text-amber-300">
                    Most popular
                  </span>
                </div>
              )}

              <div
              className={cn(
                "gradient-border hover-lift relative flex flex-col rounded-2xl border bg-card/80 p-6 shadow-mac backdrop-blur-sm transition-all",
                isCurrent && "border-primary/40 ring-2 ring-primary/15",
                isHighlighted && "border-primary/30 shadow-mac-lg",
                !isCurrent && !isHighlighted && "border-border/60",
              )}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm",
                    isHighlighted
                      ? "bg-gradient-to-br from-primary to-[oklch(0.58_0.20_330)] text-primary-foreground shadow-primary/25"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {isCurrent && (
                  <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                    Current
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight">{plan.label}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {plan.tagline || "Flexible monthly allowance"}
                </p>
              </div>

              <div className="mt-5 border-t border-border/50 pt-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight tabular-nums">
                    {formatPlanLimit(plan.token_limit)}
                  </span>
                  {plan.token_limit != null && (
                    <span className="text-xs font-medium text-muted-foreground">tokens / mo</span>
                  )}
                </div>
                {plan.token_limit == null && (
                  <p className="mt-0.5 text-xs text-muted-foreground">No monthly cap</p>
                )}
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isUpgrade && (
                  <UpgradeCtaAnchor
                    href={upgradeMailto(plan.plan, plan.label)}
                    label="Upgrade"
                    fullWidth
                    className="w-full py-2.5 text-sm"
                  />
                )}
                {isCurrent && (
                  <div className="flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 py-2.5 text-xs font-medium text-muted-foreground">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    Active plan
                  </div>
                )}
                {!isCurrent && !isUpgrade && (
                  <div className="py-2.5 text-center text-[11px] text-muted-foreground/80">
                    Included in your plan
                  </div>
                )}
              </div>
            </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/50 bg-muted/20 px-6 py-8 text-center">
        <p className="text-sm font-medium text-foreground">Need a custom arrangement?</p>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
          Enterprise plans include dedicated support, custom SLAs, and volume pricing for teams.
        </p>
        <a
          href="mailto:support@orbitai.app?subject=Enterprise%20inquiry"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Contact sales
        </a>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Questions about billing?{" "}
        <a href="mailto:support@orbitai.app" className="font-medium text-primary hover:underline">
          support@orbitai.app
        </a>
      </p>
    </div>
  );
}
