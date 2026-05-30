import type { User } from "@/store/auth-store";
import type { Conversation, Message } from "@/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const CHAT_API_BASE_URL =
  process.env.NEXT_PUBLIC_CHAT_API_URL || "http://localhost:8000/api/chat";

/** Raw user shape from Orbit API */
export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  email_verified?: boolean;
  image?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ApiAgent = {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  description: string;
  icon_key: string;
  color_key: string;
};

export type ApiConversationSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  agent_id?: string | null;
  agent_slug?: string | null;
  agent_name?: string | null;
  agent_short_name?: string | null;
  icon_key?: string | null;
  color_key?: string | null;
};

export type GeneratedMaterial = {
  id: string;
  title: string;
  type: string;
  agentSlug: string;
  agentName: string;
  iconKey: string;
  colorKey: string;
  date: string;
};

export type ApiMessage = {
  id: string;
  role: string;
  content: string;
  timestamp: string;
};

export type ApiTokenUsage = {
  plan: string;
  tokens_used: number;
  tokens_limit: number | null;
  tokens_remaining: number | null;
  period_start?: string | null;
  period_end?: string | null;
  usage_percent: number;
  limit_reached: boolean;
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
};

export type StreamEvent =
  | { type: "start"; conversation_id: string }
  | { type: "token"; content: string }
  | {
      type: "done";
      usage?: {
        tokens_used: number;
        tokens_limit: number | null;
        tokens_remaining: number | null;
        usage_percent: number;
        limit_reached: boolean;
      };
    };

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function parseApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (typeof first?.msg === "string") return first.msg;
  }
  return fallback;
}

export function mapApiUser(raw: ApiUser): User {
  const now = new Date().toISOString();
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role === "admin" ? "admin" : "student",
    emailVerified: raw.email_verified ?? true,
    image: raw.image ?? undefined,
    createdAt: raw.created_at ?? now,
    updatedAt: raw.updated_at ?? raw.created_at ?? now,
  };
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      const { useAuthStore } = await import("@/store/auth-store");
      useAuthStore.getState().logout();
    }
    const error = await response.json().catch(() => null);
    throw new ApiError(parseApiError(error, `HTTP ${response.status}`), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ─── Auth (`/api/auth/*`) ───────────────────────────────────────────────────

export const authApi = {
  me: () => request<ApiUser>(API_BASE_URL, "/auth/me"),

  login: (email: string, password: string) =>
    request<{ user: ApiUser }>(API_BASE_URL, "/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<{ user: ApiUser }>(API_BASE_URL, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  updateProfile: (name: string) =>
    request<ApiUser>(API_BASE_URL, "/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  logout: () =>
    request<{ ok: boolean }>(API_BASE_URL, "/auth/logout", { method: "POST" }),
};

// ─── Public misc (`/api/*`) ───────────────────────────────────────────────────

export const publicApi = {
  agents: () =>
    request<{ data: ApiAgent[] }>(API_BASE_URL, "/agents"),

  subscription: () =>
    request<ApiTokenUsage>(API_BASE_URL, "/subscription"),

  plans: () =>
    request<{ data: ApiPlanLimit[] }>(API_BASE_URL, "/plans"),

  files: () => request<{ data: unknown[] }>(API_BASE_URL, "/files"),

  studyMaterials: () =>
    request<{ data: unknown[] }>(API_BASE_URL, "/study-materials"),

  library: () => request<{ data: unknown[] }>(API_BASE_URL, "/library"),
};

// ─── Chat (`/api/chat/*`) ───────────────────────────────────────────────────

export type ConversationListResult = {
  data: ApiConversationSummary[];
  has_more: boolean;
  next_offset: number | null;
};

export const chatApi = {
  listConversations: (params?: { limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.limit != null) search.set("limit", String(params.limit));
    if (params?.offset != null) search.set("offset", String(params.offset));
    const query = search.toString();
    return request<ConversationListResult>(
      CHAT_API_BASE_URL,
      query ? `/conversations?${query}` : "/conversations",
    );
  },

  createConversation: (body: { agent_id?: string | null; title?: string }) =>
    request<ApiConversationSummary>(CHAT_API_BASE_URL, "/conversations", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getConversation: (id: string) =>
    request<{ messages: ApiMessage[] }>(CHAT_API_BASE_URL, `/conversations/${id}`),

  deleteConversation: (id: string) =>
    request<void>(CHAT_API_BASE_URL, `/conversations/${id}`, { method: "DELETE" }),

  streamMessage: async function* (
    body: {
      message: string;
      conversation_id?: string | null;
      agent_id?: string | null;
      source_id?: string | null;
      source_type?: string | null;
    },
  ): AsyncGenerator<StreamEvent> {
    const response = await fetch(`${CHAT_API_BASE_URL}/message/stream`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new ApiError(
        parseApiError(error, "Failed to stream message"),
        response.status,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new ApiError("No response stream", 500);

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          yield JSON.parse(jsonStr) as StreamEvent;
        } catch {
          // skip malformed SSE chunk
        }
      }
    }
  },
};

// ─── Mappers for UI types ─────────────────────────────────────────────────────

export function mapConversationSummary(raw: ApiConversationSummary): Conversation {
  return {
    id: raw.id,
    title: raw.title,
    messages: [],
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
    agentId: raw.agent_id ?? null,
    agentSlug: raw.agent_slug ?? null,
    agentName: raw.agent_name ?? null,
    agentShortName: raw.agent_short_name ?? null,
    iconKey: raw.icon_key ?? null,
    colorKey: raw.color_key ?? null,
  };
}

export function mapMessage(raw: ApiMessage): Message {
  return {
    id: raw.id,
    role: raw.role as "user" | "assistant",
    content: raw.content,
    timestamp: new Date(raw.timestamp),
  };
}
