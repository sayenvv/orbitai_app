import { getApiBaseUrl } from "@/lib/orbit-api";

/** Route external image URLs through our API so CSP img-src 'self' can display them. */
export function proxiedMediaUrl(url: string | null | undefined): string | null {
  const raw = (url || "").trim();
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    return null;
  }
  return `${getApiBaseUrl()}/media/image?url=${encodeURIComponent(raw)}`;
}
