from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

router = APIRouter(tags=["public"])

_USER_AGENT = "OrbitBot/1.0 (compatible; +https://clovai.app)"
_ALLOWED_TYPES = frozenset(
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/avif",
        "image/svg+xml",
        "image/bmp",
    }
)
_MAX_BYTES = 5_000_000


def _is_blocked_host(hostname: str) -> bool:
    if not hostname:
        return True
    lowered = hostname.lower().strip(".")
    if lowered in {"localhost", "127.0.0.1", "0.0.0.0"}:
        return True
    if lowered.endswith(".local") or lowered.endswith(".internal"):
        return True
    try:
        addr = ipaddress.ip_address(lowered)
        return addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved
    except ValueError:
        pass
    try:
        infos = socket.getaddrinfo(lowered, None)
        for info in infos:
            ip = info[4][0]
            parsed = ipaddress.ip_address(ip)
            if parsed.is_private or parsed.is_loopback or parsed.is_link_local or parsed.is_reserved:
                return True
    except OSError:
        return True
    return False


def _normalize_target(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Only http and https image URLs are allowed.")
    if not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid image URL.")
    if _is_blocked_host(parsed.hostname or ""):
        raise HTTPException(status_code=400, detail="Image host is not allowed.")
    return url.strip()


@router.get("/media/image")
def proxy_image(url: str = Query(..., min_length=8, max_length=2048)) -> Response:
    """Proxy external images so the chat UI can render search results under a strict CSP."""
    target = _normalize_target(url)
    try:
        with httpx.Client(
            timeout=12.0,
            follow_redirects=True,
            headers={"User-Agent": _USER_AGENT, "Accept": "image/*,*/*;q=0.8"},
        ) as client:
            response = client.get(target)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch image: {exc}") from exc

    content_type = (response.headers.get("content-type") or "").split(";")[0].strip().lower()
    if content_type and content_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="URL did not return an image.")

    body = response.content[:_MAX_BYTES]
    if not body:
        raise HTTPException(status_code=502, detail="Empty image response.")

    return Response(
        content=body,
        media_type=content_type or "image/jpeg",
        headers={
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            "X-Content-Type-Options": "nosniff",
        },
    )
