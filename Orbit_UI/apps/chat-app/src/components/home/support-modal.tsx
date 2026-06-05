"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  BookOpen,
  HelpCircle,
  Mail,
  MessageCircle,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { ThemeSelect } from "@/components/theme-toggle";
import { SidebarTooltip } from "@/components/layout/sidebar-tooltip";
import { cn } from "@/lib/utils";

export type SupportTab = "settings" | "help";

type SupportModalProps = {
  open: boolean;
  tab: SupportTab;
  onClose: () => void;
  onTabChange: (tab: SupportTab) => void;
  isAuthenticated?: boolean;
  onSignOut?: () => void;
};

export function SupportModal({
  open,
  tab,
  onClose,
  onTabChange,
  isAuthenticated,
  onSignOut,
}: SupportModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const tabs: { id: SupportTab; label: string; icon: typeof Settings }[] = [
    { id: "settings", label: "Settings", icon: Settings },
    { id: "help", label: "Help", icon: HelpCircle },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 safe-x">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings & Help"
        className="glass-surface glass-composer glass-modal relative z-10 flex max-h-[min(85dvh,540px)] w-full max-w-md flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-[color:var(--workspace-tab-border)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Settings & Help</p>
            <div className="mt-1.5 flex gap-1 rounded-lg bg-muted/60 p-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                    tab === id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "settings" ? (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Appearance
                </p>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 p-3">
                  <div>
                    <p className="text-sm font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">Light, dark, or system</p>
                  </div>
                  <ThemeSelect />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Preferences
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 p-3">
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Notifications</p>
                        <p className="text-xs text-muted-foreground">Email and in-app alerts</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">Soon</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 p-3">
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Privacy</p>
                        <p className="text-xs text-muted-foreground">Data and account security</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">Soon</span>
                  </div>
                </div>
              </div>

              {isAuthenticated && onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    onSignOut();
                    onClose();
                  }}
                  className="w-full rounded-xl border border-destructive/30 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  Sign out
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Support
                </p>
                <div className="space-y-2">
                  {[
                    {
                      icon: BookOpen,
                      title: "Getting started",
                      desc: "Learn how to use assistants and library",
                    },
                    {
                      icon: MessageCircle,
                      title: "FAQs",
                      desc: "Common questions about plans and features",
                    },
                    {
                      icon: Mail,
                      title: "Contact support",
                      desc: "support@clovai.app",
                    },
                  ].map(({ icon: Icon, title, desc }) => (
                    <button
                      key={title}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/80 p-3 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <p className="text-sm font-medium">{title}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
                <p className="text-xs font-medium text-foreground">Clovai Chat</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Version 0.1.0 · May 2026</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

type SettingsHelpFooterTabProps = {
  collapsed?: boolean;
  showTopBorder?: boolean;
  labelClassName?: string;
  onOpen: () => void;
};

export function SettingsHelpFooterTab({
  collapsed = false,
  showTopBorder = true,
  labelClassName = "",
  onOpen,
}: SettingsHelpFooterTabProps) {
  return (
    <div
      className={cn(
        "mt-auto w-full shrink-0",
        collapsed && "flex justify-center",
        showTopBorder && "px-2 py-2.5",
        !collapsed && !showTopBorder && "px-2 pb-2",
      )}
    >
      <SidebarTooltip label="Settings & Help" side={collapsed ? "right" : "top"}>
        <button
          type="button"
          onClick={onOpen}
          aria-label="Settings & Help"
          className={cn(
            "flex items-center text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground",
            collapsed
              ? "h-9 w-9 shrink-0 justify-center rounded-xl bg-[var(--workspace-tab-inactive-bg-hover)]"
              : "h-9 w-full gap-2.5 rounded-xl px-2.5 justify-start",
          )}
        >
          <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {!collapsed && (
            <span className={cn("truncate text-[13px] font-medium", labelClassName)}>
              Settings & Help
            </span>
          )}
        </button>
      </SidebarTooltip>
    </div>
  );
}
