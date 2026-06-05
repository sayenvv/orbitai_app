import type { AdaptiveCard, WebSearchImage } from "@/types";
import { normalizePlaceCards } from "@/lib/listing-card-normalize";

export type AdaptiveCardGroups = {
  places: AdaptiveCard[];
  jobs: AdaptiveCard[];
  web: AdaptiveCard[];
  images: AdaptiveCard[];
};

export function partitionAdaptiveCards(
  cards: AdaptiveCard[] = [],
  legacyImages: WebSearchImage[] = [],
): AdaptiveCardGroups {
  const raw = cards.filter((card) => card.title.trim());
  const jobs = raw.filter((card) => card.type === "job");
  const web = raw.filter((card) => card.type === "web_result");
  const imageCards = raw.filter((card) => card.type === "image");
  const places = raw.filter((card) => card.type === "place");

  const hasStructured = jobs.length > 0 || places.length > 0 || web.length > 0;
  const normalizedPlaces = hasStructured
    ? normalizePlaceCards(places)
    : normalizePlaceCards(places, legacyImages);

  return {
    places: normalizedPlaces,
    jobs,
    web,
    images: imageCards,
  };
}
