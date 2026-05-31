import { create } from "zustand";

const STORAGE_KEY = "clovai-nav-rail-open";

type NavRailState = {
  open: boolean;
  hydrated: boolean;
  hydrate: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  expand: () => void;
};

function persistOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(open));
  } catch {
    // ignore
  }
}

export const useNavRailStore = create<NavRailState>((set) => ({
  open: true,
  hydrated: false,
  hydrate: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        set({ open: stored === "true", hydrated: true });
        return;
      }
    } catch {
      // ignore
    }
    set({ hydrated: true });
  },
  toggle: () =>
    set((state) => {
      const next = !state.open;
      persistOpen(next);
      return { open: next };
    }),
  setOpen: (open) => {
    persistOpen(open);
    set({ open });
  },
  expand: () => {
    persistOpen(true);
    set({ open: true });
  },
}));

export function expandNavRail() {
  useNavRailStore.getState().expand();
}
