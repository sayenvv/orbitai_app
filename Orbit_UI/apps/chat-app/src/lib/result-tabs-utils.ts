import { partitionAdaptiveCards } from "@/lib/adaptive-card-partition";
import { collectPlaceImageUrls } from "@/lib/listing-card-normalize";
import type { AdaptiveCard, WebSearchImage } from "@/types";
import type { LucideIcon } from "lucide-react";
import { Briefcase, Globe, ImageIcon, MapPin } from "lucide-react";

export type ResultTabId = "web" | "jobs" | "places" | "images";

export type ResultTab = {
  id: ResultTabId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  count: number;
  accent: string;
  chipBg: string;
};

export const RESULT_TAB_THEME: Record<
  ResultTabId,
  Pick<ResultTab, "accent" | "chipBg">
> = {
  web: { accent: "text-sky-600 dark:text-sky-400", chipBg: "bg-sky-500/10" },
  jobs: { accent: "text-violet-600 dark:text-violet-400", chipBg: "bg-violet-500/10" },
  places: { accent: "text-amber-600 dark:text-amber-400", chipBg: "bg-amber-500/10" },
  images: { accent: "text-emerald-600 dark:text-emerald-400", chipBg: "bg-emerald-500/10" },
};

function imageCardsToLegacy(cards: AdaptiveCard[]): WebSearchImage[] {
  return cards
    .map((card) => ({
      imageUrl: card.imageUrl || card.thumbnailUrl || "",
      thumbnailUrl: card.thumbnailUrl,
      pageUrl: card.url,
      title: card.title,
      alt: card.description,
      source: card.source,
    }))
    .filter((image) => image.imageUrl);
}

function mergeImages(
  legacyImages: WebSearchImage[] = [],
  cardImages: WebSearchImage[] = [],
): WebSearchImage[] {
  const seen = new Set<string>();
  const merged: WebSearchImage[] = [];
  for (const image of [...legacyImages, ...cardImages]) {
    if (!image.imageUrl || seen.has(image.imageUrl)) continue;
    seen.add(image.imageUrl);
    merged.push(image);
  }
  return merged.slice(0, 12);
}

export function buildResultTabs(
  cards?: AdaptiveCard[],
  images?: WebSearchImage[],
): {
  tabs: ResultTab[];
  groups: ReturnType<typeof partitionAdaptiveCards>;
  allImages: WebSearchImage[];
} | null {
  const groups = partitionAdaptiveCards(cards, images);
  const listingImageUrls = collectPlaceImageUrls(groups.places);
  const allImages = mergeImages(images, imageCardsToLegacy(groups.images)).filter(
    (image) =>
      !listingImageUrls.has(image.imageUrl) &&
      !(image.thumbnailUrl && listingImageUrls.has(image.thumbnailUrl)),
  );

  const tabs: ResultTab[] = [];
  if (groups.web.length > 0) {
    tabs.push({
      id: "web",
      label: "Web search",
      shortLabel: "Web",
      icon: Globe,
      count: groups.web.length,
      ...RESULT_TAB_THEME.web,
    });
  }
  if (groups.jobs.length > 0) {
    tabs.push({
      id: "jobs",
      label: "Jobs",
      shortLabel: "Jobs",
      icon: Briefcase,
      count: groups.jobs.length,
      ...RESULT_TAB_THEME.jobs,
    });
  }
  if (groups.places.length > 0) {
    tabs.push({
      id: "places",
      label: "Listings",
      shortLabel: "Listings",
      icon: MapPin,
      count: groups.places.length,
      ...RESULT_TAB_THEME.places,
    });
  }
  if (allImages.length > 0) {
    tabs.push({
      id: "images",
      label: "Images",
      shortLabel: "Images",
      icon: ImageIcon,
      count: allImages.length,
      ...RESULT_TAB_THEME.images,
    });
  }

  if (!tabs.length) return null;
  return { tabs, groups, allImages };
}

export function hasSearchResultTabs(
  cards?: AdaptiveCard[],
  images?: WebSearchImage[],
): boolean {
  return buildResultTabs(cards, images) !== null;
}

export type CollapsedResultItem = {
  key: string;
  tabId: ResultTabId;
  title: string;
  subtitle: string;
  href?: string | null;
};

export const COLLAPSED_PREVIEW_LIMIT = 3;

function resolveWebDomain(card: AdaptiveCard): string {
  if (card.source) return card.source;
  if (card.subtitle) return card.subtitle;
  try {
    if (card.url) return new URL(card.url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  return "Web";
}

export function buildCollapsedPreviewItems(
  groups: ReturnType<typeof partitionAdaptiveCards>,
  allImages: WebSearchImage[],
  limit = COLLAPSED_PREVIEW_LIMIT,
): CollapsedResultItem[] {
  const items: CollapsedResultItem[] = [];

  for (const card of groups.web) {
    items.push({
      key: card.id,
      tabId: "web",
      title: card.title,
      subtitle: resolveWebDomain(card),
      href: card.url,
    });
  }
  for (const card of groups.jobs) {
    items.push({
      key: card.id,
      tabId: "jobs",
      title: card.title,
      subtitle: card.company || card.subtitle || card.source || "Job listing",
      href: card.url,
    });
  }
  for (const card of groups.places) {
    items.push({
      key: card.id,
      tabId: "places",
      title: card.title,
      subtitle: card.address || card.subtitle || "Place",
      href: card.url,
    });
  }
  for (const [index, image] of allImages.entries()) {
    items.push({
      key: `img-${image.imageUrl}-${index}`,
      tabId: "images",
      title: image.title || image.alt || "Image result",
      subtitle: image.source || "Image",
      href: image.pageUrl || image.imageUrl,
    });
  }

  return items.slice(0, limit);
}

export function countCollapsedPreviewItems(
  groups: ReturnType<typeof partitionAdaptiveCards>,
  allImages: WebSearchImage[],
): number {
  return groups.web.length + groups.jobs.length + groups.places.length + allImages.length;
}
