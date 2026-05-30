import { create } from "zustand";

import type { ApiTokenUsage } from "@/lib/orbit-api";

interface UsageState {
  usage: ApiTokenUsage | null;
  loading: boolean;
  setUsage: (usage: ApiTokenUsage | null) => void;
  setLoading: (loading: boolean) => void;
  clearUsage: () => void;
}

export const useUsageStore = create<UsageState>((set) => ({
  usage: null,
  loading: false,
  setUsage: (usage) => set({ usage }),
  setLoading: (loading) => set({ loading }),
  clearUsage: () => set({ usage: null, loading: false }),
}));
