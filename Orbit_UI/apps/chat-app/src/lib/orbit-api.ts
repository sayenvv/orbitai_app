import {
  ApiError,
  createApiClient,
  getApiErrorMessage,
  parseApiError,
  type ApiUser,
} from "@orbit/api";
import type { User } from "@/store/auth-store";
import type { Conversation, Message } from "@/types";

export { ApiError, getApiErrorMessage, parseApiError };

const DEFAULT_API_BASE_URL = "http://localhost:8000/api";

function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

  // Same-origin /api (Next.js dev proxy) so session cookies work on mobile network IPs.
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }

  return DEFAULT_API_BASE_URL;
}

function resolveChatApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_CHAT_API_URL) return process.env.NEXT_PUBLIC_CHAT_API_URL;
  return `${resolveApiBaseUrl().replace(/\/api\/?$/, "")}/api/chat`;
}

const api = createApiClient({
  resolveBaseUrl: resolveApiBaseUrl,
  onUnauthorized: async () => {
    const { useAuthStore } = await import("@/store/auth-store");
    useAuthStore.getState().logout();
  },
});

const chatApiClient = createApiClient({
  resolveBaseUrl: resolveChatApiBaseUrl,
  onUnauthorized: async () => {
    const { useAuthStore } = await import("@/store/auth-store");
    useAuthStore.getState().logout();
  },
});

/** Resolve at call time so browser uses same-origin /api (session cookies). */
export function getApiBaseUrl(): string {
  return api.getApiBaseUrl();
}

export function getChatApiBaseUrl(): string {
  return chatApiClient.getApiBaseUrl();
}

export type { ApiUser };

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
  app_slug?: string | null;
  source_id?: string | null;
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

export type ApiCrawledPage = {
  url: string;
  title: string;
  text: string;
  depth: number;
  links: string[];
};

export type ApiCrawlResponse = {
  start_url: string;
  pages: ApiCrawledPage[];
  page_count: number;
  truncated: boolean;
  failed_urls: string[];
  combined_text: string;
  pending_urls: number;
  pending_url_list: string[];
  max_pages_limit: number;
};

export type ApiCrawlRequest = {
  url: string;
  follow_links?: boolean;
  /** Scrape until queue empty (default true, up to server crawl_max_pages). */
  complete?: boolean;
  max_depth?: number;
  max_pages?: number;
  same_origin_only?: boolean;
  path_prefix_scope?: boolean;
  auto_doc_scope?: boolean;
  include_links?: boolean;
};

export type ApiMultiAgentRouting = {
  primary_agent: string;
  selected_agents: string[];
  intent: string;
  topics: string[];
  reasoning: string;
};

export type ApiWebSearchImage = {
  image_url: string;
  thumbnail_url?: string | null;
  page_url?: string | null;
  title?: string | null;
  alt?: string | null;
  source?: string | null;
};

export type ApiAdaptiveCard = {
  type: string;
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  url?: string | null;
  address?: string | null;
  rating?: string | null;
  price?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  salary?: string | null;
  experience_level?: string | null;
  source?: string | null;
  badges?: string[];
};

export type ApiMessageMetadata = {
  routing?: ApiMultiAgentRouting | null;
  orchestration_status?: string | null;
  human_prompt?: string | null;
  images?: ApiWebSearchImage[];
  cards?: ApiAdaptiveCard[];
};

export type ApiMessage = {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata?: ApiMessageMetadata | null;
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
  | {
      type: "start";
      conversation_id?: string;
      session_id?: string;
      status?: string;
    }
  | {
      type: "meta";
      routing?: ApiMultiAgentRouting;
      orchestration_status?: string;
      human_prompt?: string;
    }
  | { type: "message"; source: string; content: string }
  | { type: "routing"; routing: ApiMultiAgentRouting }
  | { type: "awaiting_human"; human_prompt: string }
  | { type: "token"; content: string }
  | { type: "images"; images: ApiWebSearchImage[] }
  | { type: "cards"; cards: ApiAdaptiveCard[] }
  | { type: "error"; detail: string }
  | {
      type: "done";
      conversation_id?: string;
      session_id?: string;
      orchestration_status?: string;
      images?: ApiWebSearchImage[];
      cards?: ApiAdaptiveCard[];
      usage?: {
        tokens_used: number;
        tokens_limit: number | null;
        tokens_remaining: number | null;
        usage_percent: number;
        limit_reached: boolean;
      };
    };

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

function request<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  return api.request<T>(path, options);
}

function chatRequest<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  return chatApiClient.request<T>(path, options);
}

function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  return api.uploadRequest<T>(path, formData);
}

// ─── Auth (`/api/auth/*`) ───────────────────────────────────────────────────

export const authApi = {
  me: () => request<ApiUser>("/auth/chat/me"),

  login: (email: string, password: string) =>
    request<{ user: ApiUser }>("/auth/chat/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<{ user: ApiUser }>("/auth/chat/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  updateProfile: (name: string) =>
    request<ApiUser>("/auth/chat/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  logout: () =>
    request<{ ok: boolean }>("/auth/chat/logout", { method: "POST" }),
};

// ─── Public misc (`/api/*`) ───────────────────────────────────────────────────

export type ApiDefaultChat = {
  assistant_name: string;
  description: string;
};

export const publicApi = {
  defaultChat: () => request<ApiDefaultChat>("/default-chat"),

  agents: () =>
    request<{ data: ApiAgent[] }>("/agents"),

  subscription: () =>
    request<ApiTokenUsage>("/subscription"),

  plans: () =>
    request<{ data: ApiPlanLimit[] }>("/plans"),

  files: () => request<{ data: ApiRagDocument[] }>("/files"),

  getFile: (id: string) => request<ApiRagDocument>(`/files/${id}`),

  deleteFile: (id: string) =>
    request<{ ok: boolean }>(`/files/${id}`, { method: "DELETE" }),

  inspectPdf: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return uploadRequest<ApiPdfInspect>("/files/inspect", formData);
  },

  downloadUpload: (id: string, filename: string) =>
    import("@/lib/file-download").then(({ downloadFromApi }) =>
      downloadFromApi(`${getApiBaseUrl()}/files/${id}/download`, filename, "application/pdf"),
    ),

  deleteGenerated: (id: string) =>
    request<{ ok: boolean }>(`/library/generated/${id}`, { method: "DELETE" }),

  downloadGenerated: (id: string, filename: string) =>
    import("@/lib/file-download").then(({ downloadFromApi }) =>
      downloadFromApi(
        `${getApiBaseUrl()}/library/generated/${id}/download`,
        filename.endsWith(".txt") ? filename : `${filename}.txt`,
        "text/plain",
      ),
    ),

  generateUploadInsights: (
    documentId: string,
    insightTypes?: string[],
  ) =>
    request<ApiLibraryGenerated>(`/library/uploads/${documentId}/insights`, {
        method: "POST",
        timeoutMs: 5 * 60 * 1000,
        body: JSON.stringify({
          insight_types: insightTypes?.length ? insightTypes : undefined,
        }),
      },
    ),

  uploadFile: (file: File, conversationId?: string | null) => {
    const formData = new FormData();
    formData.append("file", file);
    if (conversationId) {
      formData.append("conversation_id", conversationId);
    }
    return uploadRequest<ApiRagDocument>("/files/upload", formData);
  },

  importWebpageUrl: (url: string, conversationId?: string | null) =>
    request<ApiRagDocument>("/files/import-url", {
      method: "POST",
      body: JSON.stringify({
        url,
        conversation_id: conversationId ?? undefined,
      }),
    }),

  /** Fetch and extract text from one or more pages (does not ingest into library). */
  crawlWeb: (body: ApiCrawlRequest) =>
    request<ApiCrawlResponse>("/crawl", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  waitForFileReady: async (
    id: string,
    options?: { intervalMs?: number; timeoutMs?: number; onProgress?: (doc: ApiRagDocument) => void },
  ): Promise<ApiRagDocument> => {
    const intervalMs = options?.intervalMs ?? 2000;
    const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000;
    const started = Date.now();

    while (true) {
      const doc = await request<ApiRagDocument>(`/files/${id}`);
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
    request<{ data: unknown[] }>("/study-materials"),

  library: () => request<ApiLibraryResponse>("/library"),

  getGeneratedInsight: (id: string) =>
    request<ApiLibraryGenerated>(`/library/generated/${id}`),
};

// ─── Photo Studio (`/api/apps/photo-studio/*`) ───────────────────────────────

export type ApiPhotoStudioGeneratedItem = {
  id: string;
  prompt: string;
  creationType: "logo" | "product" | "lifestyle" | "campaign";
  aspectRatio: string;
  stylePreset: string;
  label: string;
  previewGradient: string;
  createdAt: number;
  transparentBackground?: boolean;
  canvasBackgroundId?: string;
  variantIndex?: number;
  imageUrl?: string | null;
  batchId?: string;
};

export type ApiPhotoStudioGenerateInput = {
  prompt: string;
  creationType: "logo" | "product" | "lifestyle" | "campaign";
  aspectRatio: string;
  stylePreset: string;
  transparentBackground?: boolean;
  assetId?: string | null;
};

export type ApiPhotoStudioOptions = {
  creationTypes: Array<{ id: string; label: string; description: string }>;
  aspectRatios: Array<{ id: string; label: string; hint: string }>;
  stylePresets: Array<{ id: string; label: string }>;
  batchSize: number;
};

export const photoStudioApi = {
  options: () => request<ApiPhotoStudioOptions>("/apps/photo-studio/options"),

  generate: (input: ApiPhotoStudioGenerateInput) =>
    request<{ batchId: string; variants: ApiPhotoStudioGeneratedItem[] }>(
      "/apps/photo-studio/generate",
      {
        method: "POST",
        body: JSON.stringify({
          prompt: input.prompt,
          creationType: input.creationType,
          aspectRatio: input.aspectRatio,
          stylePreset: input.stylePreset,
          transparentBackground: input.transparentBackground,
          assetId: input.assetId ?? undefined,
        }),
      },
    ),

  generations: () =>
    request<{ data: ApiPhotoStudioGeneratedItem[] }>("/apps/photo-studio/generations"),

  deleteGeneration: (id: string) =>
    request<{ ok: boolean }>(`/apps/photo-studio/generations/${id}`, {
      method: "DELETE",
    }),

  getGeneration: (id: string) =>
    request<ApiPhotoStudioGeneratedItem>(`/apps/photo-studio/generations/${id}`),

  assets: () =>
    request<
      Array<{
        id: string;
        name: string;
        mimeType?: string | null;
        downloadUrl: string;
        createdAt?: string | null;
      }>
    >("/apps/photo-studio/assets"),

  designs: (workspaceId?: string) => {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
    return request<ApiPhotoStudioDesignListResponse>(`/apps/photo-studio/designs${query}`);
  },

  workspaces: (limit = 20) =>
    request<{ data: ApiPhotoStudioWorkspaceSummary[] }>(
      `/apps/photo-studio/workspaces?limit=${limit}`,
    ),

  getWorkspace: (id: string) =>
    request<ApiPhotoStudioWorkspaceResponse>(`/apps/photo-studio/workspaces/${id}`),

  createWorkspace: (input: ApiPhotoStudioWorkspaceCreateInput) =>
    request<ApiPhotoStudioWorkspaceResponse>("/apps/photo-studio/workspaces", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateWorkspace: (id: string, input: ApiPhotoStudioWorkspaceUpdateInput) =>
    request<ApiPhotoStudioWorkspaceResponse>(`/apps/photo-studio/workspaces/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  deleteWorkspace: (id: string) =>
    request<{ ok: boolean }>(`/apps/photo-studio/workspaces/${id}`, {
      method: "DELETE",
    }),

  getCanvasExport: (params: { workspaceId?: string; draftId?: string }) => {
    const query = new URLSearchParams();
    if (params.workspaceId) query.set("workspaceId", params.workspaceId);
    if (params.draftId) query.set("draftId", params.draftId);
    const qs = query.toString();
    return request<{
      exportedAt?: string;
      workspaceId?: string | null;
      draftId?: string | null;
      projectName?: string;
      aspectRatio?: string;
      canvasBackgroundId?: string;
      customCanvasBackgroundColor?: string;
      customCanvasGradientEnd?: string;
      customCanvasGradientEnabled?: boolean;
      canvasShapes: unknown[];
      canvasTexts: unknown[];
    }>(`/apps/photo-studio/canvas-export${qs ? `?${qs}` : ""}`);
  },

  exportCanvasJson: (input: {
    workspaceId?: string;
    draftId?: string;
    projectName?: string;
    aspectRatio?: string;
    canvasBackgroundId?: string;
    customCanvasBackgroundColor?: string;
    customCanvasGradientEnd?: string;
    customCanvasGradientEnabled?: boolean;
    canvasShapes: unknown[];
    canvasTexts: unknown[];
  }) =>
    request<{ fileName: string; relativePath: string }>("/apps/photo-studio/canvas-export", {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
};

export type ApiPhotoStudioDesignItem = {
  id: string;
  title: string;
  aspectRatio: string;
  canvasBackgroundId: string;
  shapes: unknown[];
  texts: unknown[];
  createdAt: number;
  source: "system" | "user";
};

export type ApiPhotoStudioDesignListResponse = {
  templates: ApiPhotoStudioDesignItem[];
  saved: ApiPhotoStudioDesignItem[];
};

export type ApiPhotoStudioWorkspaceSummary = {
  id: string;
  title: string;
  assetId?: string | null;
  assetName?: string | null;
  aspectRatio: string;
  openedAt: number;
  updatedAt: number;
};

export type ApiPhotoStudioWorkspaceState = {
  title: string;
  assetId?: string | null;
  assetName?: string | null;
  aspectRatio: string;
  creationType: "logo" | "product" | "lifestyle" | "campaign";
  stylePreset: string;
  logoTransparentBackground: boolean;
  canvasBackgroundId: string;
  customCanvasBackgroundColor: string;
  customCanvasGradientEnd: string;
  customCanvasGradientEnabled: boolean;
  projectName: string;
  canvasShapes: unknown[];
  canvasTexts: unknown[];
  generatedItems: ApiPhotoStudioGeneratedItem[];
  savedDesigns?: unknown[];
  selectedGenerationId?: string | null;
  materializedGenerationId?: string | null;
};

export type ApiPhotoStudioWorkspaceResponse = {
  id: string;
  title: string;
  assetId?: string | null;
  assetName?: string | null;
  openedAt: number;
  updatedAt: number;
  state: ApiPhotoStudioWorkspaceState;
};

export type ApiPhotoStudioWorkspaceCreateInput = {
  title?: string;
  assetId?: string;
  assetName?: string;
  state?: Partial<ApiPhotoStudioWorkspaceState>;
};

export type ApiPhotoStudioWorkspaceUpdateInput = {
  title?: string;
  assetId?: string | null;
  assetName?: string | null;
  state?: Partial<ApiPhotoStudioWorkspaceState>;
  touch?: boolean;
};

// ─── Chat (`/api/chat/*`) ───────────────────────────────────────────────────

export type ConversationListResult = {
  data: ApiConversationSummary[];
  has_more: boolean;
  next_offset: number | null;
};

export const chatApi = {
  listConversations: (params?: { limit?: number; offset?: number; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit != null) search.set("limit", String(params.limit));
    if (params?.offset != null) search.set("offset", String(params.offset));
    if (params?.q?.trim()) search.set("q", params.q.trim());
    const query = search.toString();
    return chatRequest<ConversationListResult>(
      query ? `/conversations?${query}` : "/conversations",
    );
  },

  createConversation: (body: { agent_id?: string | null; title?: string }) =>
    chatRequest<ApiConversationSummary>("/conversations", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getConversation: (id: string) =>
    chatRequest<{ messages: ApiMessage[] }>(`/conversations/${id}`),

  deleteConversation: (id: string) =>
    chatRequest<void>(`/conversations/${id}`, { method: "DELETE" }),

  streamMessage: async function* (
    body: {
      message: string;
      conversation_id?: string | null;
      agent_id?: string | null;
      app_slug?: string | null;
      source_id?: string | null;
      source_type?: string | null;
      history?: { role: string; content: string }[];
    },
  ): AsyncGenerator<StreamEvent> {
    const response = await fetch(`${getApiBaseUrl()}/chat/message/stream`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.message,
        conversation_id: body.conversation_id ?? null,
        agent_id: body.agent_id ?? null,
        app_slug: body.app_slug ?? null,
        source_id: body.source_id ?? null,
      }),
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

// ─── Project Planning (`/api/apps/project-planning/*`) ───────────────────────

export type ApiProjectPlanningWorksheetContent = {
  blocks: Array<Record<string, unknown>>;
};

export type ApiProjectPlanningDocument = {
  id: string;
  name: string;
  summary: string;
  stack: { backend: string; mobile: string };
  phases: Array<{
    id: string;
    label: string;
    artifacts: Array<{
      id: string;
      phaseId: string;
      label: string;
      description: string;
      format: "diagram" | "document" | "matrix";
      worksheet?: ApiProjectPlanningWorksheetContent;
    }>;
  }>;
  state: {
    reviewedArtifactIds: string[];
    activePhaseId: string;
    activeArtifactId: string | null;
    worksheetsByArtifactId: Record<string, ApiProjectPlanningWorksheetContent>;
  };
  updatedAt: string;
};

export const projectPlanningApi = {
  listTemplates: () =>
    request<{ projectIds: string[] }>("/apps/project-planning/templates"),

  getProject: (projectId: string) =>
    request<ApiProjectPlanningDocument>(
      `/apps/project-planning/projects/${encodeURIComponent(projectId)}`,
    ),

  saveProject: (projectId: string, body: ApiProjectPlanningDocument) =>
    request<{ projectId: string; relativePath: string; updatedAt: string }>(
      `/apps/project-planning/projects/${encodeURIComponent(projectId)}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),

  aiAssist: (body: {
    projectId: string;
    artifactId: string;
    message: string;
    projectName: string;
    projectSummary: string;
    phaseLabel: string;
    artifactLabel: string;
    artifactDescription: string;
    artifactFormat: "diagram" | "document" | "matrix";
    worksheet: ApiProjectPlanningWorksheetContent;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    textSelection?: {
      blockId: string;
      selectedText: string;
      start: number;
      end: number;
    } | null;
  }) =>
    request<{
      reply: string;
      worksheet?: ApiProjectPlanningWorksheetContent;
      worksheetUpdated: boolean;
    }>("/apps/project-planning/ai-assist", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ─── Code workspace (`/apps/code-workspace/*`) ───────────────────────────────

export type ApiCodeWorkspaceNode = {
  id: string;
  kind: "folder" | "file";
  name: string;
  parentId: string | null;
  language?: string | null;
};

export type ApiCodeWorkspaceUiState = {
  explorerFocusId?: string | null;
  selectedFolderId?: string | null;
  activeFileId: string | null;
  rootExpanded?: boolean;
  expandedFolderIds: string[];
  openFileIds: string[];
};

export type ApiCodeWorkspaceState = {
  nodes: ApiCodeWorkspaceNode[];
  ui: ApiCodeWorkspaceUiState;
};

export type ApiCodeWorkspaceProjectSummary = {
  id: string;
  title: string;
  description?: string | null;
  updatedAt: number;
};

export type ApiCodeWorkspaceProjectResponse = {
  id: string;
  title: string;
  description?: string | null;
  updatedAt: number;
  state: ApiCodeWorkspaceState;
};

export type ApiCodeWorkspacePreferences = {
  tabSize: 2 | 4 | 8;
  fontSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  autoSaveDelayMs: 500 | 1000 | 2000 | 5000;
  seedDemoOnCreate: boolean;
  terminalOpenOnLaunch: boolean;
  defaultGitBranch: string;
  rightSidebarOpenOnLaunch: boolean;
};

export type ApiCodeWorkspaceSettings = {
  storageRootPath: string | null;
  effectiveStorageRootPath: string;
  defaultStorageRootPath: string;
  preferences: ApiCodeWorkspacePreferences;
};

export type ApiCodeWorkspaceDeployLogEntry = {
  level: "info" | "warn" | "error" | "success";
  message: string;
  timestamp: number;
};

export type ApiCodeWorkspaceDeployResponse = {
  status: "success" | "failed";
  stack: string;
  deployUrl: string | null;
  logs: ApiCodeWorkspaceDeployLogEntry[];
  deployedAt: number;
};

export const codeWorkspaceApi = {
  listProjects: (limit = 20) =>
    request<{ data: ApiCodeWorkspaceProjectSummary[] }>(
      `/apps/code-workspace/projects?limit=${limit}`,
    ),

  getProject: (id: string) =>
    request<ApiCodeWorkspaceProjectResponse>(
      `/apps/code-workspace/projects/${encodeURIComponent(id)}`,
    ),

  createProject: (body: { title?: string; description?: string; seedDemo?: boolean }) =>
    request<ApiCodeWorkspaceProjectResponse>("/apps/code-workspace/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateProject: (id: string, body: { title?: string; description?: string }) =>
    request<ApiCodeWorkspaceProjectResponse>(
      `/apps/code-workspace/projects/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),

  updateStructure: (id: string, body: ApiCodeWorkspaceState) =>
    request<ApiCodeWorkspaceProjectResponse>(
      `/apps/code-workspace/projects/${encodeURIComponent(id)}/structure`,
      { method: "PUT", body: JSON.stringify(body) },
    ),

  addNode: (
    id: string,
    body: {
      kind: "folder" | "file";
      name: string;
      parentId?: string | null;
      language?: string;
    },
  ) =>
    request<ApiCodeWorkspaceProjectResponse>(
      `/apps/code-workspace/projects/${encodeURIComponent(id)}/nodes`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  updateNode: (
    projectId: string,
    nodeId: string,
    body: { name?: string; language?: string; parentId?: string | null },
  ) =>
    request<ApiCodeWorkspaceProjectResponse>(
      `/apps/code-workspace/projects/${encodeURIComponent(projectId)}/nodes/${encodeURIComponent(nodeId)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),

  deleteProject: (id: string) =>
    request<void>(`/apps/code-workspace/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  getFileContent: (projectId: string, nodeId: string) =>
    request<{ nodeId: string; content: string }>(
      `/apps/code-workspace/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(nodeId)}`,
    ),

  saveFileContent: (projectId: string, nodeId: string, content: string) =>
    request<{ nodeId: string; content: string }>(
      `/apps/code-workspace/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(nodeId)}`,
      { method: "PUT", body: JSON.stringify({ content }) },
    ),

  getSettings: () =>
    request<ApiCodeWorkspaceSettings>("/apps/code-workspace/settings"),

  updateSettings: (body: {
    storageRootPath?: string | null;
    preferences?: Partial<ApiCodeWorkspacePreferences>;
  }) =>
    request<ApiCodeWorkspaceSettings>("/apps/code-workspace/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deployProject: (projectId: string, body: { target?: "clovops" } = {}) =>
    request<ApiCodeWorkspaceDeployResponse>(
      `/apps/code-workspace/projects/${encodeURIComponent(projectId)}/deploy`,
      { method: "POST", body: JSON.stringify(body) },
    ),
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
    appSlug: raw.app_slug ?? null,
    sourceId: raw.source_id ?? null,
  };
}

function mapWebSearchImage(raw: ApiWebSearchImage) {
  return {
    imageUrl: raw.image_url,
    thumbnailUrl: raw.thumbnail_url ?? null,
    pageUrl: raw.page_url ?? null,
    title: raw.title ?? null,
    alt: raw.alt ?? null,
    source: raw.source ?? null,
  };
}

function mapAdaptiveCard(raw: ApiAdaptiveCard) {
  return {
    type: raw.type,
    id: raw.id,
    title: raw.title,
    subtitle: raw.subtitle ?? null,
    description: raw.description ?? null,
    imageUrl: raw.image_url ?? null,
    thumbnailUrl: raw.thumbnail_url ?? null,
    url: raw.url ?? null,
    address: raw.address ?? null,
    rating: raw.rating ?? null,
    price: raw.price ?? null,
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    company: raw.company ?? null,
    salary: raw.salary ?? null,
    experienceLevel: raw.experience_level ?? null,
    source: raw.source ?? null,
    badges: raw.badges ?? [],
  };
}

function mapMessageMetadata(raw: ApiMessageMetadata | null | undefined) {
  if (!raw) return undefined;
  return {
    routing: raw.routing ?? null,
    orchestration_status: raw.orchestration_status ?? null,
    human_prompt: raw.human_prompt ?? null,
    images: raw.images?.map(mapWebSearchImage),
    cards: raw.cards?.map(mapAdaptiveCard),
  };
}

export function mapMessage(raw: ApiMessage): Message {
  return {
    id: raw.id,
    role: raw.role as "user" | "assistant",
    content: raw.content,
    timestamp: new Date(raw.timestamp),
    metadata: mapMessageMetadata(raw.metadata),
  };
}
