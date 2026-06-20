import { cn } from "@/lib/utils";

/** Shared corner radius for Studio shell buttons and panels */
export const studioRadius = "rounded-xl";

export function studioButtonPrimary(className?: string) {
  return cn(
    "premium-btn premium-btn-primary",
    studioRadius,
    "inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium",
    className,
  );
}

export function studioButtonSecondary(className?: string) {
  return cn(
    "premium-btn premium-btn-secondary",
    studioRadius,
    "inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium",
    className,
  );
}
