"use client";

import Link from "next/link";
import { BRAND_NAME, BRAND_WORDMARK, BrandLogo } from "@orbit/ui";

import {
  SIDEBAR_BRAND_LOGO_SIZE,
  SIDEBAR_ICON_SLOT_CLASS,
  sidebarRowClassName,
} from "@/components/layout/sidebar-layout";
import { cn } from "@/lib/utils";

type SidebarBrandProps = {
  showText?: boolean;
  className?: string;
  /** When set and collapsed, click expands the sidebar instead of navigating home */
  onExpand?: () => void;
};

export function SidebarBrand({ showText = true, className, onExpand }: SidebarBrandProps) {
  const logo = (
    <span className={SIDEBAR_ICON_SLOT_CLASS}>
      <BrandLogo size={SIDEBAR_BRAND_LOGO_SIZE} />
    </span>
  );

  const wordmark = (
    <span
      className={cn(
        "overflow-hidden whitespace-nowrap bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-[15px] font-semibold leading-none tracking-tight text-transparent transition-[max-width,opacity] duration-150 ease-out",
        showText ? "max-w-[8rem] opacity-100" : "max-w-0 opacity-0",
      )}
      aria-hidden={!showText}
    >
      {BRAND_WORDMARK}
    </span>
  );

  if (!showText && onExpand) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className={cn(
          SIDEBAR_ICON_SLOT_CLASS,
          "rounded-lg transition-colors hover:bg-sidebar-accent/60",
          className,
        )}
        aria-label={`Expand ${BRAND_NAME} sidebar`}
      >
        <BrandLogo size={SIDEBAR_BRAND_LOGO_SIZE} />
      </button>
    );
  }

  return (
    <Link
      href="/"
      className={cn(sidebarRowClassName(), className)}
      aria-label={`${BRAND_NAME} home`}
    >
      {logo}
      {wordmark}
    </Link>
  );
}
