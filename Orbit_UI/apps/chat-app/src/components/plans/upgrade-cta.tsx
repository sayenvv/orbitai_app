import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const premiumCtaClass =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:scale-[1.02] hover:bg-primary/90 press";

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
        "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm transition-all hover:border-primary/35 hover:bg-primary/15 press",
        className,
      )}
    >
      Upgrade
      <ArrowUpRight className="h-3.5 w-3.5 opacity-75" />
    </Link>
  );
}
