from __future__ import annotations

import ipaddress
import re
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx

MAX_WEBPAGE_BYTES = 2_000_000
FETCH_TIMEOUT_SECONDS = 20.0
USER_AGENT = "OrbitBot/1.0 (compatible; +https://clovai.app)"


class WebpageExtractError(ValueError):
    pass


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


def html_to_text(html: str) -> str:
    parser = _HTMLTextExtractor()
    parser.feed(html)
    return parser.get_text()


async def fetch_webpage_text(url: str) -> tuple[str, str, str]:
    """Return (normalized_url, display_title, plain_text)."""
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

    return final_url, title[:512], text
