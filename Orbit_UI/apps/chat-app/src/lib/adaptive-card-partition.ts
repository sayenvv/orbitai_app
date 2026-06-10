import type { AdaptiveCard, WebSearchImage } from "@/types";
import {
  isListingImage,
  isListingSearch,
  normalizePlaceCards,
} from "@/lib/listing-card-normalize";

export type AdaptiveCardGroups = {
  places: AdaptiveCard[];
  jobs: AdaptiveCard[];
  web: AdaptiveCard[];
  images: AdaptiveCard[];
};

function normalizeCardType(card: AdaptiveCard): AdaptiveCard | null {
  const type = (card.type || "").trim().toLowerCase();
  if (type === "job" || type === "place" || type === "web_result" || type === "image") {
    return { ...card, type };
  }
  if (type === "listing") {
    return { ...card, type: "place" };
  }
  return null;
}

function shouldPromoteImagesToListings(
  raw: AdaptiveCard[],
  places: AdaptiveCard[],
  jobs: AdaptiveCard[],
  legacyImages: WebSearchImage[],
  hasStructured: boolean,
): boolean {
  if (!legacyImages.length) return false;
  if (places.length > 0) return true;
  if (isListingSearch(raw)) return true;
  if (legacyImages.some(isListingImage)) return true;
  if (jobs.length > 0 && !places.length) return false;
  return !hasStructured;
}

export function partitionAdaptiveCards(
  cards: AdaptiveCard[] = [],
  legacyImages: WebSearchImage[] = [],
): AdaptiveCardGroups {
  const raw = cards
    .map((card) => normalizeCardType(card))
    .filter((card): card is AdaptiveCard => card !== null && Boolean(card.title.trim()));

  const jobs = raw.filter((card) => card.type === "job");
  const web = raw.filter((card) => card.type === "web_result");
  const imageCards = raw.filter((card) => card.type === "image");
  const places = raw.filter((card) => card.type === "place");

  const hasStructured = jobs.length > 0 || places.length > 0 || web.length > 0;
  const promoteListingImages = shouldPromoteImagesToListings(
    raw,
    places,
    jobs,
    legacyImages,
    hasStructured,
  );
  const normalizedPlaces = normalizePlaceCards(
    places,
    promoteListingImages ? legacyImages : [],
  );

  return {
    places: normalizedPlaces,
    jobs,
    web,
    images: imageCards,
  };
}
