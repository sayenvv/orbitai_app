"use client";

import { useEffect } from "react";

import { useNavRailStore } from "@/store/nav-rail-store";

export function useNavRail() {
  const open = useNavRailStore((s) => s.open);
  const hydrated = useNavRailStore((s) => s.hydrated);
  const hydrate = useNavRailStore((s) => s.hydrate);
  const toggle = useNavRailStore((s) => s.toggle);
  const setOpen = useNavRailStore((s) => s.setOpen);
  const expand = useNavRailStore((s) => s.expand);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return { open, hydrated, toggle, setOpen, expand };
}
