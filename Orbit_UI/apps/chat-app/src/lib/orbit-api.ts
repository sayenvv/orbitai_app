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

export type ApiLibraryGenerated = {
  id: string;
  title: string;
  type: string;
  preview: string;
  conversation_id?: string | null;
  agent_id?: string | null;
  source_document_id?: string | null;
  source_filename?: string | null;
  agent_slug?: string | null;
  agent_name?: string;
  agent_short_name?: string | null;
  icon_key?: string;
  color_key?: string;
  created_at: string;
  updated_at?: string | null;
};

export type ApiLibraryResponse = {
  uploads: ApiRagDocument[];
  generated: ApiLibraryGenerated[];
};

export type ApiPdfInspect = {
  total_pages: number;
  page_limit: number | null;
  pages_indexed: number;
  will_truncate: boolean;
  plan: string;
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

export type ApiRagDocument = {
  id: string;
  user_id: string;
  conversation_id?: string | null;
  original_filename: string;
  name: string;
  original_name: string;
  mime_type: string;
  file_size_bytes: number;
  page_count: number;
  pages_processed: number;
  chunk_count: number;
  status: "pending" | "processing" | "ready" | "failed";
  error_message?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string | null;
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

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
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

async function uploadRequest<T>(
  baseUrl: string,
  path: string,
  formData: FormData,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      const { useAuthStore } = await import("@/store/auth-store");
      useAuthStore.getState().logout();
    }
    const error = await response.json().catch(() => null);
    throw new ApiError(parseApiError(error, `HTTP ${response.status}`), response.status);
  }

  return response.json() as Promise<T>;
}

// ─── Auth (`/api/auth/*`) ───────────────────────────────────────────────────

export const authApi = {
  me: () => request<ApiUser>(API_BASE_URL, "/auth/chat/me"),

  login: (email: string, password: string) =>
    request<{ user: ApiUser }>(API_BASE_URL, "/auth/chat/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<{ user: ApiUser }>(API_BASE_URL, "/auth/chat/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  updateProfile: (name: string) =>
    request<ApiUser>(API_BASE_URL, "/auth/chat/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  logout: () =>
    request<{ ok: boolean }>(API_BASE_URL, "/auth/chat/logout", { method: "POST" }),
};

// ─── Public misc (`/api/*`) ───────────────────────────────────────────────────

export type ApiDefaultChat = {
  assistant_name: string;
  description: string;
};

export const publicApi = {
  defaultChat: () => request<ApiDefaultChat>(API_BASE_URL, "/default-chat"),

  agents: () =>
    request<{ data: ApiAgent[] }>(API_BASE_URL, "/agents"),

  subscription: () =>
    request<ApiTokenUsage>(API_BASE_URL, "/subscription"),

  plans: () =>
    request<{ data: ApiPlanLimit[] }>(API_BASE_URL, "/plans"),

  files: () => request<{ data: ApiRagDocument[] }>(API_BASE_URL, "/files"),

  getFile: (id: string) => request<ApiRagDocument>(API_BASE_URL, `/files/${id}`),

  deleteFile: (id: string) =>
    request<{ ok: boolean }>(API_BASE_URL, `/files/${id}`, { method: "DELETE" }),

  inspectPdf: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return uploadRequest<ApiPdfInspect>(API_BASE_URL, "/files/inspect", formData);
  },

  downloadUpload: (id: string, filename: string) =>
    import("@/lib/file-download").then(({ downloadFromApi }) =>
      downloadFromApi(`${API_BASE_URL}/files/${id}/download`, filename, "application/pdf"),
    ),

  deleteGenerated: (id: string) =>
    request<{ ok: boolean }>(API_BASE_URL, `/library/generated/${id}`, { method: "DELETE" }),

  downloadGenerated: (id: string, filename: string) =>
    import("@/lib/file-download").then(({ downloadFromApi }) =>
      downloadFromApi(
        `${API_BASE_URL}/library/generated/${id}/download`,
        filename.endsWith(".txt") ? filename : `${filename}.txt`,
        "text/plain",
      ),
    ),

  generateUploadInsights: (documentId: string) =>
    request<ApiLibraryGenerated>(
      API_BASE_URL,
      `/library/uploads/${documentId}/insights`,
      { method: "POST" },
    ),

  uploadFile: (file: File, conversationId?: string | null) => {
    const formData = new FormData();
    formData.append("file", file);
    if (conversationId) {
      formData.append("conversation_id", conversationId);
    }
    return uploadRequest<ApiRagDocument>(API_BASE_URL, "/files/upload", formData);
  },

  waitForFileReady: async (
    id: string,
    options?: { intervalMs?: number; timeoutMs?: number; onProgress?: (doc: ApiRagDocument) => void },
  ): Promise<ApiRagDocument> => {
    const intervalMs = options?.intervalMs ?? 2000;
    const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000;
    const started = Date.now();

    while (true) {
      const doc = await request<ApiRagDocument>(API_BASE_URL, `/files/${id}`);
      options?.onProgress?.(doc);

      if (doc.status === "ready") return doc;
      if (doc.status === "failed") {
        throw new ApiError(doc.error_message || "Document processing failed", 422);
      }
      if (Date.now() - started > timeoutMs) {
        throw new ApiError("Document processing timed out. Try again later.", 504);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  },

  studyMaterials: () =>
    request<{ data: unknown[] }>(API_BASE_URL, "/study-materials"),

  library: () => request<ApiLibraryResponse>(API_BASE_URL, "/library"),

  getGeneratedInsight: (id: string) =>
    request<ApiLibraryGenerated>(API_BASE_URL, `/library/generated/${id}`),
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
      history?: { role: string; content: string }[];
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
