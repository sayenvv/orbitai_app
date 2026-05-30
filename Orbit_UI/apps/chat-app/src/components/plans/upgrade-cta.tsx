import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const premiumCtaClass =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.58_0.20_330)] px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 shimmer press";

type UpgradeCtaProps = {
  className?: string;
  fullWidth?: boolean;
  label?: string;
};

export function UpgradeCtaLink({
  href,
  className,
  fullWidth,
  label = "Upgrade",
}: UpgradeCtaProps & { href: string }) {
  return (
    <Link href={href} className={cn(premiumCtaClass, fullWidth && "w-full", className)}>
      {label}
      <ArrowUpRight className="h-3.5 w-3.5 opacity-90" />
    </Link>
  );
}

export function UpgradeCtaButton({
  onClick,
  className,
  fullWidth,
  label = "Upgrade plan",
}: UpgradeCtaProps & { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(premiumCtaClass, fullWidth && "w-full", className)}
    >
      {label}
      <ArrowUpRight className="h-3.5 w-3.5 opacity-90" />
    </button>
  );
}

export function UpgradeCtaAnchor({
  href,
  className,
  fullWidth,
  label = "Get started",
}: UpgradeCtaProps & { href: string }) {
  return (
    <a href={href} className={cn(premiumCtaClass, fullWidth && "w-full", className)}>
      {label}
      <ArrowUpRight className="h-3.5 w-3.5 opacity-90" />
    </a>
  );
}

export function NavbarUpgradeLink({ className }: { className?: string }) {
  return (
    <Link
      href="/plans"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-gradient-to-r from-primary/12 to-[oklch(0.58_0.20_330/0.08)] px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm shadow-primary/5 transition-all hover:border-primary/35 hover:from-primary/18 hover:to-[oklch(0.58_0.20_330/0.12)] hover:shadow-md hover:shadow-primary/10 press",
        className,
      )}
    >
      Upgrade
      <ArrowUpRight className="h-3.5 w-3.5 opacity-75" />
    </Link>
  );
}
