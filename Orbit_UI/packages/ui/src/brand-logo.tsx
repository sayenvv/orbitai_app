import { cn } from "./lib/cn";

export const BRAND_NAME = "Clovai";
export const BRAND_WORDMARK = "Clovai";
export const BRAND_ICON = "/ceorai-icon.png";

export type BrandMarkSize = "sm" | "md" | "lg";

const MARK_SIZES: Record<
  BrandMarkSize,
  { icon: number; text: string; gap: string }
> = {
  sm: {
    icon: 26,
    text: "text-[15px] font-semibold leading-none tracking-[-0.01em]",
    gap: "gap-2",
  },
  md: {
    icon: 30,
    text: "text-[17px] font-semibold leading-none tracking-[-0.01em]",
    gap: "gap-2.5",
  },
  lg: {
    icon: 36,
    text: "text-[21px] font-semibold leading-none tracking-[-0.02em]",
    gap: "gap-3",
  },
};

type BrandLogoProps = {
  size?: number;
  className?: string;
  alt?: string;
};

export function BrandLogo({ size = 30, className, alt = BRAND_NAME }: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_ICON}
      alt={alt}
      width={size}
      height={size}
      className={cn("block shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      decoding="async"
    />
  );
}

type BrandMarkProps = {
  size?: BrandMarkSize;
  showText?: boolean;
  layout?: "inline" | "stacked";
  className?: string;
  iconClassName?: string;
  textClassName?: string;
};

export function BrandMark({
  size = "md",
  showText = true,
  layout = "inline",
  className,
  iconClassName,
  textClassName,
}: BrandMarkProps) {
  const config = MARK_SIZES[size];
  const stacked = layout === "stacked";

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center",
        stacked ? "flex-col gap-2.5" : config.gap,
        className,
      )}
    >
      <BrandLogo size={config.icon} className={iconClassName} />
      {showText && (
        <span
          className={cn(
            "truncate text-foreground antialiased",
            config.text,
            stacked && "translate-x-0",
            !stacked && "translate-y-[0.5px]",
            textClassName,
          )}
        >
          {BRAND_WORDMARK}
        </span>
      )}
    </span>
  );
}
