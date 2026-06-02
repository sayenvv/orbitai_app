"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SidebarTooltipProps = {
  label: string;
  hint?: string;
  side?: "right" | "top";
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function SidebarTooltip({
  label,
  hint,
  side = "right",
  children,
  className,
  disabled = false,
}: SidebarTooltipProps) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div className={cn("group/sidebar-tip relative", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-[200] min-w-[7rem] max-w-[14rem] rounded-xl border border-primary/20 bg-popover/95 px-3 py-2 opacity-0 shadow-[0_8px_24px_-8px_rgba(59,130,246,0.35)] backdrop-blur-md transition-all duration-150",
          side === "right" &&
            "left-[calc(100%+0.625rem)] top-1/2 -translate-y-1/2 translate-x-1 group-hover/sidebar-tip:translate-x-0 group-hover/sidebar-tip:opacity-100 group-focus-within/sidebar-tip:translate-x-0 group-focus-within/sidebar-tip:opacity-100",
          side === "top" &&
            "bottom-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 translate-y-1 group-hover/sidebar-tip:translate-y-0 group-hover/sidebar-tip:opacity-100 group-focus-within/sidebar-tip:translate-y-0 group-focus-within/sidebar-tip:opacity-100",
        )}
      >
        <span className="block truncate text-xs font-semibold text-foreground">{label}</span>
        {hint && (
          <span className="mt-0.5 block truncate text-[10px] font-normal text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
    </div>
  );
}
