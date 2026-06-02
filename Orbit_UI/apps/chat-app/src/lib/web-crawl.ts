import { publicApi, type ApiCrawlRequest, type ApiCrawlResponse } from "@/lib/orbit-api";
import { normalizeWebpageUrl, validateWebpageUrl } from "@/lib/web-url-import";

export type { ApiCrawlRequest, ApiCrawlResponse };

export { normalizeWebpageUrl, validateWebpageUrl };

/** Crawl a URL and return extracted page text (no library ingest). */
export async function crawlWebUrl(
  url: string,
  options?: Omit<ApiCrawlRequest, "url">,
): Promise<ApiCrawlResponse> {
  const validationError = validateWebpageUrl(url);
  if (validationError) {
    throw new Error(validationError);
  }
  return publicApi.crawlWeb({
    url: normalizeWebpageUrl(url),
    follow_links: options?.follow_links ?? true,
    complete: options?.complete ?? true,
    max_depth: options?.max_depth,
    max_pages: options?.max_pages,
    same_origin_only: options?.same_origin_only ?? true,
    path_prefix_scope: options?.path_prefix_scope ?? false,
    auto_doc_scope: options?.auto_doc_scope ?? true,
    include_links: options?.include_links ?? true,
  });
}
