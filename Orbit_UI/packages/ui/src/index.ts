// Shared UI primitives across Orbit UI apps.
// Move shadcn/ui components and the `cn` helper here as you deduplicate.

export { cn } from "./lib/cn";
export {
  AGENT_ICON_OPTIONS,
  AGENT_COLOR_OPTIONS,
  resolveAgentIcon,
  resolveAgentGradient,
  resolveAgentPalette,
  isKnownAgentIconKey,
  isKnownAgentColorKey,
  type AgentIconKey,
  type AgentIconOption,
  type AgentColorOption,
} from "./agent-theme";
export {
  resolveAgentAppearance,
  agentCardTintStyle,
  agentIconBadgeStyle,
  type AgentAppearance,
} from "./agent-appearance-map";
export { AgentIconBadge, AgentCardTint, AgentListingIcon } from "./agent-appearance";
