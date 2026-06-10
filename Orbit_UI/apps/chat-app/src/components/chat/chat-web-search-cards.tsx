"use client";

import { ArrowUpRight, Globe } from "lucide-react";
import { memo, useState } from "react";
import type { AdaptiveCard } from "@/types";
import { proxiedMediaUrl } from "@/lib/media-proxy";
import { cn } from "@/lib/utils";

type ChatWebSearchCardsProps = {
  cards: AdaptiveCard[];
  className?: string;
  hideHeader?: boolean;
  layout?: "grid" | "list";
};

const CardImage = memo(function CardImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
  );
});

function resolveDomain(card: AdaptiveCard): string {
  if (card.source) return card.source;
  if (card.subtitle) return card.subtitle;
  try {
    if (card.url) return new URL(card.url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  return "Web";
}

const WebSearchCard = memo(function WebSearchCard({
  card,
  layout,
}: {
  card: AdaptiveCard;
  layout: "grid" | "list";
}) {
  const href = card.url || "#";
  const preview = proxiedMediaUrl(card.imageUrl || card.thumbnailUrl);
  const domain = resolveDomain(card);

  if (layout === "list") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="results-glass-card glass-card results-glass-card-interactive group/link flex items-start gap-3 rounded-xl p-3 transition-colors"
      >
        {preview ? (
          <div className="glass-icon-well h-10 w-10 shrink-0 overflow-hidden rounded-lg">
            <CardImage src={preview} alt={card.title} />
          </div>
        ) : (
          <div className="glass-icon-well flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Globe className="h-4 w-4 text-sky-600/80 dark:text-sky-400/80" strokeWidth={1.75} />
          </div>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {domain}
          </span>
          <span className="mt-1 block line-clamp-2 text-[13px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
            {card.title}
          </span>
          {card.description ? (
            <span className="mt-1 block line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {card.description}
            </span>
          ) : null}
        </span>
        <ArrowUpRight
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover/link:text-foreground"
          strokeWidth={1.75}
        />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="results-glass-card glass-card results-glass-card-interactive group/link flex gap-3 rounded-xl p-3"
    >
      {preview ? (
        <div className="glass-icon-well h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:h-14 sm:w-14">
          <CardImage src={preview} alt={card.title} />
        </div>
      ) : (
        <div className="glass-icon-well flex h-11 w-11 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12">
          <Globe className="h-4 w-4 text-sky-600/80 dark:text-sky-400/80" strokeWidth={1.75} />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{card.title}</p>
        {card.description ? (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{card.description}</p>
        ) : null}
        <p className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground transition group-hover/link:text-foreground">
          {domain}
          <ArrowUpRight className="h-3 w-3 opacity-60 transition group-hover/link:opacity-100" />
        </p>
      </div>
    </a>
  );
});

export const ChatWebSearchCards = memo(function ChatWebSearchCards({
  cards,
  className,
  hideHeader = false,
  layout = "grid",
}: ChatWebSearchCardsProps) {
  if (!cards.length) return null;
  return (
    <section className={cn(layout === "list" ? "space-y-2" : "space-y-2", className)}>
      {!hideHeader ? (
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Web results{" "}
          <span className="normal-case tracking-normal text-muted-foreground/80">
            ({cards.length})
          </span>
        </p>
      ) : null}
      <div className={cn(layout === "list" ? "space-y-2" : "grid gap-2.5 sm:grid-cols-2")}>
        {cards.map((card) => (
          <WebSearchCard key={card.id} card={card} layout={layout} />
        ))}
      </div>
    </section>
  );
});
