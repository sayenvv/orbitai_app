import { create } from "zustand";

export type ChatSideRailSide = "left" | "right";

const STORAGE_KEYS: Record<ChatSideRailSide, string> = {
  right: "orbit-chat-side-rail-open",
  left: "clovai-chat-side-rail-left-open",
};

type ChatSideRailState = {
  leftOpen: boolean;
  rightOpen: boolean;
  hydrated: boolean;
  hydrate: () => void;
  toggle: (side: ChatSideRailSide) => void;
  setOpen: (side: ChatSideRailSide, open: boolean) => void;
  expandForNewChat: () => void;
};

function readStoredOpen(side: ChatSideRailSide): boolean | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS[side]);
    if (stored !== null) return stored === "true";
  } catch {
    // ignore
  }
  return null;
}

function persistOpen(side: ChatSideRailSide, open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEYS[side], String(open));
  } catch {
    // ignore
  }
}

export const useChatSideRailStore = create<ChatSideRailState>((set) => ({
  leftOpen: false,
  rightOpen: true,
  hydrated: false,
  hydrate: () => {
    const leftStored = readStoredOpen("left");
    const rightStored = readStoredOpen("right");
    set({
      leftOpen: leftStored ?? false,
      rightOpen: rightStored ?? true,
      hydrated: true,
    });
  },
  toggle: (side) =>
    set((state) => {
      const key = side === "left" ? "leftOpen" : "rightOpen";
      const next = !state[key];
      persistOpen(side, next);
      return { [key]: next };
    }),
  setOpen: (side, open) => {
    persistOpen(side, open);
    set(side === "left" ? { leftOpen: open } : { rightOpen: open });
  },
  expandForNewChat: () => {
    persistOpen("left", true);
    persistOpen("right", true);
    set({ leftOpen: true, rightOpen: true });
  },
}));

export function expandChatSideRail() {
  useChatSideRailStore.getState().expandForNewChat();
}
