"use client";

import { useEffect, useCallback } from "react";
import { authApi, mapApiUser } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";
import { useUsageStore } from "@/store/usage-store";

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
    checkAuth().finally(() => setLoading(false));

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkAuth();
    };
    const handleFocus = () => checkAuth();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    const interval = setInterval(checkAuth, 60_000);

    return () => {
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
