"use client";

import { Settings } from "lucide-react";
import { SidebarTooltip } from "@/components/layout/sidebar-tooltip";
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
  const text = size === "md" ? "text-[11px]" : "text-[10px]";

  return (
    <div
      className={cn(
        "shrink-0 rounded-full bg-gradient-to-br from-primary via-violet-500 to-pink-500 p-[2px] shadow-[0_2px_12px_-2px_rgba(99,102,241,0.45)]",
        dim,
      )}
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-sidebar">
        <span
          className={cn(
            "bg-gradient-to-br from-primary to-violet-500 bg-clip-text font-bold text-transparent",
            text,
          )}
        >
          {initials}
        </span>
      </div>
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
      <div className="mt-auto flex shrink-0 flex-col items-center gap-1.5 px-2 py-2.5">
        <SidebarTooltip label={name} hint={subtitle} side="right">
          <button
            type="button"
            onClick={onProfile}
            aria-label={`Open profile for ${name}`}
            className="rounded-full transition-transform hover:scale-105 active:scale-95"
          >
            <ProfileAvatar initials={initials} size="sm" />
          </button>
        </SidebarTooltip>
        <SidebarTooltip label="Settings & Help" side="right">
          <button
            type="button"
            onClick={onSettings}
            aria-label="Settings & Help"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500/15 to-slate-500/5 text-muted-foreground transition-colors hover:from-primary/15 hover:to-violet-500/10 hover:text-primary"
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </SidebarTooltip>
      </div>
    );
  }

  return (
    <div className="mt-auto shrink-0 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <SidebarTooltip label={name} hint={subtitle} side="top" disabled>
          <button
            type="button"
            onClick={onProfile}
            aria-label={`Open profile for ${name}`}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-sidebar-accent/80"
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
