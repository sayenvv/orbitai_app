"use client";

import { Briefcase, Building2, Clock3, ExternalLink, IndianRupee, MapPin } from "lucide-react";
import { memo } from "react";
import type { AdaptiveCard } from "@/types";
import { cn } from "@/lib/utils";

type ChatJobCardsProps = {
  cards: AdaptiveCard[];
  className?: string;
};

function resolveExperience(card: AdaptiveCard): string | null {
  if (card.experienceLevel) return card.experienceLevel;
  const badge = card.badges?.find((item) =>
    /year|yrs|entry|junior|senior|mid|lead|fresher|intern/i.test(item),
  );
  return badge ?? null;
}

function resolveBoardBadges(card: AdaptiveCard): string[] {
  const experience = resolveExperience(card);
  return (card.badges ?? []).filter(
    (badge) => badge !== experience && !/year|yrs|entry|junior|senior|mid|lead|fresher|intern/i.test(badge),
  );
}

const JobCard = memo(function JobCard({ card }: { card: AdaptiveCard }) {
  const href = card.url || "#";
  const company = card.company || card.subtitle || card.source || "Company";
  const location = card.address || "";
  const salary = card.salary || card.price;
  const experience = resolveExperience(card);
  const boardBadges = resolveBoardBadges(card);

  return (
    <article className="glass-surface glass-card glass-card-interactive overflow-hidden rounded-xl">
      <div className="flex gap-3 p-2.5 sm:p-3">
        <div className="glass-icon-well flex h-12 w-12 shrink-0 items-center justify-center rounded-lg sm:h-14 sm:w-14">
          <Briefcase className="h-5 w-5 text-primary/80" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1">
            {boardBadges.slice(0, 2).map((badge) => (
              <span
                key={badge}
                className="glass-chip rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {badge}
              </span>
            ))}
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{card.title}</h3>
          <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="line-clamp-1">{company}</span>
          </p>
          {location ? (
            <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
              <span className="line-clamp-1">{location}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            {salary ? (
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <IndianRupee className="h-3 w-3 shrink-0 text-primary/70" />
                <span className="line-clamp-1">{salary}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Salary on listing</span>
            )}
            {experience ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock3 className="h-3 w-3 shrink-0 text-primary/70" />
                <span className="line-clamp-1">{experience}</span>
              </span>
            ) : null}
          </div>
          {card.description ? (
            <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{card.description}</p>
          ) : null}
          <div className="flex justify-end pt-0.5">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Apply
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
});

export const ChatJobCards = memo(function ChatJobCards({ cards, className }: ChatJobCardsProps) {
  if (!cards.length) return null;
  return (
    <section className={cn("space-y-2", className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Job listings <span className="normal-case tracking-normal text-muted-foreground/80">({cards.length})</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {cards.map((card) => (
          <JobCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
});
