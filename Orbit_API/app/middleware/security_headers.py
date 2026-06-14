from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

# Strict CSP for JSON API responses (no browser document rendering).
_API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"

# Swagger UI / ReDoc load assets from jsDelivr and inline boot scripts.
_DOCS_CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "img-src 'self' data: https://fastapi.tiangolo.com; "
    "font-src 'self' data: https://cdn.jsdelivr.net; "
    "connect-src 'self'; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "object-src 'none'"
)

# Generated app previews are HTML documents with linked CSS/JS assets.
_PREVIEW_CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob: https:; "
    "font-src 'self' data:; "
    "connect-src 'self' ws: wss:; "
    "frame-ancestors 'self'; "
    "base-uri 'self'; "
    "object-src 'none'"
)


def _is_interactive_docs_path(path: str) -> bool:
    return path.startswith("/docs") or path.startswith("/redoc")


def _is_preview_proxy_path(path: str) -> bool:
    return "/preview/proxy" in path


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
        if _is_preview_proxy_path(request.url.path):
            response.headers["Content-Security-Policy"] = _PREVIEW_CSP
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
        elif _is_interactive_docs_path(request.url.path):
            response.headers["Content-Security-Policy"] = _DOCS_CSP
            response.headers["X-Frame-Options"] = "DENY"
        else:
            response.headers["Content-Security-Policy"] = _API_CSP
            response.headers["X-Frame-Options"] = "DENY"
        if settings.use_strict_transport_security:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )
        return response
