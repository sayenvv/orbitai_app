"""Rewrite proxied preview responses so assets load under the API proxy prefix."""

from __future__ import annotations

import re


def preview_proxy_prefix(run_id: str) -> str:
    return f"/api/platform/runs/{run_id}/preview/proxy"


def rewrite_preview_body(
    *,
    run_id: str,
    content: bytes,
    content_type: str | None,
) -> bytes:
    if not content:
        return content

    lowered = (content_type or "").lower()
    prefix = preview_proxy_prefix(run_id)

    if "text/html" in lowered:
        return _rewrite_html(content, prefix)
    if "text/css" in lowered:
        return _rewrite_css(content, prefix)
    if "javascript" in lowered or "ecmascript" in lowered or "json" in lowered:
        return _rewrite_js(content, prefix)
    return content


def _rewrite_html(content: bytes, prefix: str) -> bytes:
    text = content.decode("utf-8", errors="ignore")
    base_href = f'{prefix.rstrip("/")}/'

    text = _rewrite_root_absolute_refs(text, prefix)
    text = _rewrite_relative_refs(text, prefix)

    if "<base" not in text.lower():
        if re.search(r"<head[^>]*>", text, flags=re.IGNORECASE):
            text = re.sub(
                r"(<head[^>]*>)",
                rf'\1<base href="{base_href}">',
                text,
                count=1,
                flags=re.IGNORECASE,
            )
        else:
            text = f'<base href="{base_href}">{text}'

    return text.encode("utf-8")


def _rewrite_css(content: bytes, prefix: str) -> bytes:
    text = content.decode("utf-8", errors="ignore")
    text = _rewrite_root_absolute_refs(text, prefix)
    text = _rewrite_relative_refs(text, prefix)
    return text.encode("utf-8")


def _rewrite_js(content: bytes, prefix: str) -> bytes:
    text = content.decode("utf-8", errors="ignore")
    text = _rewrite_root_absolute_refs(text, prefix)
    text = _rewrite_relative_refs(text, prefix)
    return text.encode("utf-8")


_SKIP_SCHEMES = re.compile(
    r"^(?:https?:|//|#|mailto:|tel:|data:|javascript:|blob:)",
    flags=re.IGNORECASE,
)


def _rewrite_relative_refs(text: str, prefix: str) -> str:
    """Turn relative asset URLs into absolute proxy paths (more reliable than base alone)."""

    def attr_repl(match: re.Match[str]) -> str:
        path = match.group("path")
        if _SKIP_SCHEMES.match(path):
            return match.group(0)
        if path.startswith("/"):
            return match.group(0)
        clean = path.lstrip("./")
        return f'{match.group("attr")}={match.group("quote")}{prefix}/{clean}{match.group("quote")}'

    attr_pattern = re.compile(
        r'(?P<attr>href|src|action)\s*=\s*(?P<quote>["\'])'
        r'(?P<path>(?!https?:)(?!//)(?!#)(?!mailto:)(?!tel:)(?!data:)(?!javascript:)[^"\']+)'
        r'(?P=quote)',
        flags=re.IGNORECASE,
    )
    text = attr_pattern.sub(attr_repl, text)

    def url_repl(match: re.Match[str]) -> str:
        path = match.group("path")
        if _SKIP_SCHEMES.match(path) or path.startswith("/"):
            return match.group(0)
        clean = path.lstrip("./")
        quote = match.group("quote") or ""
        return f'url({quote}{prefix}/{clean}{quote})'

    url_pattern = re.compile(
        r'url\(\s*(?P<quote>["\']?)'
        r'(?P<path>(?!https?:)(?!//)(?!data:)(?!#)[^)"\']+)'
        r'\s*(?P=quote)\s*\)',
        flags=re.IGNORECASE,
    )
    text = url_pattern.sub(url_repl, text)

    return text


def _rewrite_root_absolute_refs(text: str, prefix: str) -> str:
    """Prefix root-absolute paths so they resolve through the preview proxy."""
    attr_pattern = re.compile(
        r'(?P<attr>href|src|action)\s*=\s*(?P<quote>["\'])/(?![/\s])',
        flags=re.IGNORECASE,
    )
    text = attr_pattern.sub(rf'\g<attr>=\g<quote>{prefix}/', text)

    url_pattern = re.compile(r'url\(\s*(?P<quote>["\']?)/(?![/\s])', flags=re.IGNORECASE)
    text = url_pattern.sub(rf'url(\g<quote>{prefix}/', text)

    import_pattern = re.compile(r'import\s*(?P<quote>["\'])/(?![/\s])', flags=re.IGNORECASE)
    text = import_pattern.sub(rf'import \g<quote>{prefix}/', text)

    # Next.js / webpack common patterns
    text = text.replace('"/_next/', f'"{prefix}/_next/')
    text = text.replace("'/_next/", f"'{prefix}/_next/")
    text = text.replace("('/_next/", f"('{prefix}/_next/")

    return text
