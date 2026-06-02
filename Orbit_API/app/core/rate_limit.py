"""IP-based in-memory rate limiting for sensitive API routes."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from threading import Lock
from time import time

from fastapi import HTTPException, Request, status


@dataclass
class _RateBucket:
    timestamps: list[float] = field(default_factory=list)


class RateLimiter:
    """Thread-safe sliding-window limiter keyed by caller + route group."""

    def __init__(self) -> None:
        self._buckets: dict[str, _RateBucket] = defaultdict(_RateBucket)
        self._lock = Lock()

    def enforce(self, *, scope: str, key: str, limit: int, window_seconds: int) -> None:
        if limit <= 0:
            return

        bucket_key = f"{scope}:{key}"
        now = time()

        with self._lock:
            bucket = self._buckets[bucket_key]
            bucket.timestamps = [ts for ts in bucket.timestamps if now - ts < window_seconds]

            if len(bucket.timestamps) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again shortly.",
                )

            bucket.timestamps.append(now)


rate_limiter = RateLimiter()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_rate_limit(
    request: Request,
    *,
    scope: str,
    limit: int,
    window_seconds: int = 60,
) -> None:
    rate_limiter.enforce(
        scope=scope,
        key=client_ip(request),
        limit=limit,
        window_seconds=window_seconds,
    )
