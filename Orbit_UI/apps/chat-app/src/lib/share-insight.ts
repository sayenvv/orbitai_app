import { BRAND_NAME } from "@orbit/ui";

export function buildInsightShareUrl(insightId: string): string {
  if (typeof window === "undefined") return `/insights/${insightId}`;
  return `${window.location.origin}/insights/${insightId}`;
}

export function buildInsightShareText(
  title: string,
  preview: string,
  sourceName?: string | null,
): string {
  const lines = [title.trim()];
  if (sourceName?.trim()) lines.push(`Source: ${sourceName.trim()}`);
  lines.push("", preview.trim());
  return lines.join("\n").trim();
}

export function buildInsightSharePayload(
  title: string,
  preview: string,
  insightId: string,
  sourceName?: string | null,
) {
  const url = buildInsightShareUrl(insightId);
  return {
    url,
    title: title.trim() || "AI Insights",
    text: `Study insights on ${BRAND_NAME}\n${url}`,
    copyText: buildInsightShareText(title, preview, sourceName),
  };
}
