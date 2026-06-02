import type { ApiRagDocument } from "@/lib/orbit-api";
import { publicApi } from "@/lib/orbit-api";
import type { StudySource } from "@/types";

export type WebpageDraft = {
  url: string;
  label: string;
};

const URL_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[^\s]*)?$/i;

export function normalizeWebpageUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function validateWebpageUrl(input: string): string | null {
  const normalized = normalizeWebpageUrl(input);
  if (!normalized) return "Enter a webpage URL.";
  try {
    const parsed = new URL(normalized);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "Only http:// and https:// URLs are supported.";
    }
    if (!parsed.hostname) return "Enter a valid webpage URL.";
  } catch {
    return "Enter a valid webpage URL.";
  }
  if (!URL_PATTERN.test(normalized.replace(/^https?:\/\//i, ""))) {
    return "Enter a valid webpage URL.";
  }
  return null;
}

export function webpageLabelFromUrl(url: string): string {
  try {
    const parsed = new URL(normalizeWebpageUrl(url));
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

export function isWebpageDocument(doc: ApiRagDocument): boolean {
  return doc.metadata?.source_kind === "webpage" || doc.mime_type === "text/html";
}

export function mapWebpageDocumentToSource(doc: ApiRagDocument): StudySource {
  const url =
    typeof doc.metadata?.source_url === "string"
      ? doc.metadata.source_url
      : undefined;

  return {
    id: doc.id,
    name: doc.original_filename || doc.name,
    type: "webpage",
    subject: url ? url : "Webpage",
    url,
    status: doc.status,
    createdAt: new Date(doc.created_at),
  };
}

export async function importWebpageUrl(
  url: string,
  conversationId?: string | null,
): Promise<StudySource> {
  const doc = await publicApi.importWebpageUrl(url, conversationId);
  return mapWebpageDocumentToSource(doc);
}
