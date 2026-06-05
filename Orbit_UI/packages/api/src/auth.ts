import type { ApiClient, ApiUser } from "./client";

export type AuthRealm = "chat" | "admin" | "control";

export function createAuthApi(realm: AuthRealm, client: ApiClient) {
  const base = `/auth/${realm}`;

  return {
    me: () => client.request<ApiUser>(`${base}/me`),

    login: (email: string, password: string) =>
      client.request<{ user: ApiUser }>(`${base}/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    logout: () => client.request<{ ok: boolean }>(`${base}/logout`, { method: "POST" }),
  };
}
