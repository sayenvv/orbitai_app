import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  resolveAgentIcon,
  resolveAgentPalette,
  type AgentColorOption,
} from "./agent-theme";

/** Resolved icon + shade for rendering agent cards anywhere in Orbit UI. */
export type AgentAppearance = {
  iconKey: string;
  colorKey: string;
  icon: LucideIcon;
  palette: AgentColorOption;
  gradientClass: string;
  tintClass: string;
  gradientCss: string;
  cardBgCss: string;
  cardBgDarkCss: string;
};

export function resolveAgentAppearance(
  iconKey: string,
  colorKey: string,
): AgentAppearance {
  const palette = resolveAgentPalette(colorKey);
  return {
    iconKey,
    colorKey: palette.key,
    icon: resolveAgentIcon(iconKey),
    palette,
    gradientClass: palette.gradient,
    tintClass: palette.bgColor,
    gradientCss: palette.gradientCss,
    cardBgCss: palette.cardBgCss,
    cardBgDarkCss: palette.cardBgDarkCss,
  };
}

export function agentCardTintStyle(palette: AgentColorOption): CSSProperties {
  return {
    ["--agent-card-bg" as string]: palette.cardBgCss,
    ["--agent-card-bg-dark" as string]: palette.cardBgDarkCss,
  };
}

export function agentIconBadgeStyle(palette: AgentColorOption): CSSProperties {
  return { background: palette.gradientCss };
}
