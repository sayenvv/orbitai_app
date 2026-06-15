import { cn } from "@/lib/utils";

/** Shared corner radius for Studio shell buttons and panels (matches rounded-sm). */
export const studioRadius = "rounded-sm";

export function studioButtonPrimary(className?: string) {
  return cn(
    studioRadius,
    "inline-flex items-center justify-center gap-1.5 font-medium transition-colors",
    "bg-primary text-primary-foreground hover:bg-primary/90",
    "disabled:cursor-not-allowed disabled:opacity-50",
    className,
  );
}

export function studioButtonSecondary(className?: string) {
  return cn(
    studioRadius,
    "inline-flex items-center justify-center font-medium transition-colors",
    "border border-border text-foreground hover:bg-muted/50",
    "disabled:cursor-not-allowed disabled:opacity-50",
    className,
  );
}
