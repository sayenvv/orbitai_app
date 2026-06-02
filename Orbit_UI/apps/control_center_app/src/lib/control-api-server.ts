import "server-only";

import { cookies } from "next/headers";
import {
  ApiError,
  mapControlAgent,
  mapControlAdaptiveCard,
  mapControlPersonalization,
  mapControlTool,
  mapControlWidget,
  type ApiControlAdaptiveCard,
  type ApiControlAgent,
  type ApiControlPersonalization,
  type ApiControlTheme,
  type ApiControlTool,
  type ApiControlWidgetsResponse,
} from "@/lib/orbit-api";
import type {
  AdaptiveCardDefinition,
  Agent,
  Personalization,
  ToolDefinition,
  Widget,
} from "@/lib/data";
import { hydrateWidget } from "@/lib/data";

function getServerApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  const port = process.env.PORT || "3003";
  const host = process.env.ORBIT_CONTROL_HOST || "127.0.0.1";
  return `http://${host}:${port}/api`;
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

async function serverRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${getServerApiBaseUrl()}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiError(parseApiError(error, `HTTP ${response.status}`), response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const serverControlApi = {
  listAgents: () => serverRequest<ApiControlAgent[]>("/control/agents"),

  getAgent: (agentId: string) =>
    serverRequest<ApiControlAgent>(`/control/agents/${agentId}`),

  getAgentTools: (agentId: string) =>
    serverRequest<ApiControlTool[]>(`/control/agents/${agentId}/tools`),

  getAgentWidgets: (agentId: string) =>
    serverRequest<ApiControlWidgetsResponse>(`/control/agents/${agentId}/widgets`),

  getAgentAdaptiveCards: (agentId: string) =>
    serverRequest<ApiControlAdaptiveCard[]>(`/control/agents/${agentId}/adaptive-cards`),

  getAgentPersonalization: (agentId: string) =>
    serverRequest<ApiControlPersonalization>(`/control/agents/${agentId}/personalization`),

  getAgentTheme: (agentId: string) =>
    serverRequest<ApiControlTheme>(`/control/agents/${agentId}/theme`),
};

export async function fetchAgent(agentId: string): Promise<Agent> {
  const raw = await serverControlApi.getAgent(agentId);
  return mapControlAgent(raw);
}

export async function fetchAgents(): Promise<Agent[]> {
  const rows = await serverControlApi.listAgents();
  return rows.map(mapControlAgent);
}

/** First agent id for section index redirects; null if none or unauthenticated. */
export async function fetchDefaultAgentId(): Promise<string | null> {
  try {
    const rows = await serverControlApi.listAgents();
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchAgentTools(agentId: string): Promise<ToolDefinition[]> {
  const rows = await serverControlApi.getAgentTools(agentId);
  return rows.map(mapControlTool);
}

export async function fetchAgentWidgets(agentId: string): Promise<{
  widgets: Widget[];
  enabledWidgetIds: string[];
}> {
  const data = await serverControlApi.getAgentWidgets(agentId);
  return {
    widgets: data.widgets.map((w) => hydrateWidget(mapControlWidget(w))),
    enabledWidgetIds: data.enabled_widget_ids,
  };
}

export async function fetchAgentAdaptiveCards(agentId: string): Promise<AdaptiveCardDefinition[]> {
  const rows = await serverControlApi.getAgentAdaptiveCards(agentId);
  return rows.map(mapControlAdaptiveCard);
}

export async function fetchAgentPersonalization(agentId: string): Promise<Personalization> {
  const row = await serverControlApi.getAgentPersonalization(agentId);
  return mapControlPersonalization(row);
}

export async function fetchAgentTheme(agentId: string) {
  return serverControlApi.getAgentTheme(agentId);
}
