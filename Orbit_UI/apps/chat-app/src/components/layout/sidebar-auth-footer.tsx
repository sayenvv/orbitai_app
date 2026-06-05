"use client";

import { LogIn } from "lucide-react";
import { BRAND_NAME } from "@orbit/ui";
import { SidebarTooltip } from "@/components/layout/sidebar-tooltip";
import {
  SIDEBAR_COLLAPSED_COLUMN_CLASS,
  SIDEBAR_ICON_SLOT_CLASS,
  SIDEBAR_NAV_GLYPH_CLASS,
  SIDEBAR_PADDING_X,
} from "@/components/layout/sidebar-layout";
import { cn } from "@/lib/utils";

type SidebarAuthFooterProps = {
  expanded: boolean;
  labelClassName?: string;
  onSignIn: () => void;
  onSignUp: () => void;
};

export function SidebarAuthFooter({
  expanded,
  labelClassName,
  onSignIn,
  onSignUp,
}: SidebarAuthFooterProps) {
  if (!expanded) {
    return (
      <div className={cn(SIDEBAR_COLLAPSED_COLUMN_CLASS, "mt-auto shrink-0 gap-1.5 py-2.5")}>
        <SidebarTooltip label="Sign in" hint={`Save your work on ${BRAND_NAME}`} side="right">
          <button
            type="button"
            onClick={onSignIn}
            aria-label="Sign in"
            className={cn(
              SIDEBAR_ICON_SLOT_CLASS,
              "auth-nav-sign-up rounded-xl transition-all",
            )}
          >
            <LogIn className={cn(SIDEBAR_NAV_GLYPH_CLASS, "text-current")} strokeWidth={1.75} />
          </button>
        </SidebarTooltip>
      </div>
    );
  }

  return (
    <div className={cn("mt-auto shrink-0 py-2.5", SIDEBAR_PADDING_X)}>
      <div className="workspace-tab-surface rounded-2xl p-3.5">
        <p className={cn("text-[13px] font-semibold leading-snug text-foreground", labelClassName)}>
          Save your workspace
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Sign in to {BRAND_NAME} to keep chats, library, and apps in sync.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={onSignUp}
            className="auth-nav-sign-up w-full rounded-full px-4 py-2 text-[13px] font-medium transition-all"
          >
            Sign up free
          </button>
          <button
            type="button"
            onClick={onSignIn}
            className="auth-nav-sign-in w-full rounded-full px-4 py-2 text-[13px] font-medium transition-all"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
