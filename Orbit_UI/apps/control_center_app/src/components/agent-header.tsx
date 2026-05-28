import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AgentHeaderProps = {
  icon: LucideIcon;
  /** Tailwind gradient classes such as `from-blue-500 to-indigo-600`. */
  gradient: string;
  name: string;
  /** Secondary line shown under the name. */
  subtitle?: string;
  /** Right-aligned slot (e.g. ID badge). */
  trailing?: React.ReactNode;
  className?: string;
};

/**
 * Per-agent page header block: gradient icon + name + subtitle.
 * Reused by every agent sub-page (configuration, widgets, personalization,
 * themes, tools).
 */
export function AgentHeader({
  icon: Icon,
  gradient,
  name,
  subtitle,
  trailing,
  className,
}: AgentHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3 mb-6", className)}>
      <div
        className={cn(
          "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm",
          gradient
        )}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold tracking-tight truncate">{name}</p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}

/** Small uppercase + monospace ID badge used as the trailing slot. */
export function IdBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <code className="text-[10px] font-mono text-muted-foreground">{value}</code>
    </div>
  );
}
