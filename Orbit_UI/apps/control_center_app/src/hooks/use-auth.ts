"use client";

import { useCallback, useEffect, useRef } from "react";
import { authApi, isOperatorRole } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";

export function useCurrentUser() {
  const { setUser, setLoading } = useAuthStore();
  const checkSeq = useRef(0);

  const checkAuth = useCallback(async () => {
    const seq = ++checkSeq.current;
    const { authGraceUntil } = useAuthStore.getState();
    if (Date.now() < authGraceUntil) {
      setLoading(false);
      return;
    }

    try {
      const data = await authApi.me();
      if (seq !== checkSeq.current) return;

      if (!isOperatorRole(data.role)) {
        setUser(null);
        return;
      }
      setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
    } catch {
      if (seq !== checkSeq.current) return;
      const state = useAuthStore.getState();
      if (Date.now() < state.authGraceUntil) return;
      if (state.isAuthenticated) return;
      setUser(null);
    }
  }, [setUser, setLoading]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8_000);

    checkAuth().finally(() => {
      if (!cancelled) {
        window.clearTimeout(timeout);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      checkSeq.current += 1;
    };
  }, [checkAuth, setLoading]);
}

export function useLogout() {
  const { logout } = useAuthStore();
  return async () => {
    try {
      await authApi.logout();
    } catch {
      // still clear local state
    }
    logout();
  };
}
