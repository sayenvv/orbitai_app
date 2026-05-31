"use client";

import { BrandMark } from "@orbit/ui";
import { X } from "lucide-react";

import { AppSidebarContent } from "@/components/layout/app-sidebar-content";
import { useAppShell } from "@/components/layout/app-shell-context";

export function MobileAppDrawer() {
  const { mobileDrawerOpen, setMobileDrawerOpen } = useAppShell();

  if (!mobileDrawerOpen) return null;

  const close = () => setMobileDrawerOpen(false);

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <button
        type="button"
        aria-label="Close sidebar"
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={close}
      />
      <aside className="relative z-10 flex h-full w-80 max-w-[88vw] flex-col bg-sidebar shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
          <div>
            <BrandMark size="sm" />
            <p className="mt-0.5 text-[11px] text-muted-foreground">Navigation</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/70 text-foreground hover:bg-muted"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <AppSidebarContent expanded className="px-3" />
      </aside>
    </div>
  );
}
