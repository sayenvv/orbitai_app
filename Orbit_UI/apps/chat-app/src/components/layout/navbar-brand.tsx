"use client";

import Link from "next/link";
import { BrandMark, BRAND_NAME, type BrandMarkSize } from "@orbit/ui";
import { cn } from "@/lib/utils";

type NavbarBrandProps = {
  size?: BrandMarkSize;
  showText?: boolean;
  className?: string;
};

export function NavbarBrand({ size = "sm", showText = true, className }: NavbarBrandProps) {
  return (
    <Link
      href="/"
      className={cn(
        "shrink-0 rounded-lg transition-transform hover:-translate-y-0.5",
        className,
      )}
      aria-label={`${BRAND_NAME} home`}
    >
      <BrandMark size={size} showText={showText} />
    </Link>
  );
}
