import type { ReactNode } from "react";
import { cn } from "./lib/cn";
import {
  agentCardTintStyle,
  agentIconBadgeStyle,
  resolveAgentAppearance,
} from "./agent-appearance-map";

type AgentIconBadgeProps = {
  colorKey: string;
  children: ReactNode;
  className?: string;
  /** md = desktop card icon, lg = mobile grid tile */
  size?: "md" | "lg";
};

/** Icon tile — shade resolved from the shared agent color map. */
export function AgentIconBadge({
  colorKey,
  children,
  className,
  size = "md",
}: AgentIconBadgeProps) {
  const { palette } = resolveAgentAppearance("Bot", colorKey);

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center text-white shadow-sm",
        size === "lg" ? "h-14 w-14 rounded-2xl" : "rounded-lg p-2.5",
        className,
      )}
      style={agentIconBadgeStyle(palette)}
    >
      {children}
    </div>
  );
}

type AgentCardTintProps = {
  colorKey: string;
  children: ReactNode;
  className?: string;
};

/** Card background tint — shade resolved from the shared agent color map. */
export function AgentCardTint({ colorKey, children, className }: AgentCardTintProps) {
  const { palette } = resolveAgentAppearance("Bot", colorKey);

  return (
    <div
      className={cn("agent-card-tint rounded-xl border border-border/40", className)}
      style={agentCardTintStyle(palette)}
    >
      {children}
    </div>
  );
}

type AgentListingIconProps = {
  iconKey: string;
  colorKey: string;
  className?: string;
  size?: "md" | "lg";
  iconClassName?: string;
};

/** Icon + shade together — use anywhere you have API `icon_key` + `color_key`. */
export function AgentListingIcon({
  iconKey,
  colorKey,
  className,
  size = "md",
  iconClassName,
}: AgentListingIconProps) {
  const appearance = resolveAgentAppearance(iconKey, colorKey);
  const Icon = appearance.icon;

  return (
    <AgentIconBadge colorKey={appearance.colorKey} className={className} size={size}>
      <Icon className={cn(size === "lg" ? "h-6 w-6" : "h-5 w-5", iconClassName)} />
    </AgentIconBadge>
  );
}
