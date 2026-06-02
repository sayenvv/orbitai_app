import { cn } from "@/lib/utils";

/** Horizontal padding for sidebar sections (nav, recents, footer). */
export const SIDEBAR_PADDING_X = "px-3";

/** Inner row inset so icon slots line up with the brand row. */
export const SIDEBAR_ROW_INSET_X = "px-2";

/** Fixed 32px column shared by brand mark and nav icons. */
export const SIDEBAR_ICON_SLOT_CLASS =
  "flex h-8 w-8 shrink-0 items-center justify-center";

export function sidebarRowClassName(className?: string) {
  return cn(
    "flex min-w-0 items-center gap-2.5 rounded-lg py-1",
    SIDEBAR_ROW_INSET_X,
    className,
  );
}

/** Main nav tabs — tighter vertical padding than generic sidebar rows. */
export function sidebarNavRowClassName(className?: string) {
  return cn(
    "flex min-w-0 items-center gap-2.5 rounded-lg py-0.5",
    SIDEBAR_ROW_INSET_X,
    className,
  );
}

/** Collapsed rail: center icon slots in the narrow column. */
export const SIDEBAR_COLLAPSED_COLUMN_CLASS = "flex w-full flex-col items-center";

/** Brand logo size inside the shared icon slot. */
export const SIDEBAR_BRAND_LOGO_SIZE = 22;

/** Nav glyph size inside the shared icon slot. */
export const SIDEBAR_NAV_GLYPH_CLASS = "h-4 w-4 shrink-0";
