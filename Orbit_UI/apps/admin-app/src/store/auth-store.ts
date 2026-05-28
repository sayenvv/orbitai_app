"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/rbac";

type AuthState = {
  role: Role;
  hydrated: boolean;
  setRole: (role: Role) => void;
  setHydrated: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: "super_admin",
      hydrated: false,
      setRole: (role) => set({ role }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "orbit-admin-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
