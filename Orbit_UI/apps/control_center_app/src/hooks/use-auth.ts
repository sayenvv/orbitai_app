"use client";

import { useOperatorLogout, useOperatorSession } from "@orbit/auth";
import { authApi, isOperatorRole } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";

export function useCurrentUser() {
  return useOperatorSession({
    store: useAuthStore,
    authApi,
    roleGuard: isOperatorRole,
  });
}

export function useLogout() {
  return useOperatorLogout({
    store: useAuthStore,
    authApi,
  });
}
