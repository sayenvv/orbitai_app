"use client";

import { create } from "zustand";
import type { Role } from "@/lib/rbac";

type AuthState = {
  role: Role;
  hydrated: boolean;
  setRole: (role: Role) => void;
  setHydrated: (v: boolean) => void;
  resetRole: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  role: "viewer",
  hydrated: true,
  setRole: (role) => set({ role }),
  setHydrated: (v) => set({ hydrated: v }),
  resetRole: () => set({ role: "viewer" }),
}));
