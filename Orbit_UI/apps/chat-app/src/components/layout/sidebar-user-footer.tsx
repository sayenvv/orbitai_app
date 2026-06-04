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
        "flex aspect-square shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary via-violet-500 to-pink-500 font-bold uppercase leading-none text-white shadow-[0_2px_12px_-2px_rgba(99,102,241,0.45)]",
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
              "rounded-lg bg-gradient-to-br from-slate-500/15 to-slate-500/5 text-muted-foreground transition-colors hover:from-primary/15 hover:to-violet-500/10 hover:text-primary",
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
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-1.5 text-left transition-colors hover:bg-sidebar-accent/80"
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500/15 to-slate-500/5 text-muted-foreground transition-colors hover:from-primary/15 hover:to-violet-500/10 hover:text-primary"
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </SidebarTooltip>
      </div>
    </div>
  );
}
