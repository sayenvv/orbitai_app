"use client";

import { useCallback, useEffect, useRef } from "react";
import { authApi, isAdminRole } from "@/lib/orbit-api";
import { useSessionStore } from "@/store/session-store";

export function useAdminSession() {
  const { setUser, setLoading } = useSessionStore();
  const checkSeq = useRef(0);

  const checkAuth = useCallback(async () => {
    const seq = ++checkSeq.current;
    const { authGraceUntil } = useSessionStore.getState();
    if (Date.now() < authGraceUntil) {
      setLoading(false);
      return;
    }

    try {
      const data = await authApi.me();
      if (seq !== checkSeq.current) return;

      if (!isAdminRole(data.role)) {
        setUser(null);
        return;
      }
      setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
    } catch {
      if (seq !== checkSeq.current) return;
      const state = useSessionStore.getState();
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

export function useAdminLogout() {
  const { logout } = useSessionStore();
  return async () => {
    try {
      await authApi.logout();
    } catch {
      // still clear local state
    }
    logout();
  };
}
