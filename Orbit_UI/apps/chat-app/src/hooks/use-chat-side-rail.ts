"use client";

import { useEffect } from "react";

import { useChatSideRailStore } from "@/store/chat-side-rail-store";

export function useChatSideRail() {
  const open = useChatSideRailStore((s) => s.open);
  const hydrated = useChatSideRailStore((s) => s.hydrated);
  const hydrate = useChatSideRailStore((s) => s.hydrate);
  const toggle = useChatSideRailStore((s) => s.toggle);
  const setOpen = useChatSideRailStore((s) => s.setOpen);
  const expandForNewChat = useChatSideRailStore((s) => s.expandForNewChat);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return { open, hydrated, toggle, setOpen, expandForNewChat };
}
