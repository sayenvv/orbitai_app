"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { BrandMark } from "@orbit/ui";
import { X } from "lucide-react";

import { AppSidebarContent } from "@/components/layout/app-sidebar-content";
import { useAppShell } from "@/components/layout/app-shell-context";
import { cn } from "@/lib/utils";

export function MobileAppDrawer() {
  const pathname = usePathname();
  const { mobileDrawerOpen, setMobileDrawerOpen } = useAppShell();
  const [mounted, setMounted] = useState(false);
  const [present, setPresent] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname, setMobileDrawerOpen]);

  useEffect(() => {
    if (mobileDrawerOpen) {
      setPresent(true);
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setOpen(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setOpen(false);
    const timer = window.setTimeout(() => setPresent(false), 280);
    return () => window.clearTimeout(timer);
  }, [mobileDrawerOpen]);

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [present, setMobileDrawerOpen]);

  if (!mounted || !present) return null;

  const close = () => setMobileDrawerOpen(false);

  return createPortal(
    <div className="fixed inset-0 z-[60] md:hidden" role="presentation">
      <button
        type="button"
        aria-label="Close menu"
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={close}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-sidebar shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] safe-top safe-bottom",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between px-4 py-3.5">
          <div className="min-w-0">
            <BrandMark size="sm" />
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/70 text-foreground transition-colors hover:bg-muted"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <AppSidebarContent
            expanded
            variant="drawer"
            className="px-3 pb-4"
            onNavigate={close}
          />
        </div>
      </aside>
    </div>,
    document.body,
  );
}
