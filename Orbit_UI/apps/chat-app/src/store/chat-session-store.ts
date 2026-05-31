import { create } from "zustand";

import type { StudySource } from "@/types";

export type PendingChatLaunch = {
  agentSlug?: string;
  prompt?: string;
  sendKey?: string;
  source?: StudySource | null;
};

type ChatSessionState = {
  pending: PendingChatLaunch | null;
  draftAgentSlug: string | null;
  launchSeq: number;
  invalidChatNoticeOpen: boolean;
  setPendingAgent: (agentSlug: string) => void;
  setPendingLaunch: (launch: PendingChatLaunch) => void;
  consumePending: () => PendingChatLaunch | null;
  clearPending: () => void;
  setDraftAgentSlug: (agentSlug: string | null) => void;
  showInvalidChatNotice: () => void;
  dismissInvalidChatNotice: () => void;
};

export const useChatSessionStore = create<ChatSessionState>((set, get) => ({
  pending: null,
  draftAgentSlug: null,
  launchSeq: 0,
  invalidChatNoticeOpen: false,
  setPendingAgent: (agentSlug) =>
    set((state) => ({
      pending: { agentSlug },
      draftAgentSlug: agentSlug,
      launchSeq: state.launchSeq + 1,
    })),
  setPendingLaunch: (launch) =>
    set((state) => ({
      pending: launch,
      draftAgentSlug: launch.agentSlug ?? null,
      launchSeq: state.launchSeq + 1,
    })),
  consumePending: () => {
    const pending = get().pending;
    if (!pending) return null;
    set({ pending: null });
    return pending;
  },
  clearPending: () => set({ pending: null, draftAgentSlug: null }),
  setDraftAgentSlug: (agentSlug) => set({ draftAgentSlug: agentSlug }),
  showInvalidChatNotice: () => set({ invalidChatNoticeOpen: true }),
  dismissInvalidChatNotice: () => set({ invalidChatNoticeOpen: false }),
}));
