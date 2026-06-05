"use client";

import { Building2, ExternalLink, Mail, MapPin, Phone, Star } from "lucide-react";
import { memo, useState } from "react";
import type { AdaptiveCard } from "@/types";
import { proxiedMediaUrl } from "@/lib/media-proxy";
import { cn } from "@/lib/utils";

type ChatPlaceCardsProps = {
  cards: AdaptiveCard[];
  className?: string;
};

function resolveImageSrc(card: AdaptiveCard): string | null {
  return proxiedMediaUrl(card.imageUrl || card.thumbnailUrl);
}

function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function resolveContactPhone(card: AdaptiveCard): string | null {
  const direct = card.phone?.trim();
  if (direct) return direct;
  const haystack = [card.title, card.subtitle, card.address].filter(Boolean).join(" ");
  const patterns = [/\+91[\s.-]?\d{10}/, /(?<!\d)[6-9]\d{9}(?!\d)/];
  for (const pattern of patterns) {
    const match = haystack.match(pattern);
    if (match?.[0]) return match[0].trim();
  }
  return null;
}

function resolveRating(card: AdaptiveCard): number | null {
  const direct = card.rating?.trim();
  if (direct) {
    const value = Number.parseFloat(direct);
    if (!Number.isNaN(value) && value > 0) return value;
  }
  return null;
}

function formatPrice(price: string | null | undefined): string | null {
  if (!price) return null;
  return /\/\s*night|per night/i.test(price) ? price.trim() : `${price.trim()} / night`;
}

const CardImage = memo(function CardImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30 text-muted-foreground">
        <Building2 className="h-5 w-5 opacity-40" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
  );
});

const PlaceCard = memo(function PlaceCard({ card }: { card: AdaptiveCard }) {
  const href = card.url || "#";
  const preview = resolveImageSrc(card);
  const ratingValue = resolveRating(card);
  const hasRating = ratingValue !== null;
  const phone = resolveContactPhone(card);
  const priceLabel = formatPrice(card.price);

  return (
    <article className="glass-surface glass-card glass-card-interactive overflow-hidden rounded-xl">
      <div className="flex gap-3 p-2.5 sm:p-3">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-muted/30 sm:h-20 sm:w-20"
        >
          {preview ? <CardImage src={preview} alt={card.title} /> : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Building2 className="h-5 w-5 opacity-40" />
            </div>
          )}
          {hasRating ? (
            <span className="glass-chip absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[10px] font-semibold">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {ratingValue.toFixed(1)}
            </span>
          ) : null}
        </a>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="line-clamp-1 text-sm font-semibold">{card.title}</h3>
          <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="line-clamp-1">{card.address || card.subtitle || "See booking site"}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-2 text-[11px]">
            {priceLabel ? <span className="font-medium">{priceLabel}</span> : <span className="text-muted-foreground">Rates on site</span>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {phone ? (
              <a href={phoneHref(phone)} className="glass-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium">
                <Phone className="h-3 w-3 text-primary" />
                {phone}
              </a>
            ) : card.email ? (
              <a href={`mailto:${card.email}`} className="glass-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium">
                <Mail className="h-3 w-3 text-primary" />
                Email
              </a>
            ) : (
              <span className="text-[11px] text-muted-foreground">Contact on site</span>
            )}
            <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
              Book <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
});

export const ChatPlaceCards = memo(function ChatPlaceCards({ cards, className }: ChatPlaceCardsProps) {
  if (!cards.length) return null;
  return (
    <section className={cn("space-y-2", className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Available stays <span className="normal-case tracking-normal text-muted-foreground/80">({cards.length})</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {cards.map((card) => (
          <PlaceCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
});
