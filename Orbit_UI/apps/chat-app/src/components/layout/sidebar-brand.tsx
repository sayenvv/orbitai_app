"use client";

import Link from "next/link";
import { BrandMark, BRAND_NAME, BRAND_WORDMARK } from "@orbit/ui";

import { cn } from "@/lib/utils";

type SidebarBrandProps = {
  showText?: boolean;
  className?: string;
  /** When set and collapsed, click expands the sidebar instead of navigating home */
  onExpand?: () => void;
};

export function SidebarBrand({ showText = true, className, onExpand }: SidebarBrandProps) {
  const content = (
    <>
      <BrandMark
        size="sm"
        showText={false}
        className={cn("shrink-0", showText && "ml-2")}
      />
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-[15px] font-semibold leading-none tracking-[-0.01em] text-transparent transition-[max-width,opacity,margin-left] duration-150 ease-out",
          showText ? "ml-2 max-w-[7rem] opacity-100" : "ml-0 max-w-0 opacity-0",
        )}
        aria-hidden={!showText}
      >
        {BRAND_WORDMARK}
      </span>
    </>
  );

  if (!showText && onExpand) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className={cn(
          "flex min-w-0 items-center overflow-hidden rounded-xl transition-colors hover:bg-sidebar-accent/60",
          className,
        )}
        aria-label={`Expand ${BRAND_NAME} sidebar`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href="/"
      className={cn("flex min-w-0 items-center overflow-hidden rounded-xl", className)}
      aria-label={`${BRAND_NAME} home`}
    >
      {content}
    </Link>
  );
}
