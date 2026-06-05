import { ApiError, parseApiError } from "./errors";

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

export type ApiClientOptions = {
  /** Fallback port for SSR when no env/base resolver is set. */
  defaultPort?: string;
  /** Override base URL resolution (chat uses same-origin /api in the browser). */
  resolveBaseUrl?: () => string;
  /** Called on 401 for auth paths so apps can clear local session state. */
  onUnauthorized?: (path: string) => void | Promise<void>;
};

export type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
};

export type ApiClient = {
  getApiBaseUrl: () => string;
  request: <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
  uploadRequest: <T>(path: string, formData: FormData) => Promise<T>;
};

function defaultResolveBaseUrl(defaultPort: string): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    return "/api";
  }
  const port = process.env.PORT || defaultPort;
  return `http://localhost:${port}/api`;
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const defaultPort = options.defaultPort ?? "3000";

  function getApiBaseUrl(): string {
    return options.resolveBaseUrl?.() ?? defaultResolveBaseUrl(defaultPort);
  }

  async function request<T>(path: string, requestOptions: ApiRequestOptions = {}): Promise<T> {
    const { timeoutMs, ...fetchOptions } = requestOptions;
    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string> | undefined),
    };
    if (fetchOptions.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...fetchOptions,
      credentials: "include",
      headers,
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : fetchOptions.signal,
    });

    if (!response.ok) {
      if (response.status === 401 && path.includes("/auth/")) {
        await options.onUnauthorized?.(path);
      }
      const error = await response.json().catch(() => null);
      throw new ApiError(parseApiError(error, `HTTP ${response.status}`), response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401 && path.includes("/auth/")) {
        await options.onUnauthorized?.(path);
      }
      const error = await response.json().catch(() => null);
      throw new ApiError(parseApiError(error, `HTTP ${response.status}`), response.status);
    }

    return response.json() as Promise<T>;
  }

  return { getApiBaseUrl, request, uploadRequest };
}
