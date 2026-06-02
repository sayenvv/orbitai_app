from __future__ import annotations

import asyncio
import ipaddress
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx

MAX_WEBPAGE_BYTES = 2_000_000
FETCH_TIMEOUT_SECONDS = 20.0
USER_AGENT = "OrbitBot/1.0 (compatible; +https://clovai.app)"


class WebpageExtractError(ValueError):
    pass


@dataclass(frozen=True)
class FetchedWebpage:
    final_url: str
    title: str
    text: str
    html: str
    content_type: str


class _HTMLTextExtractor(HTMLParser):
    _SKIP_TAGS = frozenset({"script", "style", "noscript", "svg", "head", "meta", "link"})

    def __init__(self) -> None:
        super().__init__()
        self._skip_depth = 0
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag.lower() in self._SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in self._SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            text = data.strip()
            if text:
                self._parts.append(text)

    def get_text(self) -> str:
        joined = "\n".join(self._parts)
        joined = re.sub(r"\n{3,}", "\n\n", joined)
        return joined.strip()


def _hostname_blocked(hostname: str) -> bool:
    host = hostname.strip().lower().rstrip(".")
    if not host:
        return True
    if host in {"localhost", "127.0.0.1", "0.0.0.0", "::1"} or host.endswith(".local"):
        return True

    literal = host.strip("[]")
    try:
        ip = ipaddress.ip_address(literal)
    except ValueError:
        return False

    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
    )


def normalize_public_http_url(url: str) -> str:
    raw = url.strip()
    if not raw:
        raise WebpageExtractError("URL is required.")

    if not re.match(r"^https?://", raw, flags=re.IGNORECASE):
        raw = f"https://{raw}"

    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"}:
        raise WebpageExtractError("Only http:// and https:// URLs are supported.")
    if not parsed.hostname:
        raise WebpageExtractError("Enter a valid webpage URL.")
    if parsed.username or parsed.password:
        raise WebpageExtractError("URLs with embedded credentials are not allowed.")
    if _hostname_blocked(parsed.hostname):
        raise WebpageExtractError("That URL is not allowed.")

    return raw


def _extract_title(html: str) -> str | None:
    match = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    title = re.sub(r"\s+", " ", match.group(1)).strip()
    return title or None


def extract_main_content_html(html: str) -> str:
    """Prefer article/main regions so nav chrome is not scraped as body text."""
    for pattern in (
        r"<main[^>]*>(.*?)</main>",
        r"<article[^>]*>(.*?)</article>",
        r'<div[^>]+id=["\']main["\'][^>]*>(.*?)</div>',
    ):
        match = re.search(pattern, html, flags=re.IGNORECASE | re.DOTALL)
        if match and len(match.group(1)) > 200:
            return match.group(1)
    return html


def html_to_text(html: str) -> str:
    parser = _HTMLTextExtractor()
    parser.feed(extract_main_content_html(html))
    return parser.get_text()


class _LinkExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        attr_map = {key.lower(): value.strip() for key, value in attrs if value}
        tag_lower = tag.lower()

        if tag_lower == "a":
            href = attr_map.get("href") or attr_map.get("data-href") or attr_map.get("data-url")
            if href:
                self.links.append(href)
            return

        if tag_lower == "link" and attr_map.get("rel", "").lower() == "next":
            href = attr_map.get("href")
            if href:
                self.links.append(href)


def extract_links_from_html(html: str, base_url: str) -> list[str]:
    parser = _LinkExtractor()
    try:
        parser.feed(html)
    except Exception:
        return []
    resolved: list[str] = []
    for href in parser.links:
        if href.startswith("#") or href.lower().startswith(("javascript:", "mailto:", "tel:")):
            continue
        resolved.append(urljoin(base_url, href))
    return resolved


async def fetch_webpage(url: str) -> FetchedWebpage:
    """Fetch a public webpage and return structured content (SSRF-safe)."""
    normalized = normalize_public_http_url(url)

    async with httpx.AsyncClient(follow_redirects=True, timeout=FETCH_TIMEOUT_SECONDS) as client:
        response = await client.get(
            normalized,
            headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
        )
        response.raise_for_status()

        content_type = (response.headers.get("content-type") or "").lower()
        if "html" not in content_type and "text/plain" not in content_type:
            raise WebpageExtractError("URL must point to an HTML webpage.")

        if len(response.content) > MAX_WEBPAGE_BYTES:
            raise WebpageExtractError("Page is too large to import (max 2 MB).")

        html = response.text
        final_url = str(response.url)

    if _hostname_blocked(urlparse(final_url).hostname or ""):
        raise WebpageExtractError("Redirect target is not allowed.")

    if "text/plain" in content_type and "<html" not in html.lower():
        text = html.strip()
        title = urlparse(final_url).hostname or final_url
    else:
        title = _extract_title(html) or urlparse(final_url).hostname or final_url
        text = html_to_text(html)

    if not text:
        raise WebpageExtractError("No readable text found on this page.")

    return FetchedWebpage(
        final_url=final_url,
        title=title[:512],
        text=text,
        html=html,
        content_type=content_type,
    )


def _is_retryable_http_status(status_code: int) -> bool:
    if status_code in {400, 401, 403, 404, 410}:
        return False
    return status_code in {408, 429} or status_code >= 500


def _is_retryable_webpage_error(exc: WebpageExtractError) -> bool:
    message = str(exc).lower()
    permanent_markers = (
        "not allowed",
        "not supported",
        "too large",
        "no readable text",
        "redirect target",
        "credentials",
        "valid webpage url",
    )
    return not any(marker in message for marker in permanent_markers)


async def fetch_webpage_with_retries(
    url: str,
    *,
    max_attempts: int = 3,
    retry_delay_seconds: float = 1.0,
) -> FetchedWebpage:
    """Fetch a page with retries on transient network/server errors."""
    attempts = max(1, max_attempts)
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            return await fetch_webpage(url)
        except WebpageExtractError as exc:
            last_error = exc
            if not _is_retryable_webpage_error(exc):
                raise
        except httpx.HTTPStatusError as exc:
            last_error = exc
            if not _is_retryable_http_status(exc.response.status_code):
                raise WebpageExtractError(
                    f"HTTP {exc.response.status_code} for {url}"
                ) from exc
        except (httpx.TimeoutException, httpx.NetworkError, httpx.ConnectError) as exc:
            last_error = exc

        if attempt < attempts:
            await asyncio.sleep(retry_delay_seconds * attempt)

    detail = str(last_error) if last_error else "unknown error"
    raise WebpageExtractError(f"Failed to fetch page after {attempts} attempts: {detail}") from last_error


async def fetch_webpage_text(url: str) -> tuple[str, str, str]:
    """Return (normalized_url, display_title, plain_text)."""
    page = await fetch_webpage(url)
    return page.final_url, page.title, page.text
