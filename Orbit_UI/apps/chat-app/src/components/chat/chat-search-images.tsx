"use client";

import { ExternalLink } from "lucide-react";
import { memo, useState } from "react";
import type { WebSearchImage } from "@/types";
import { cn } from "@/lib/utils";

type ChatSearchImagesProps = {
  images: WebSearchImage[];
  className?: string;
  hideHeader?: boolean;
  layout?: "grid" | "list";
};

function imageSrc(image: WebSearchImage): string {
  return image.thumbnailUrl || image.imageUrl;
}

const SearchImageCard = memo(function SearchImageCard({
  image,
  layout,
}: {
  image: WebSearchImage;
  layout: "grid" | "list";
}) {
  const [failed, setFailed] = useState(false);
  const href = image.pageUrl || image.imageUrl;
  const label = image.title || image.alt || "Web image";

  if (failed) return null;

  if (layout === "list") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="results-glass-card glass-card results-glass-card-interactive group flex items-center gap-3 rounded-xl p-3"
        title={label}
      >
        <div className="glass-icon-well h-14 w-20 shrink-0 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc(image)}
            alt={image.alt || image.title || "Search result image"}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        </div>
        <span className="min-w-0 flex-1">
          <span className="block line-clamp-2 text-[12px] font-medium leading-snug text-foreground">{label}</span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">Open source page</span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:text-foreground" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="results-glass-card glass-card results-glass-card-interactive group relative overflow-hidden rounded-xl"
      title={label}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc(image)}
          alt={image.alt || image.title || "Search result image"}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          onError={() => setFailed(true)}
        />
      </div>
      <div className="flex items-start justify-between gap-2 px-2.5 py-2">
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{label}</p>
        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/70" />
      </div>
    </a>
  );
});

export const ChatSearchImages = memo(function ChatSearchImages({
  images,
  className,
  hideHeader = false,
  layout = "grid",
}: ChatSearchImagesProps) {
  const visible = images.filter((image) => image.imageUrl);
  if (!visible.length) return null;

  return (
    <div
      className={cn(
        layout === "list" ? "space-y-2" : hideHeader ? "space-y-2" : "mt-4 space-y-2",
        className,
      )}
    >
      {!hideHeader ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Images
        </p>
      ) : null}
      <div
        className={cn(
          layout === "list"
            ? "space-y-2"
            : "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3",
        )}
      >
        {visible.map((image, index) => (
          <SearchImageCard key={`${image.imageUrl}-${index}`} image={image} layout={layout} />
        ))}
      </div>
    </div>
  );
});
