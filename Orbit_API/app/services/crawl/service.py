from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from urllib.parse import urldefrag, urlparse, urlunparse

from app.core.config import settings
from app.services.rag.webpage_extract import (
    WebpageExtractError,
    extract_links_from_html,
    fetch_webpage_with_retries,
    normalize_public_http_url,
)

MAX_CRAWL_DEPTH = 20
MAX_PAGE_TEXT_CHARS = 100_000


def _max_crawl_pages() -> int:
    return max(1, min(settings.crawl_max_pages, 1000))


@dataclass(frozen=True)
class CrawlOptions:
    """Recursive crawl: each page's links are fetched one-by-one until the queue is empty."""

    max_pages: int | None = None  # None = scrape until queue empty (up to crawl_max_pages)
    max_depth: int | None = None  # None = no depth limit
    same_origin_only: bool = True
    include_links: bool = True
    follow_links: bool = True
    path_prefix_scope: bool = False
    auto_doc_scope: bool = True
    complete: bool = True
    fetch_retries: int | None = None


@dataclass
class CrawledPage:
    url: str
    title: str
    text: str
    depth: int
    links: list[str] = field(default_factory=list)


@dataclass
class CrawlResult:
    start_url: str
    pages: list[CrawledPage]
    truncated: bool = False
    failed_urls: list[str] = field(default_factory=list)
    combined_text: str = ""
    pending_urls: int = 0
    pending_url_list: list[str] = field(default_factory=list)
    max_pages_limit: int = 0


def _normalize_host(netloc: str) -> str:
    host = netloc.lower()
    if host.startswith("www."):
        return host[4:]
    return host


def _same_origin(url_a: str, url_b: str) -> bool:
    a = urlparse(url_a)
    b = urlparse(url_b)
    return a.scheme == b.scheme and _normalize_host(a.netloc) == _normalize_host(b.netloc)


def _normalize_crawl_url(url: str) -> str:
    cleaned, _fragment = urldefrag(url.strip())
    parsed = urlparse(cleaned)
    # Drop query strings (e.g. Microsoft Learn ?pivots=...) so pages dedupe correctly.
    path = parsed.path or "/"
    if not path.endswith("/") and "." not in path.rsplit("/", 1)[-1]:
        path = f"{path}/"
    cleaned = urlunparse((parsed.scheme, parsed.netloc.lower(), path, "", "", ""))
    return cleaned


def _is_crawlable_link(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False
    path = (parsed.path or "").lower()
    skip_ext = (
        ".pdf",
        ".zip",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".mp4",
        ".mp3",
        ".css",
        ".js",
        ".json",
        ".xml",
    )
    if any(path.endswith(ext) for ext in skip_ext):
        return False
    return True


def _doc_path_prefix(root_url: str) -> str:
    path = urlparse(root_url).path or "/"
    if path.endswith("/"):
        return path.rstrip("/") or "/"
    last = path.rsplit("/", 1)[-1]
    if "." in last and not last.startswith("."):
        parent = path.rsplit("/", 1)[0]
        return parent or "/"
    return path.rstrip("/") or "/"


def _under_doc_path_prefix(link_url: str, *, root_url: str, prefix: str) -> bool:
    root = urlparse(root_url)
    link = urlparse(link_url)
    if _normalize_host(root.netloc) != _normalize_host(link.netloc):
        return False
    link_path = link.path.rstrip("/") or "/"
    prefix = prefix.rstrip("/") or "/"
    if prefix == "/":
        return True
    return link_path == prefix or link_path.startswith(f"{prefix}/")


def _infer_doc_section_prefix(root_url: str) -> str | None:
    """e.g. /en-us/agent-framework for Microsoft Learn doc sets."""
    parsed = urlparse(root_url)
    parts = [p for p in (parsed.path or "").split("/") if p]
    if len(parts) < 2:
        return None
    host = _normalize_host(parsed.netloc)
    if host == "learn.microsoft.com":
        for idx, part in enumerate(parts):
            if part == "agent-framework":
                return "/" + "/".join(parts[: idx + 1])
        if len(parts) >= 2:
            return "/" + "/".join(parts[:2])
    if len(parts) >= 2:
        return "/" + "/".join(parts[:2])
    return None


_SKIP_LINK_PATH_PARTS = frozenset(
    {
        "legal",
        "contribute",
        "previous-versions",
        "lifecycle",
        "principles-for-ai-generated-content",
    }
)


def _should_skip_link_path(url: str) -> bool:
    path = (urlparse(url).path or "").lower()
    return any(f"/{part}/" in path or path.endswith(f"/{part}") for part in _SKIP_LINK_PATH_PARTS)


def _links_to_follow(
    links: list[str],
    *,
    root_url: str,
    path_prefix_scope: bool,
    doc_section_prefix: str | None,
) -> list[str]:
    scoped = links
    if doc_section_prefix:
        scoped = [
            link
            for link in scoped
            if _under_doc_path_prefix(link, root_url=root_url, prefix=doc_section_prefix)
        ]
    elif path_prefix_scope:
        prefix = _doc_path_prefix(root_url)
        scoped = [
            link for link in scoped if _under_doc_path_prefix(link, root_url=root_url, prefix=prefix)
        ]
    return [link for link in scoped if not _should_skip_link_path(link)]


def _filter_links(
    links: list[str],
    *,
    base_url: str,
    same_origin_only: bool,
) -> list[str]:
    seen: set[str] = set()
    filtered: list[str] = []
    for link in links:
        try:
            normalized = normalize_public_http_url(link)
        except WebpageExtractError:
            continue
        normalized = _normalize_crawl_url(normalized)
        if not _is_crawlable_link(normalized):
            continue
        if same_origin_only and not _same_origin(base_url, normalized):
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        filtered.append(normalized)
    return filtered


def _resolve_crawl_limits(opts: CrawlOptions) -> tuple[int | None, int]:
    if not opts.follow_links:
        return 0, 1
    ceiling = _max_crawl_pages()
    # Swagger often sends max_pages=1; treat that as "use full crawl" when follow_links is on.
    if opts.complete or opts.max_pages is None or opts.max_pages < 2:
        max_pages = ceiling
    else:
        max_pages = min(opts.max_pages, ceiling)
    if opts.max_depth is None:
        return None, max_pages
    return min(max(opts.max_depth, 0), MAX_CRAWL_DEPTH), max_pages


def _build_combined_text(pages: list[CrawledPage]) -> str:
    parts: list[str] = []
    for page in sorted(pages, key=lambda p: (p.depth, p.url)):
        parts.append(f"# {page.title}\nSource: {page.url}\n\n{page.text}")
    return "\n\n---\n\n".join(parts).strip()


def _mark_visited(visited: set[str], *urls: str) -> None:
    for url in urls:
        visited.add(_normalize_crawl_url(url))


def _already_seen(visited: set[str], queued: set[str], url: str) -> bool:
    normalized = _normalize_crawl_url(url)
    return normalized in visited or normalized in queued


async def crawl_web(start_url: str, options: CrawlOptions | None = None) -> CrawlResult:
    """
    Recursively scrape pages: start URL -> extract links -> fetch each link ->
    extract their links -> repeat until the queue is empty or max_pages is reached.
    Pages are fetched sequentially (one by one).
    """
    opts = options or CrawlOptions()
    max_depth, max_pages = _resolve_crawl_limits(opts)

    root = _normalize_crawl_url(normalize_public_http_url(start_url))
    doc_section_prefix = _infer_doc_section_prefix(root) if opts.auto_doc_scope else None
    fetch_attempts = opts.fetch_retries if opts.fetch_retries is not None else settings.crawl_fetch_retries
    fetch_attempts = max(1, min(fetch_attempts, 5))
    retry_delay = max(0.25, settings.crawl_fetch_retry_delay_seconds)

    visited: set[str] = set()
    queued: set[str] = set()
    pages: list[CrawledPage] = []
    failed_urls: list[str] = []
    queue: deque[tuple[str, int]] = deque([(root, 0)])
    queued.add(root)

    while queue and len(pages) < max_pages:
        url, depth = queue.popleft()
        normalized_request = _normalize_crawl_url(url)
        queued.discard(normalized_request)
        if normalized_request in visited:
            continue

        try:
            fetched = await fetch_webpage_with_retries(
                url,
                max_attempts=fetch_attempts,
                retry_delay_seconds=retry_delay,
            )
        except (WebpageExtractError, Exception):
            failed_urls.append(normalized_request)
            _mark_visited(visited, url, normalized_request)
            continue

        canonical_url = _normalize_crawl_url(fetched.final_url)
        if canonical_url in visited:
            continue
        _mark_visited(visited, url, canonical_url)

        text = fetched.text
        if len(text) > MAX_PAGE_TEXT_CHARS:
            text = text[:MAX_PAGE_TEXT_CHARS] + "\n\n[truncated]"

        page_links: list[str] = []
        if opts.include_links:
            raw_links = extract_links_from_html(fetched.html, fetched.final_url)
            page_links = _filter_links(
                raw_links,
                base_url=root,
                same_origin_only=opts.same_origin_only,
            )

        pages.append(
            CrawledPage(
                url=canonical_url,
                title=fetched.title,
                text=text,
                depth=depth,
                links=page_links,
            )
        )

        if not opts.follow_links:
            break

        depth_exhausted = max_depth is not None and depth >= max_depth
        if depth_exhausted:
            continue

        follow_targets = _links_to_follow(
            page_links,
            root_url=root,
            path_prefix_scope=opts.path_prefix_scope,
            doc_section_prefix=doc_section_prefix,
        )
        for link in follow_targets:
            if _already_seen(visited, queued, link):
                continue
            queue.append((link, depth + 1))
            queued.add(_normalize_crawl_url(link))

    pending_list = [url for url, _ in queue]
    pending = len(pending_list)
    truncated = pending > 0
    return CrawlResult(
        start_url=root,
        pages=pages,
        truncated=truncated,
        failed_urls=failed_urls,
        combined_text=_build_combined_text(pages),
        pending_urls=pending,
        pending_url_list=pending_list[:100],
        max_pages_limit=max_pages,
    )
