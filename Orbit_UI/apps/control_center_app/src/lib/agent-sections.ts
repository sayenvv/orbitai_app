import { Settings, LayoutGrid, Sparkles, Palette, Wrench, LayoutTemplate, type LucideIcon } from "lucide-react";

export type AgentSectionLink = {
  section: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

/**
 * The agent sub-sections. Used on the agents list (as quick chips), on the
 * sidebar rail when an agent is selected, and on the agent details surface.
 */
export const AGENT_SECTIONS: AgentSectionLink[] = [
  { section: "configuration",   label: "Configure",   icon: Settings,        description: "Model, prompts, runtime behaviour" },
  { section: "tools",           label: "Tools",       icon: Wrench,          description: "Tool catalog this agent can call" },
  { section: "widgets",         label: "Widgets",     icon: LayoutGrid,      description: "UI widgets allowed in responses" },
  { section: "adaptive-cards",  label: "Cards",       icon: LayoutTemplate,  description: "Adaptive Cards this agent can render" },
  { section: "personalization", label: "Personalize", icon: Sparkles,        description: "Greeting, prompts, tone" },
  { section: "themes",          label: "Theme",       icon: Palette,         description: "Colors and visual identity" },
];

/** Build the URL for a given agent + section. */
export function agentSectionHref(agentId: string, section: string): string {
  return `/${section}/${agentId}`;
}
