import { hydrateAgentRecord, type Agent } from "@/lib/data";

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    return "/api";
  }
  const port = process.env.PORT || "3003";
  return `http://localhost:${port}/api`;
}

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  email_verified?: boolean;
  created_at?: string;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function parseApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (typeof first?.msg === "string") return first.msg;
  }
  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiError(parseApiError(error, `HTTP ${response.status}`), response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function isOperatorRole(role: string): boolean {
  return role === "operator" || role === "superadmin";
}

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

export const authApi = {
  me: () => request<ApiUser>("/auth/me"),

  login: (email: string, password: string) =>
    request<{ user: ApiUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
};

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
};
