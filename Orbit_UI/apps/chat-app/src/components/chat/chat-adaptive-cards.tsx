"use client";

import { memo, useMemo } from "react";
import type { AdaptiveCard, WebSearchImage } from "@/types";
import { partitionAdaptiveCards } from "@/lib/adaptive-card-partition";
import { ChatJobCards } from "@/components/chat/chat-job-cards";
import { ChatPlaceCards } from "@/components/chat/chat-place-cards";
import { ChatWebSearchCards } from "@/components/chat/chat-web-search-cards";
import { cn } from "@/lib/utils";

type ChatAdaptiveCardsProps = {
  cards?: AdaptiveCard[];
  images?: WebSearchImage[];
  className?: string;
};

export const ChatAdaptiveCards = memo(function ChatAdaptiveCards({
  cards,
  images,
  className,
}: ChatAdaptiveCardsProps) {
  const groups = useMemo(
    () => partitionAdaptiveCards(cards, images),
    [cards, images],
  );

  const hasContent =
    groups.places.length > 0 ||
    groups.jobs.length > 0 ||
    groups.web.length > 0 ||
    groups.images.length > 0;

  if (!hasContent) return null;

  return (
    <div className={cn("mt-3 space-y-3", className)}>
      <ChatJobCards cards={groups.jobs} />
      <ChatPlaceCards cards={groups.places} />
      <ChatWebSearchCards cards={groups.web} />
    </div>
  );
});
