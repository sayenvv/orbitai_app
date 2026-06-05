"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ApiUser } from "@orbit/api";
import type { OperatorSessionState } from "./operator-session-store";

type AuthApi = {
  me: () => Promise<ApiUser>;
  logout: () => Promise<{ ok: boolean }>;
};

type UseOperatorSessionOptions = {
  store: {
    getState: () => OperatorSessionState;
    (): OperatorSessionState;
    <T>(selector: (state: OperatorSessionState) => T): T;
  };
  authApi: AuthApi;
  roleGuard: (role: string) => boolean;
  onAuthenticated?: (user: ApiUser) => void;
  onLogout?: () => void;
};

export function useOperatorSession({
  store,
  authApi,
  roleGuard,
  onAuthenticated,
  onLogout,
}: UseOperatorSessionOptions) {
  const setUser = store((state) => state.setUser);
  const setLoading = store((state) => state.setLoading);
  const checkSeq = useRef(0);

  const checkAuth = useCallback(async () => {
    const seq = ++checkSeq.current;
    const { authGraceUntil } = store.getState();
    if (Date.now() < authGraceUntil) {
      setLoading(false);
      return;
    }

    try {
      const data = await authApi.me();
      if (seq !== checkSeq.current) return;

      if (!roleGuard(data.role)) {
        setUser(null);
        return;
      }

      setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
      onAuthenticated?.(data);
    } catch {
      if (seq !== checkSeq.current) return;
      const state = store.getState();
      if (Date.now() < state.authGraceUntil) return;
      if (state.isAuthenticated) return;
      setUser(null);
    }
  }, [authApi, onAuthenticated, roleGuard, setLoading, setUser, store]);

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

  return checkAuth;
}

export function useOperatorLogout({
  store,
  authApi,
  onLogout,
}: {
  store: { getState: () => OperatorSessionState };
  authApi: AuthApi;
  onLogout?: () => void;
}) {
  return async () => {
    try {
      await authApi.logout();
    } catch {
      // still clear local state
    }
    onLogout?.();
    store.getState().logout();
  };
}
