import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "violet";
};

const TONES = {
  primary: "from-primary/15 to-primary/0 text-primary",
  success: "from-success/15 to-success/0 text-[color:var(--success)]",
  warning: "from-warning/15 to-warning/0 text-[color:var(--warning)]",
  violet: "from-chart-4/15 to-chart-4/0 text-chart-4",
} as const;

export function StatCard({ label, value, delta, hint, icon: Icon, tone = "primary" }: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="premium-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center ring-1 ring-border/60", TONES[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
              positive
                ? "bg-success/10 text-[color:var(--success)]"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
