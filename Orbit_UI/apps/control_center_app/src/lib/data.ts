/**
 * Data access layer for the control center app.
 *
 * Agents and agent resources are loaded from the Orbit API.
 * Local JSON under `src/data/` remains as seed/reference data only.
 */

import { type LucideIcon } from "lucide-react";
import { resolveAgentIcon, resolveAgentGradient } from "@orbit/ui";

import toolsData from "@/data/tools.json";
import agentToolsData from "@/data/agent-tools.json";
import configurationsData from "@/data/configurations.json";
import widgetsData from "@/data/widgets.json";
import agentWidgetsData from "@/data/agent-widgets.json";
import personalizationData from "@/data/personalization.json";
import adaptiveCardsData from "@/data/adaptive-cards.json";
import agentAdaptiveCardsData from "@/data/agent-adaptive-cards.json";

// ---------- Types ----------

export type AgentStatus = "active" | "draft";

/** Raw agent record as stored in JSON. */
export type AgentRecord = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  status: AgentStatus;
  iconKey: string;
  colorKey: string;
};

/** Hydrated agent — JSON record plus resolved icon component & gradient class. */
export type Agent = AgentRecord & {
  icon: LucideIcon;
  /** Tailwind gradient class for the agent accent (e.g. "from-blue-500 to-indigo-600"). */
  color: string;
};

export type ToolParameters = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

export type ToolDefinition = {
  /** UUID. Optional because the in-app editor can compose new tools that haven't been persisted yet. */
  id?: string;
  name: string;
  description: string;
  parameters: ToolParameters;
  enabled?: boolean;
};

export type Configuration = {
  id: string;
  agentId: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  updatedAt: string;
};

export type WidgetDefinition = {
  id: string;
  key: string;
  name: string;
  description: string;
  iconKey: string;
};

export type Widget = WidgetDefinition & { icon: LucideIcon };

export type Personalization = {
  id: string;
  agentId: string;
  greeting: string;
  avatarEmoji: string;
  quickPrompts: string[];
  tone: string;
  responseLength: string;
  language?: string;
};

/** Adaptive Card definition — a named Microsoft Adaptive Card JSON payload. */
export type AdaptiveCardDefinition = {
  /** UUID. Optional so the in-editor draft can add a new card before save. */
  id?: string;
  name: string;
  description: string;
  /** Full Adaptive Card JSON payload (https://adaptivecards.io). */
  payload: Record<string, unknown>;
};

// ---------- Icon & color resolution ----------

export function resolveIcon(iconKey: string): LucideIcon {
  return resolveAgentIcon(iconKey);
}

export function resolveGradient(colorKey: string): string {
  return resolveAgentGradient(colorKey);
}

function hydrateAgent(record: AgentRecord): Agent {
  return {
    ...record,
    icon: resolveIcon(record.iconKey),
    color: resolveGradient(record.colorKey),
  };
}

/** Hydrate a plain agent record (e.g. from API mapper). */
export function hydrateAgentRecord(record: AgentRecord): Agent {
  return hydrateAgent(record);
}

/** Hydrate a widget definition with its icon component. */
export function hydrateWidget(def: WidgetDefinition): Widget {
  return { ...def, icon: resolveIcon(def.iconKey) };
}

/** Hydrate widget definitions (e.g. from API) with icon components. */
export function hydrateWidgets(defs: WidgetDefinition[]): Widget[] {
  return defs.map(hydrateWidget);
}

// ---------- Tools ----------

const TOOL_LIST: ToolDefinition[] = (toolsData as { tools: ToolDefinition[] }).tools;
const AGENT_TOOLS: { agentId: string; toolIds: string[] }[] = (
  agentToolsData as { mappings: { agentId: string; toolIds: string[] }[] }
).mappings;

export function listTools(): ToolDefinition[] {
  return TOOL_LIST;
}

export function getToolById(id: string): ToolDefinition | undefined {
  return TOOL_LIST.find((t) => t.id === id);
}

export function getToolIdsForAgent(agentId: string): string[] {
  return AGENT_TOOLS.find((m) => m.agentId === agentId)?.toolIds ?? [];
}

export function getToolsForAgent(agentId: string): ToolDefinition[] {
  return getToolIdsForAgent(agentId)
    .map(getToolById)
    .filter((t): t is ToolDefinition => Boolean(t));
}

// ---------- Configurations ----------

const CONFIG_LIST: Configuration[] = (
  configurationsData as { configurations: Configuration[] }
).configurations;

export function listConfigurations(): Configuration[] {
  return CONFIG_LIST;
}

export function getConfigurationById(id: string): Configuration | undefined {
  return CONFIG_LIST.find((c) => c.id === id);
}

export function getConfigurationForAgent(agentId: string): Configuration | undefined {
  return CONFIG_LIST.find((c) => c.agentId === agentId);
}

// ---------- Widgets ----------

const WIDGET_DEFS: WidgetDefinition[] = (widgetsData as { widgets: WidgetDefinition[] }).widgets;
const WIDGET_LIST: Widget[] = WIDGET_DEFS.map(hydrateWidget);
const AGENT_WIDGETS: { agentId: string; widgetIds: string[] }[] = (
  agentWidgetsData as { mappings: { agentId: string; widgetIds: string[] }[] }
).mappings;

export function listWidgets(): Widget[] {
  return WIDGET_LIST;
}

export function getWidgetById(id: string): Widget | undefined {
  return WIDGET_LIST.find((w) => w.id === id);
}

export function getWidgetIdsForAgent(agentId: string): string[] {
  return AGENT_WIDGETS.find((m) => m.agentId === agentId)?.widgetIds ?? [];
}

// ---------- Personalization ----------

const PERSONALIZATION_LIST: Personalization[] = (
  personalizationData as { personalizations: Personalization[] }
).personalizations;

export function getPersonalizationForAgent(agentId: string): Personalization | undefined {
  return PERSONALIZATION_LIST.find((p) => p.agentId === agentId);
}

export function getPersonalizationById(id: string): Personalization | undefined {
  return PERSONALIZATION_LIST.find((p) => p.id === id);
}

// ---------- Adaptive Cards ----------

const ADAPTIVE_CARD_LIST: AdaptiveCardDefinition[] = (
  adaptiveCardsData as { cards: AdaptiveCardDefinition[] }
).cards;

const AGENT_ADAPTIVE_CARDS: { agentId: string; cardIds: string[] }[] = (
  agentAdaptiveCardsData as { mappings: { agentId: string; cardIds: string[] }[] }
).mappings;

export function listAdaptiveCards(): AdaptiveCardDefinition[] {
  return ADAPTIVE_CARD_LIST;
}

export function getAdaptiveCardById(id: string): AdaptiveCardDefinition | undefined {
  return ADAPTIVE_CARD_LIST.find((c) => c.id === id);
}

export function getAdaptiveCardIdsForAgent(agentId: string): string[] {
  return AGENT_ADAPTIVE_CARDS.find((m) => m.agentId === agentId)?.cardIds ?? [];
}

export function getAdaptiveCardsForAgent(agentId: string): AdaptiveCardDefinition[] {
  return getAdaptiveCardIdsForAgent(agentId)
    .map(getAdaptiveCardById)
    .filter((c): c is AdaptiveCardDefinition => Boolean(c));
}
