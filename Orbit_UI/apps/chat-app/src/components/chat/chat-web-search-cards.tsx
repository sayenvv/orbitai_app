"use client";

import { ExternalLink, Globe } from "lucide-react";
import { memo, useState } from "react";
import type { AdaptiveCard } from "@/types";
import { proxiedMediaUrl } from "@/lib/media-proxy";
import { cn } from "@/lib/utils";

type ChatWebSearchCardsProps = {
  cards: AdaptiveCard[];
  className?: string;
};

const CardImage = memo(function CardImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
  );
});

const WebSearchCard = memo(function WebSearchCard({ card }: { card: AdaptiveCard }) {
  const href = card.url || "#";
  const preview = proxiedMediaUrl(card.imageUrl || card.thumbnailUrl);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-surface glass-card glass-card-interactive flex gap-3 rounded-xl p-2.5 sm:p-3"
    >
      {preview ? (
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted/30 sm:h-14 sm:w-14">
          <CardImage src={preview} alt={card.title} />
        </div>
      ) : (
        <div className="glass-icon-well flex h-12 w-12 shrink-0 items-center justify-center rounded-lg sm:h-14 sm:w-14">
          <Globe className="h-5 w-5 text-primary/70" strokeWidth={1.75} />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{card.title}</p>
        {card.description ? (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{card.description}</p>
        ) : null}
        <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          {card.source || card.subtitle || "Web"}
          <ExternalLink className="h-3 w-3" />
        </p>
      </div>
    </a>
  );
});

export const ChatWebSearchCards = memo(function ChatWebSearchCards({
  cards,
  className,
}: ChatWebSearchCardsProps) {
  if (!cards.length) return null;
  return (
    <section className={cn("space-y-2", className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Web results <span className="normal-case tracking-normal text-muted-foreground/80">({cards.length})</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {cards.map((card) => (
          <WebSearchCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
});
