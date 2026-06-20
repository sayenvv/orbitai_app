"use client";

import { Settings } from "lucide-react";
import { SidebarTooltip } from "@/components/layout/sidebar-tooltip";
import {
  SIDEBAR_COLLAPSED_COLUMN_CLASS,
  SIDEBAR_ICON_SLOT_CLASS,
  SIDEBAR_NAV_GLYPH_CLASS,
  SIDEBAR_PADDING_X,
  sidebarRowClassName,
} from "@/components/layout/sidebar-layout";
import { cn } from "@/lib/utils";

type SidebarUserFooterProps = {
  expanded: boolean;
  name: string;
  initials: string;
  subtitle?: string;
  labelClassName?: string;
  onProfile: () => void;
  onSettings: () => void;
};

function ProfileAvatar({ initials, size = "md" }: { initials: string; size?: "md" | "sm" }) {
  const dim = size === "md" ? "h-9 w-9" : "h-8 w-8";
  const text = size === "md" ? "text-xs" : "text-[11px]";

  return (
    <div
      className={cn(
        "flex aspect-square shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--workspace-tab-active-bg)] to-[color-mix(in_oklab,var(--workspace-tab-active-bg)_68%,var(--foreground)_32%)] font-bold uppercase leading-none text-[var(--workspace-tab-active-fg)] shadow-[var(--workspace-tab-active-shadow)] ring-1 ring-[var(--workspace-tab-border)]",
        dim,
        text,
      )}
    >
      {initials}
    </div>
  );
}

export function SidebarUserFooter({
  expanded,
  name,
  initials,
  subtitle,
  labelClassName,
  onProfile,
  onSettings,
}: SidebarUserFooterProps) {
  if (!expanded) {
    return (
      <div className={cn(SIDEBAR_COLLAPSED_COLUMN_CLASS, "mt-auto shrink-0 gap-1.5 py-2.5")}>
        <SidebarTooltip label={name} hint={subtitle} side="right">
          <button
            type="button"
            onClick={onProfile}
            aria-label={`Open profile for ${name}`}
            className={cn(SIDEBAR_ICON_SLOT_CLASS, "rounded-full transition-transform hover:scale-105 active:scale-95")}
          >
            <ProfileAvatar initials={initials} size="sm" />
          </button>
        </SidebarTooltip>
        <SidebarTooltip label="Settings & Help" side="right">
          <button
            type="button"
            onClick={onSettings}
            aria-label="Settings & Help"
            className={cn(
              SIDEBAR_ICON_SLOT_CLASS,
              "rounded-lg bg-[var(--workspace-tab-inactive-bg-hover)] text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-active-bg)] hover:text-[var(--workspace-tab-active-fg)]",
            )}
          >
            <Settings className={SIDEBAR_NAV_GLYPH_CLASS} strokeWidth={1.75} />
          </button>
        </SidebarTooltip>
      </div>
    );
  }

  return (
    <div className={cn("mt-auto shrink-0 py-2.5", SIDEBAR_PADDING_X)}>
      <div className={sidebarRowClassName("gap-2")}>
        <SidebarTooltip label={name} hint={subtitle} side="top" disabled>
          <button
            type="button"
            onClick={onProfile}
            aria-label={`Open profile for ${name}`}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1.5 text-left transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)]"
          >
            <ProfileAvatar initials={initials} />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-[13px] font-semibold leading-tight", labelClassName)}>
                {name}
              </p>
              {subtitle && (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </button>
        </SidebarTooltip>
        <SidebarTooltip label="Settings & Help" side="top">
          <button
            type="button"
            onClick={onSettings}
            aria-label="Settings & Help"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--workspace-tab-inactive-bg-hover)] text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-active-bg)] hover:text-[var(--workspace-tab-active-fg)]"
          >
            <Settings className={SIDEBAR_NAV_GLYPH_CLASS} strokeWidth={1.75} />
          </button>
        </SidebarTooltip>
      </div>
    </div>
  );
}
