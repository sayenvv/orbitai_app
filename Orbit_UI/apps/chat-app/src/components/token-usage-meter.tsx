"use client";

import { cn } from "@/lib/utils";
import { formatTokenCount, formatTokenUsage } from "@/lib/format-tokens";
import type { ApiTokenUsage } from "@/lib/orbit-api";
import { useOptionalAppShell } from "@/components/layout/app-shell-context";
import { UpgradeCtaButton } from "@/components/plans/upgrade-cta";

type TokenUsageMeterProps = {
  usage: ApiTokenUsage | null;
  loading?: boolean;
  compact?: boolean;
  className?: string;
  onUpgrade?: () => void;
  showUpgradeButton?: boolean;
};

function meterTone(percent: number, limitReached: boolean) {
  if (limitReached) return "bg-destructive";
  if (percent >= 90) return "bg-amber-500";
  if (percent >= 75) return "bg-orange-400";
  return "bg-primary";
}

export function UpgradePlanButton({
  onClick,
  fullWidth = false,
}: {
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return <UpgradeCtaButton onClick={onClick} fullWidth={fullWidth} />;
}

export function TokenUsageMeter({
  usage,
  loading = false,
  compact = false,
  className,
  onUpgrade,
  showUpgradeButton = true,
}: TokenUsageMeterProps) {
  const shell = useOptionalAppShell();
  const handleUpgrade = onUpgrade ?? shell?.openUpgrade;

  if (loading && !usage) {
    return (
      <div className={cn("animate-pulse rounded-lg bg-muted/60", compact ? "h-10" : "h-16", className)} />
    );
  }

  if (!usage || usage.tokens_limit == null) {
    return null;
  }

  const percent = usage.limit_reached ? 100 : Math.min(100, usage.usage_percent);
  const resetLabel = usage.period_end
    ? new Date(usage.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const showUpgrade = showUpgradeButton && usage.limit_reached && handleUpgrade;

  if (compact && usage.limit_reached) {
    return (
      <div
        className={cn(
          "rounded-xl border border-destructive/15 bg-sidebar-accent/40 px-3 py-3",
          className,
        )}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">Limit reached</p>
            <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              100%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
            <div className="h-full w-full rounded-full bg-destructive transition-all duration-500" />
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Your monthly token allowance is used up.
          </p>
        </div>
        {showUpgrade && handleUpgrade && (
          <div className="mt-3">
            <UpgradePlanButton onClick={handleUpgrade} fullWidth />
          </div>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("space-y-2 px-0.5", className)}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-foreground">
            {formatTokenUsage(usage.tokens_used, usage.tokens_limit, usage.limit_reached)}
          </p>
          <span className="text-[10px] tabular-nums text-muted-foreground">{`${Math.round(percent)}%`}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
          <div
            className={cn("h-full rounded-full transition-all duration-500", meterTone(percent, false))}
            style={{ width: `${percent}%` }}
          />
        </div>
        {resetLabel && (
          <p className="text-[10px] text-muted-foreground">
            {`${formatTokenCount(usage.tokens_remaining ?? 0)} left · resets ${resetLabel}`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">
          {formatTokenUsage(usage.tokens_used, usage.tokens_limit, usage.limit_reached)}
        </p>
        {!usage.limit_reached && (
          <span className="text-[10px] tabular-nums text-muted-foreground">{`${Math.round(percent)}%`}</span>
        )}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", meterTone(percent, usage.limit_reached))}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {usage.limit_reached
            ? "Upgrade your plan to keep chatting this month."
            : resetLabel
              ? `${usage.plan.charAt(0).toUpperCase()}${usage.plan.slice(1)} plan · resets ${resetLabel}`
              : "Monthly allowance"}
          {usage.tokens_remaining != null && usage.tokens_remaining > 0 && !usage.limit_reached && (
            <> · {formatTokenCount(usage.tokens_remaining)} remaining</>
          )}
        </p>
        {showUpgrade && handleUpgrade && <UpgradePlanButton onClick={handleUpgrade} />}
      </div>
    </div>
  );
}
