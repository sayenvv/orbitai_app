import {
  createApiClient,
  createAuthApi,
  isOperatorRole,
  type ApiUser,
} from "@orbit/api";
import {
  hydrateAgentRecord,
  type Agent,
  type AdaptiveCardDefinition,
  type Personalization,
  type ToolDefinition,
  type WidgetDefinition,
} from "@/lib/data";

export { ApiError, getApiErrorMessage, type ApiUser } from "@orbit/api";
export { isOperatorRole };

const api = createApiClient({ defaultPort: "3003" });
const { request } = api;

export const authApi = createAuthApi("control", api);

export type ApiControlAgent = {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  description: string;
  status: "active" | "draft";
  icon_key: string;
  color_key: string;
};

export type ApiControlConfiguration = {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
};

export type ApiChatStack = {
  provider: "ollama" | "openai" | "azure_openai";
  model: string;
  deployment?: string | null;
};

export type ApiEmbeddingStack = {
  provider: "fastembed" | "ollama" | "azure_openai";
  model: string;
  deployment?: string | null;
  dimensions: number;
};

export type ApiPlanAiStack = {
  chat: ApiChatStack;
  embeddings: ApiEmbeddingStack;
};

export type ApiPlanLimit = {
  plan: string;
  label: string;
  tagline: string;
  features: string[];
  highlight: boolean;
  token_limit: number | null;
  token_limit_raw: number;
  updated_at?: string | null;
  ai_stack?: ApiPlanAiStack;
};

export type ApiPlanLimitPatch = {
  token_limit?: number;
  label?: string;
  tagline?: string;
  features?: string[];
  highlight?: boolean;
  ai_stack?: Partial<{
    chat: Partial<ApiChatStack>;
    embeddings: Partial<ApiEmbeddingStack>;
  }>;
};

export type ApiPlanLimitsResponse = {
  data: ApiPlanLimit[];
};

export type ApiControlTool = {
  id?: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  enabled?: boolean;
};

export type ApiControlWidget = {
  id: string;
  key: string;
  name: string;
  description: string;
  icon_key: string;
};

export type ApiControlWidgetsResponse = {
  widgets: ApiControlWidget[];
  enabled_widget_ids: string[];
};

export type ApiControlAdaptiveCard = {
  id?: string;
  name: string;
  description: string;
  payload: Record<string, unknown>;
};

export type ApiControlPersonalization = {
  id: string;
  agent_id: string;
  greeting: string;
  avatar_emoji: string;
  quick_prompts: string[];
  tone: string;
  response_length: string;
  language: string;
};

export type ApiControlTheme = {
  color_key: string;
  border_radius: string;
  density: string;
  font_sans: string;
  bubble_style: string;
  dark_mode: string;
};

export function mapControlAgent(raw: ApiControlAgent): Agent {
  return hydrateAgentRecord({
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    shortName: raw.short_name,
    description: raw.description,
    status: raw.status,
    iconKey: raw.icon_key,
    colorKey: raw.color_key,
  });
}

export function mapControlTool(raw: ApiControlTool): ToolDefinition {
  return {
    ...(raw.id ? { id: raw.id } : {}),
    name: raw.name,
    description: raw.description,
    parameters: raw.parameters as ToolDefinition["parameters"],
    enabled: raw.enabled ?? true,
  };
}

export function mapControlWidget(raw: ApiControlWidget): WidgetDefinition {
  return {
    id: raw.id,
    key: raw.key,
    name: raw.name,
    description: raw.description,
    iconKey: raw.icon_key,
  };
}

export function mapControlAdaptiveCard(raw: ApiControlAdaptiveCard): AdaptiveCardDefinition {
  return {
    ...(raw.id ? { id: raw.id } : {}),
    name: raw.name,
    description: raw.description,
    payload: raw.payload,
  };
}

export function mapControlPersonalization(raw: ApiControlPersonalization): Personalization {
  return {
    id: raw.id,
    agentId: raw.agent_id,
    greeting: raw.greeting,
    avatarEmoji: raw.avatar_emoji,
    quickPrompts: raw.quick_prompts,
    tone: raw.tone,
    responseLength: raw.response_length,
    language: raw.language,
  };
}

export function toToolApiBody(tools: ToolDefinition[]): ApiControlTool[] {
  return tools.map((tool) => ({
    ...(tool.id ? { id: tool.id } : {}),
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    enabled: tool.enabled ?? true,
  }));
}

export function toAdaptiveCardApiBody(cards: AdaptiveCardDefinition[]): ApiControlAdaptiveCard[] {
  return cards.map((card) => ({
    ...(card.id ? { id: card.id } : {}),
    name: card.name,
    description: card.description,
    payload: card.payload,
  }));
}

export function toPersonalizationApiBody(data: {
  greeting: string;
  avatarEmoji: string;
  quickPrompts: string[];
  tone: string;
  responseLength: string;
  language: string;
}) {
  return {
    greeting: data.greeting,
    avatar_emoji: data.avatarEmoji,
    quick_prompts: data.quickPrompts,
    tone: data.tone,
    response_length: data.responseLength,
    language: data.language,
  };
}

export function toAgentCreateBody(data: {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  status: "active" | "draft";
  iconKey: string;
  colorKey: string;
}) {
  return {
    slug: data.slug,
    name: data.name,
    short_name: data.shortName,
    description: data.description,
    status: data.status,
    icon_key: data.iconKey,
    color_key: data.colorKey,
  };
}

export function toAgentUpdateBody(data: {
  name?: string;
  shortName?: string;
  description?: string;
  status?: "active" | "draft";
  iconKey?: string;
  colorKey?: string;
}) {
  return {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.shortName !== undefined && { short_name: data.shortName }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.status !== undefined && { status: data.status }),
    ...(data.iconKey !== undefined && { icon_key: data.iconKey }),
    ...(data.colorKey !== undefined && { color_key: data.colorKey }),
  };
}

export const controlApi = {
  listAgents: () => request<ApiControlAgent[]>("/control/agents"),

  getAgent: (agentId: string) =>
    request<ApiControlAgent>(`/control/agents/${agentId}`),

  createAgent: (body: ReturnType<typeof toAgentCreateBody>) =>
    request<ApiControlAgent>("/control/agents", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateAgent: (agentId: string, body: ReturnType<typeof toAgentUpdateBody>) =>
    request<ApiControlAgent>(`/control/agents/${agentId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteAgent: (agentId: string) =>
    request<void>(`/control/agents/${agentId}`, {
      method: "DELETE",
    }),

  publishAgent: (agentId: string) =>
    request<ApiControlAgent>(`/control/agents/${agentId}/publish`, {
      method: "POST",
    }),

  getConfiguration: (agentId: string) =>
    request<ApiControlConfiguration>(`/control/agents/${agentId}/configuration`),

  updateConfiguration: (
    agentId: string,
    body: Partial<{ model: string; temperature: number; max_tokens: number; system_prompt: string }>,
  ) =>
    request<ApiControlConfiguration>(`/control/agents/${agentId}/configuration`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  getPlanLimits: () => request<ApiPlanLimitsResponse>("/control/plan-limits"),

  updatePlanLimits: (plans: Record<string, ApiPlanLimitPatch>) =>
    request<ApiPlanLimitsResponse>("/control/plan-limits", {
      method: "PATCH",
      body: JSON.stringify({ plans }),
    }),

  getAgentTools: (agentId: string) =>
    request<ApiControlTool[]>(`/control/agents/${agentId}/tools`),

  updateAgentTools: (agentId: string, tools: ApiControlTool[]) =>
    request<ApiControlTool[]>(`/control/agents/${agentId}/tools`, {
      method: "PUT",
      body: JSON.stringify(tools),
    }),

  getAgentWidgets: (agentId: string) =>
    request<ApiControlWidgetsResponse>(`/control/agents/${agentId}/widgets`),

  updateAgentWidgets: (agentId: string, enabledWidgetIds: string[]) =>
    request<ApiControlWidgetsResponse>(`/control/agents/${agentId}/widgets`, {
      method: "PUT",
      body: JSON.stringify({ enabled_widget_ids: enabledWidgetIds }),
    }),

  getAgentAdaptiveCards: (agentId: string) =>
    request<ApiControlAdaptiveCard[]>(`/control/agents/${agentId}/adaptive-cards`),

  updateAgentAdaptiveCards: (agentId: string, cards: ApiControlAdaptiveCard[]) =>
    request<ApiControlAdaptiveCard[]>(`/control/agents/${agentId}/adaptive-cards`, {
      method: "PUT",
      body: JSON.stringify(cards),
    }),

  getAgentPersonalization: (agentId: string) =>
    request<ApiControlPersonalization>(`/control/agents/${agentId}/personalization`),

  updateAgentPersonalization: (
    agentId: string,
    body: ReturnType<typeof toPersonalizationApiBody>,
  ) =>
    request<ApiControlPersonalization>(`/control/agents/${agentId}/personalization`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getAgentTheme: (agentId: string) =>
    request<ApiControlTheme>(`/control/agents/${agentId}/theme`),

  updateAgentTheme: (agentId: string, body: Partial<ApiControlTheme>) =>
    request<ApiControlTheme>(`/control/agents/${agentId}/theme`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
