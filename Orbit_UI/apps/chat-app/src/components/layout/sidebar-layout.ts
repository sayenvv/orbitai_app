import { cn } from "@/lib/utils";

/** Horizontal padding for sidebar sections (nav, recents, footer). */
export const SIDEBAR_PADDING_X = "px-3";

/** Tighter inset so nav tabs span more of the sidebar width. */
export const SIDEBAR_NAV_PADDING_X = "px-1.5";

/** Inner row inset so icon slots line up with the brand row. */
export const SIDEBAR_ROW_INSET_X = "px-2";

/** Fixed icon column shared by brand mark and nav icons. */
export const SIDEBAR_ICON_SLOT_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center";

export function sidebarRowClassName(className?: string) {
  return cn(
    "flex min-w-0 items-center gap-2.5 rounded-lg py-1",
    SIDEBAR_ROW_INSET_X,
    className,
  );
}

/** Main nav tabs — matches workspace active tab, modest radius */
export const SIDEBAR_NAV_RADIUS = "rounded-lg";

export function sidebarNavRowClassName(className?: string) {
  return cn(
    "sidebar-nav-item flex min-w-0 w-full items-center gap-2.5 px-3 py-0.5",
    SIDEBAR_NAV_RADIUS,
    className,
  );
}

/** Collapsed rail: center icon slots in the narrow column. */
export const SIDEBAR_COLLAPSED_COLUMN_CLASS = "flex w-full flex-col items-center";

/** Brand logo size inside the shared icon slot. */
export const SIDEBAR_BRAND_LOGO_SIZE = 24;

/** Nav glyph size inside the shared icon slot. */
export const SIDEBAR_NAV_GLYPH_CLASS = "h-5 w-5 shrink-0";
