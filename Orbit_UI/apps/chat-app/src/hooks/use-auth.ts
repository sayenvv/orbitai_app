"use client";

import { useEffect, useCallback } from "react";
import { authApi, mapApiUser } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";
import { useUsageStore } from "@/store/usage-store";

const AUTH_TIMEOUT_MS = 8_000;

export function useCurrentUser() {
  const { setUser, setLoading } = useAuthStore();

  const checkAuth = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(mapApiUser(data));
    } catch {
      setUser(null);
    }
  }, [setUser]);

  useEffect(() => {
    let cancelled = false;

    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, AUTH_TIMEOUT_MS);

    void checkAuth().finally(() => {
      if (!cancelled) setLoading(false);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkAuth();
    };
    const handleFocus = () => void checkAuth();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    const interval = setInterval(() => void checkAuth(), 60_000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [setLoading, checkAuth]);
}

/** Clears local auth state only — chat session cookie is cleared via authApi.logout(). */
export function useLogout() {
  const { logout } = useAuthStore();
  return async () => {
    try {
      await authApi.logout();
    } catch {
      // still clear local state
    }
    logout();
    useUsageStore.getState().clearUsage();
  };
}

/** Alias for full server + local logout. */
export function useServerLogout() {
  return useLogout();
}
