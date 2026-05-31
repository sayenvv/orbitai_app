"use client";

import { useCallback, useEffect } from "react";

import {
  useChatSideRailStore,
  type ChatSideRailSide,
} from "@/store/chat-side-rail-store";

export function useChatSideRail(side: ChatSideRailSide = "right") {
  const open = useChatSideRailStore((s) => (side === "left" ? s.leftOpen : s.rightOpen));
  const hydrated = useChatSideRailStore((s) => s.hydrated);
  const hydrate = useChatSideRailStore((s) => s.hydrate);
  const expandForNewChat = useChatSideRailStore((s) => s.expandForNewChat);

  const toggle = useCallback(() => {
    useChatSideRailStore.getState().toggle(side);
  }, [side]);

  const setOpen = useCallback(
    (next: boolean) => {
      useChatSideRailStore.getState().setOpen(side, next);
    },
    [side],
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return { open, hydrated, toggle, setOpen, expandForNewChat };
}
