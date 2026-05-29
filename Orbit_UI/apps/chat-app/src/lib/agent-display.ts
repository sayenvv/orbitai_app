import { type LucideIcon } from "lucide-react";
import { resolveAgentAppearance } from "@orbit/ui";

export type HomeAgent = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  iconKey: string;
  colorKey: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
};

/** Map API / seed keys to a display-ready agent card (shared with control center). */
export function buildHomeAgent(input: {
  id: string;
  name: string;
  shortName: string;
  description: string;
  iconKey: string;
  colorKey: string;
}): HomeAgent {
  const appearance = resolveAgentAppearance(input.iconKey, input.colorKey);
  return {
    id: input.id,
    name: input.name,
    shortName: input.shortName,
    description: input.description,
    iconKey: appearance.iconKey,
    colorKey: appearance.colorKey,
    icon: appearance.icon,
    color: appearance.gradientClass,
    bgColor: appearance.tintClass,
  };
}
