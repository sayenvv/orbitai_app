"""Post-generation fixes for static HTML/CSS design coherence."""

from __future__ import annotations

import re
from pathlib import Path


def extract_css_classes(css_text: str) -> set[str]:
    return set(re.findall(r"\.([a-zA-Z][a-zA-Z0-9_-]*)", css_text))


def repair_static_project(workspace_path: str) -> list[str]:
    """Normalize common static-site issues after LLM file generation."""
    root = Path(workspace_path)
    fixes: list[str] = []

    html_path = root / "index.html"
    css_candidates = [root / "styles.css", root / "css" / "styles.css", root / "assets" / "styles.css"]
    css_path = next((path for path in css_candidates if path.is_file()), None)

    if not html_path.is_file() or css_path is None:
        return fixes

    html = html_path.read_text(encoding="utf-8", errors="ignore")
    original = html

    # Fix broken meta tags like charset="utf-8">">
    html = re.sub(r'(<meta[^>]+)"\s*">\s*">', r'\1">', html, flags=re.IGNORECASE)
    html = re.sub(r'charset="utf-8"\s*">\s*">', 'charset="utf-8">', html, flags=re.IGNORECASE)

    rel_css = css_path.relative_to(root).as_posix()
    html = re.sub(
        r'<link([^>]*?)href=["\'][^"\']*styles\.css["\']',
        rf'<link\1href="{rel_css}"',
        html,
        count=1,
        flags=re.IGNORECASE,
    )

    script_candidates = [root / "script.js", root / "js" / "main.js", root / "assets" / "script.js"]
    script_path = next((path for path in script_candidates if path.is_file()), root / "script.js")
    if script_path.is_file():
        rel_js = script_path.relative_to(root).as_posix()
        if "<script" in html.lower():
            html = re.sub(
                r'<script([^>]*?)src=["\'][^"\']+["\']',
                rf'<script\1src="{rel_js}"',
                html,
                count=1,
                flags=re.IGNORECASE,
            )

    if html != original:
        html_path.write_text(html, encoding="utf-8")
        fixes.append(f"Normalized asset links in {html_path.name}")

    return fixes
