from __future__ import annotations

import json
from typing import Any


def _normalize_item(
    *,
    image_url: str,
    thumbnail_url: str = "",
    page_url: str = "",
    title: str = "",
    alt: str = "",
    source: str = "",
) -> dict[str, str] | None:
    url = image_url.strip()
    if not url.startswith(("http://", "https://")):
        return None
    return {
        "image_url": url,
        "thumbnail_url": thumbnail_url.strip(),
        "page_url": page_url.strip(),
        "title": title.strip()[:240],
        "alt": (alt or title).strip()[:240],
        "source": source.strip()[:120],
    }


def _from_web_search_payload(payload: dict[str, Any]) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for row in payload.get("images") or []:
        if not isinstance(row, dict):
            continue
        normalized = _normalize_item(
            image_url=str(row.get("image_url") or ""),
            thumbnail_url=str(row.get("thumbnail_url") or ""),
            page_url=str(row.get("page_url") or ""),
            title=str(row.get("title") or ""),
            source=str(row.get("source") or ""),
        )
        if normalized:
            items.append(normalized)
    return items


def _from_fetch_payload(payload: dict[str, Any]) -> list[dict[str, str]]:
    page_url = str(payload.get("url") or "")
    items: list[dict[str, str]] = []
    for row in payload.get("images") or []:
        if not isinstance(row, dict):
            continue
        normalized = _normalize_item(
            image_url=str(row.get("url") or ""),
            page_url=page_url,
            alt=str(row.get("alt") or ""),
            title=str(row.get("alt") or ""),
        )
        if normalized:
            items.append(normalized)
    return items


def parse_tool_images(tool_name: str, output: Any) -> list[dict[str, str]]:
    """Extract image items from web_search / fetch_webpage tool output."""
    content = getattr(output, "content", output)
    if not isinstance(content, str):
        content = str(content)
    trimmed = content.strip()
    if not trimmed.startswith("{"):
        return []

    try:
        payload = json.loads(trimmed)
    except json.JSONDecodeError:
        return []

    if not isinstance(payload, dict):
        return []

    if tool_name == "web_search":
        return _from_web_search_payload(payload)
    if tool_name == "fetch_webpage":
        return _from_fetch_payload(payload)
    return []


def merge_image_results(
    existing: list[dict[str, str]],
    incoming: list[dict[str, str]],
    *,
    max_items: int = 12,
) -> list[dict[str, str]]:
    seen: set[str] = {item["image_url"] for item in existing}
    merged = list(existing)
    for item in incoming:
        url = item.get("image_url", "")
        if not url or url in seen:
            continue
        seen.add(url)
        merged.append(item)
        if len(merged) >= max_items:
            break
    return merged
