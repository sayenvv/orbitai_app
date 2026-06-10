"use client";

import { memo } from "react";
import type { AdaptiveCard, WebSearchImage } from "@/types";
import { ChatResultsTabs } from "@/components/chat/chat-results-tabs";

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
  return <ChatResultsTabs cards={cards} images={images} className={className} />;
});
