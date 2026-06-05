from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from typing import Callable, TypeVar
from urllib.parse import urljoin, urlparse

import httpx
from langchain_core.tools import tool

from orbit_orchestration.config import get_orchestration_settings
from orbit_orchestration.tools.card_builder import (
    _detect_place_category,
    _extract_location_hint,
    build_place_cards,
    build_web_cards,
)

T = TypeVar("T")

_USER_AGENT = "OrbitBot/1.0 (compatible; +https://clovai.app)"
_MAX_BYTES = 1_500_000
_TIMEOUT = 20.0
_IMAGE_EXT = frozenset({".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".bmp"})


class _PageExtractor(HTMLParser):
    _SKIP = frozenset({"script", "style", "noscript", "svg", "head"})

    def __init__(self, base_url: str) -> None:
        super().__init__()
        self._base_url = base_url
        self._skip = 0
        self._parts: list[str] = []
        self._images: list[dict[str, str]] = []
        self._seen_image_urls: set[str] = set()

    def handle_starttag(self, tag: str, attrs) -> None:
        tag_lower = tag.lower()
        attr_map = {key.lower(): value for key, value in attrs if key and value}

        if tag_lower in self._SKIP:
            self._skip += 1
            return

        if tag_lower == "img":
            self._add_image(
                src=attr_map.get("src") or attr_map.get("data-src") or attr_map.get("data-lazy-src"),
                alt=attr_map.get("alt", ""),
            )
        elif tag_lower == "meta":
            prop = (attr_map.get("property") or attr_map.get("name") or "").lower()
            if prop in {"og:image", "og:image:url", "twitter:image", "twitter:image:src"}:
                self._add_image(src=attr_map.get("content"), alt=prop)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in self._SKIP and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip:
            text = data.strip()
            if text:
                self._parts.append(text)

    def _add_image(self, *, src: str | None, alt: str) -> None:
        if not src:
            return
        absolute = urljoin(self._base_url, src.strip())
        if not _looks_like_image_url(absolute):
            return
        if absolute in self._seen_image_urls:
            return
        self._seen_image_urls.add(absolute)
        self._images.append({"url": absolute, "alt": alt.strip()[:200]})

    def text(self) -> str:
        joined = "\n".join(self._parts)
        return re.sub(r"\n{3,}", "\n\n", joined).strip()

    def images(self, *, limit: int = 12) -> list[dict[str, str]]:
        return self._images[:limit]


def _looks_like_image_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False
    path = (parsed.path or "").lower()
    if any(path.endswith(ext) for ext in _IMAGE_EXT):
        return True
    if "image" in (parsed.query or "").lower():
        return True
    # CDN URLs without extensions (e.g. Bing thumbnails)
    host = (parsed.netloc or "").lower()
    return any(token in host for token in ("bing.net", "gstatic", "imgix", "cloudinary", "cdn"))


def _run_parallel(*tasks: Callable[[], T]) -> list[T]:
    if not tasks:
        return []
    if len(tasks) == 1:
        return [tasks[0]()]
    workers = min(len(tasks), 4)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(lambda fn: fn(), tasks))


def _fast_search_enabled() -> bool:
    return bool(get_orchestration_settings().orchestration_fast_search)


def _ddg_search(query: str, *, max_results: int = 5) -> list[dict[str, str]]:
    from ddgs import DDGS

    with DDGS() as ddgs:
        rows = list(ddgs.text(query, max_results=max_results))
    return [
        {
            "title": str(row.get("title") or ""),
            "url": str(row.get("href") or row.get("url") or ""),
            "snippet": str(row.get("body") or row.get("snippet") or ""),
        }
        for row in rows
    ]


def _ddg_image_search(query: str, *, max_results: int = 5) -> list[dict[str, str]]:
    from ddgs import DDGS

    with DDGS() as ddgs:
        rows = list(ddgs.images(query, max_results=max_results))
    images: list[dict[str, str]] = []
    for row in rows:
        images.append(
            {
                "title": str(row.get("title") or ""),
                "image_url": str(row.get("image") or ""),
                "thumbnail_url": str(row.get("thumbnail") or ""),
                "page_url": str(row.get("url") or ""),
                "width": str(row.get("width") or ""),
                "height": str(row.get("height") or ""),
                "source": str(row.get("source") or ""),
            }
        )
    return [img for img in images if img.get("image_url")]


@tool
def web_search(
    query: str,
    max_results: int = 5,
    include_images: bool = True,
    max_images: int = 5,
) -> str:
    """Search the public web via DuckDuckGo.

    Returns JSON with web results (title, url, snippet) and optional image results
    (image_url, thumbnail_url, page_url, title).
    """
    cleaned = query.strip()
    if not cleaned:
        return "[]"
    try:
        limit = max(1, min(int(max_results), 10))
        category = _detect_place_category(cleaned)
        location_hint = _extract_location_hint(cleaned)
        payload: dict[str, object] = {"query": cleaned}
        if location_hint:
            payload["location"] = location_hint
        if category:
            payload["category"] = category
            if _fast_search_enabled():
                if include_images:
                    results, images = _run_parallel(
                        lambda: _ddg_search(cleaned, max_results=limit),
                        lambda: _ddg_image_search(cleaned, max_results=max(6, min(int(max_images), 8))),
                    )
                    payload["results"] = results
                    payload["images"] = images
                else:
                    payload["results"] = _ddg_search(cleaned, max_results=limit)
            else:
                if include_images:
                    image_limit = max(8, min(int(max_images), 12))
                    results, images, contact_hints, rating_hints = _run_parallel(
                        lambda: _ddg_search(cleaned, max_results=limit),
                        lambda: _ddg_image_search(cleaned, max_results=image_limit),
                        lambda: _ddg_search(
                            f"{cleaned} {category} phone number contact call".strip(),
                            max_results=limit + 4,
                        ),
                        lambda: _ddg_search(
                            f"{cleaned} {category} rating reviews stars".strip(),
                            max_results=limit + 6,
                        ),
                    )
                    payload["results"] = results
                    payload["images"] = images
                    payload["contact_hints"] = contact_hints
                    payload["rating_hints"] = rating_hints
                else:
                    results, contact_hints, rating_hints = _run_parallel(
                        lambda: _ddg_search(cleaned, max_results=limit),
                        lambda: _ddg_search(
                            f"{cleaned} {category} phone number contact call".strip(),
                            max_results=limit + 4,
                        ),
                        lambda: _ddg_search(
                            f"{cleaned} {category} rating reviews stars".strip(),
                            max_results=limit + 6,
                        ),
                    )
                    payload["results"] = results
                    payload["contact_hints"] = contact_hints
                    payload["rating_hints"] = rating_hints
            payload["cards"] = build_place_cards({**payload, "category": category})
        else:
            if include_images:
                results, images = _run_parallel(
                    lambda: _ddg_search(cleaned, max_results=limit),
                    lambda: _ddg_image_search(cleaned, max_results=max(4, min(int(max_images), 8))),
                )
                payload["results"] = results
                payload["images"] = images
            else:
                payload["results"] = _ddg_search(cleaned, max_results=limit)
            payload["cards"] = build_web_cards(payload)
        return json.dumps(payload)
    except Exception as exc:
        return json.dumps({"error": f"Web search failed: {exc}"})


@tool
def fetch_webpage(
    url: str,
    max_chars: int = 12_000,
    include_images: bool = True,
    max_images: int = 12,
) -> str:
    """Fetch a URL and extract readable text plus image URLs from the page (httpx + HTML parsing)."""
    target = url.strip()
    if not target:
        return "No URL provided."
    try:
        with httpx.Client(
            timeout=_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": _USER_AGENT},
        ) as client:
            response = client.get(target)
            response.raise_for_status()
            final_url = str(response.url)
            content_type = (response.headers.get("content-type") or "").lower()
            raw = response.content[:_MAX_BYTES]

            if "html" not in content_type and not raw.lstrip().startswith(b"<"):
                text = raw.decode(errors="replace")
                if len(text) > max_chars:
                    text = text[:max_chars] + "\n\n[truncated]"
                return text or "No readable text found on this page."

            html = raw.decode(errors="replace")
            parser = _PageExtractor(final_url)
            parser.feed(html)
            text = parser.text() or html[:max_chars]
            if len(text) > max_chars:
                text = text[:max_chars] + "\n\n[truncated]"

            if not include_images:
                return text or "No readable text found on this page."

            image_limit = max(1, min(int(max_images), 20))
            payload = {
                "url": final_url,
                "text": text or "No readable text found on this page.",
                "images": parser.images(limit=image_limit),
            }
            return json.dumps(payload, indent=2)
    except Exception as exc:
        return f"Failed to fetch page: {exc}"
