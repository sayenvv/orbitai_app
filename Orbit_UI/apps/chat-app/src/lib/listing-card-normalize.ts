import type { AdaptiveCard, WebSearchImage } from "@/types";

const BOOKING_SITES =
  /on\s+(goibibo|booking\.com|tripadvisor|makemytrip|agoda|expedia|hotels\.com|oyo|cleartrip)/i;

export function cleanListingTitle(raw: string): string {
  let title = raw.trim();
  const photosMatch = title.match(/photos?\s+of\s+(.+?)(?:\s+on\s+|\s+-\s+)/i);
  if (photosMatch?.[1]) {
    title = photosMatch[1].trim();
  }
  title = title.replace(BOOKING_SITES, "").replace(/\bBOOK\b/gi, "").trim();
  const segments = title.split(/\s[-|•]\s/).map((part) => part.trim()).filter(Boolean);
  if (segments.length > 1) {
    const kept = segments.find(
      (part) =>
        !/(goibibo|booking|tripadvisor|makemytrip|agoda|expedia|hotel photos|reviews)/i.test(part),
    );
    if (kept) title = kept;
  }
  return title.replace(/\s+/g, " ").trim();
}

function listingKey(card: AdaptiveCard): string {
  return cleanListingTitle(card.title).toLowerCase();
}

function placeCardFromImage(image: WebSearchImage, index: number): AdaptiveCard {
  const rawTitle = image.title || image.alt || "Listing";
  const title = cleanListingTitle(rawTitle) || rawTitle;
  return {
    id: `listing-image-${index}-${image.imageUrl}`,
    type: "place",
    title,
    subtitle: image.source,
    description: null,
    imageUrl: image.imageUrl,
    thumbnailUrl: image.thumbnailUrl,
    url: image.pageUrl || image.imageUrl,
    address: image.source,
    rating: null,
    price: null,
    source: image.source,
    badges: ["Hotel", "Book now"],
  };
}

function promoteToPlaceCard(card: AdaptiveCard): AdaptiveCard {
  return {
    ...card,
    type: "place",
    title: cleanListingTitle(card.title) || card.title,
    description: null,
  };
}

export function normalizePlaceCards(
  cards: AdaptiveCard[] = [],
  images: WebSearchImage[] = [],
): AdaptiveCard[] {
  const merged = [
    ...cards.filter((card) => card.type === "place").map(promoteToPlaceCard),
    ...images.map(placeCardFromImage),
  ].filter((card) => card.title.trim());

  const seen = new Set<string>();
  const unique: AdaptiveCard[] = [];

  for (const card of merged) {
    const key = listingKey(card);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(card);
  }

  return unique;
}

export function isListingSearch(cards: AdaptiveCard[]): boolean {
  return cards.some(
    (card) =>
      card.type === "place" ||
      card.badges?.some((badge) => /hotel|stay|book|restaurant/i.test(badge)) ||
      /hotel|resort|inn|lodge|stay/i.test(card.title),
  );
}

export function isListingImage(image: WebSearchImage): boolean {
  const text = `${image.title ?? ""} ${image.alt ?? ""} ${image.source ?? ""}`;
  return /hotel|resort|inn|lodge|stay|booking|accommodation|airbnb|hostel|villa|homestay/i.test(
    text,
  );
}

export function collectPlaceImageUrls(cards: AdaptiveCard[]): Set<string> {
  const urls = new Set<string>();
  for (const card of cards) {
    if (card.imageUrl) urls.add(card.imageUrl);
    if (card.thumbnailUrl) urls.add(card.thumbnailUrl);
  }
  return urls;
}
