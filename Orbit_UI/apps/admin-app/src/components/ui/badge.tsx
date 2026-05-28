import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "violet";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border/60",
  success: "bg-success/10 text-[color:var(--success)] ring-[color:var(--success)]/20",
  warning: "bg-warning/10 text-[color:var(--warning)] ring-[color:var(--warning)]/20",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
  info: "bg-primary/10 text-primary ring-primary/20",
  violet: "bg-chart-4/10 text-chart-4 ring-chart-4/20",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
