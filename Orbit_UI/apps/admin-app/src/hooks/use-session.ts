"use client";

import { useOperatorLogout, useOperatorSession } from "@orbit/auth";
import { authApi, isAdminRole } from "@/lib/orbit-api";
import { mapBackendRoleToDemoRole } from "@/lib/map-backend-role";
import { useSessionStore } from "@/store/session-store";
import { useAuthStore } from "@/store/auth-store";

export function useAdminSession() {
  return useOperatorSession({
    store: useSessionStore,
    authApi,
    roleGuard: isAdminRole,
    onAuthenticated: (user) => {
      useAuthStore.getState().setRole(mapBackendRoleToDemoRole(user.role));
    },
  });
}

export function useAdminLogout() {
  return useOperatorLogout({
    store: useSessionStore,
    authApi,
    onLogout: () => useAuthStore.getState().resetRole(),
  });
}
