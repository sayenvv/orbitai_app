const API_BASE_URL = process.env.NEXT_PUBLIC_CHAT_API_URL || "http://localhost:8000/api/chat";

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", headers = {}, body } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include",
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    // If 401, clear auth state so UI reflects unauthenticated immediately
    if (response.status === 401) {
      const { useAuthStore } = await import("@/store/auth-store");
      useAuthStore.getState().logout();
    }
    const error = await response.json().catch(() => ({ message: "An error occurred" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const chatApi = {
  get: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { headers }),

  post: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "POST", body, headers }),

  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "DELETE", headers }),
};
