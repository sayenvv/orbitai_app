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

/** Semantic typography helpers */
export const studioTypography = {
  display: "text-ds-display",
  h1: "text-ds-h1",
  h2: "text-ds-h2",
  h3: "text-ds-h3",
  title: "text-ds-title",
  subtitle: "text-ds-subtitle",
  body: "text-ds-body",
  caption: "text-ds-caption",
  label: "text-ds-label",
  code: "text-ds-code",
} as const;

export function studioInput(className?: string) {
  return cn("premium-input", className);
}

export function studioSelect(className?: string) {
  return cn("premium-input premium-select", className);
}
