"use client";

import { useEffect } from "react";

import { useAppSidebarStore } from "@/store/app-sidebar-store";

export function useAppSidebar() {
  const open = useAppSidebarStore((s) => s.open);
  const hydrated = useAppSidebarStore((s) => s.hydrated);
  const hydrate = useAppSidebarStore((s) => s.hydrate);
  const toggle = useAppSidebarStore((s) => s.toggle);
  const setOpen = useAppSidebarStore((s) => s.setOpen);
  const expand = useAppSidebarStore((s) => s.expand);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return { open, hydrated, toggle, setOpen, expand };
}
