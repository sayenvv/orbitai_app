import { create } from "zustand";

const STORAGE_KEY = "orbit-chat-side-rail-open";

type ChatSideRailState = {
  open: boolean;
  hydrated: boolean;
  hydrate: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  expandForNewChat: () => void;
};

function persistOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(open));
  } catch {
    // ignore
  }
}

export const useChatSideRailStore = create<ChatSideRailState>((set) => ({
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
  expandForNewChat: () => {
    persistOpen(true);
    set({ open: true });
  },
}));

export function expandChatSideRail() {
  useChatSideRailStore.getState().expandForNewChat();
}
