"""Choose project scaffold and file tasks from user intent — not always React/Next.js."""

from __future__ import annotations

import re
from typing import Any

from app.services.ai_platform.seeds.defaults import PROJECT_TEMPLATES
from app.services.ai_platform.types import WorkflowContext

_STATIC_HTML_PHRASES = (
    "html css",
    "html/css",
    "html and css",
    "plain html",
    "static html",
    "static website",
    "static site",
    "simple html",
    "simple website",
    "simple site",
    "vanilla html",
    "vanilla css",
    "pure html",
    "basic html",
    "html only",
    "no react",
    "without react",
    "no framework",
    "no javascript framework",
    "landing page html",
)

_FRAMEWORK_KEYWORDS: dict[str, tuple[str, ...]] = {
    "static_html": _STATIC_HTML_PHRASES,
    "fastapi_react": (
        "fastapi",
        "full stack",
        "fullstack",
        "backend and frontend",
        "python api",
    ),
    "nextjs_basic": (
        "next.js",
        "nextjs",
        "react",
        "typescript react",
    ),
}


def _prompt_lower(prompt: str) -> str:
    return re.sub(r"\s+", " ", prompt.strip().lower())


def _prompt_requests_template(prompt: str, template_key: str) -> bool:
    text = _prompt_lower(prompt)
    return any(phrase in text for phrase in _FRAMEWORK_KEYWORDS.get(template_key, ()))


def _stack_text(requirements: dict[str, Any]) -> str:
    stack = requirements.get("tech_stack") or requirements.get("technology") or []
    if isinstance(stack, str):
        parts = [stack]
    elif isinstance(stack, list):
        parts = [str(item) for item in stack]
    else:
        parts = [str(stack)]
    return " ".join(parts).lower()


def resolve_template_key(
    ctx: WorkflowContext,
    architecture: dict[str, Any] | None = None,
) -> str:
    """Pick a scaffold template from prompt, intent, requirements, and architecture."""
    arch = architecture or ctx.architecture or {}
    arch_key = str(arch.get("template_key") or "").strip()

    if _prompt_requests_template(ctx.prompt, "static_html"):
        return "static_html"
    if _prompt_requests_template(ctx.prompt, "fastapi_react"):
        return "fastapi_react"
    if _prompt_requests_template(ctx.prompt, "nextjs_basic"):
        return "nextjs_basic"

    guess = str((ctx.intent_metadata or {}).get("framework_guess") or "").lower()
    if guess in {"html", "static", "static_html", "css", "vanilla"}:
        return "static_html"
    if guess in {"fastapi", "fullstack", "api"}:
        return "fastapi_react"
    if guess in {"nextjs", "next.js", "react"}:
        return "nextjs_basic"

    stack = _stack_text(ctx.requirements)
    if stack:
        uses_html = any(token in stack for token in ("html", "css"))
        uses_js_framework = any(
            token in stack for token in ("react", "next", "vue", "angular", "svelte")
        )
        if uses_html and not uses_js_framework:
            return "static_html"
        if "fastapi" in stack or ("python" in stack and "react" in stack):
            return "fastapi_react"
        if uses_js_framework:
            return "nextjs_basic"

    framework = str(arch.get("framework") or "").lower()
    if any(token in framework for token in ("static", "html/css", "html")):
        return "static_html"
    if "fastapi" in framework:
        return "fastapi_react"

    if arch_key in PROJECT_TEMPLATES:
        return arch_key

    project_type = str((ctx.intent_metadata or {}).get("project_type") or "").lower()
    if project_type == "api":
        return "fastapi_react"

    return "nextjs_basic"


def derive_tasks(ctx: WorkflowContext, template_key: str | None = None) -> list[dict[str, Any]]:
    """Build file tasks locally — paths must match the chosen template."""
    key = template_key or resolve_template_key(ctx)
    project_name = str((ctx.requirements or {}).get("project_name") or "project")
    pages = list((ctx.requirements or {}).get("pages") or [])
    features = list((ctx.requirements or {}).get("features") or [])
    prompt_tail = ctx.prompt[:280]

    if key == "static_html":
        return _derive_static_html_tasks(project_name, pages, features, prompt_tail)
    if key == "fastapi_react":
        return _derive_fastapi_react_tasks(project_name, pages, features, prompt_tail)
    return _derive_nextjs_tasks(project_name, pages, features, prompt_tail)


def _derive_static_html_tasks(
    project_name: str,
    pages: list[Any],
    features: list[Any],
    prompt_tail: str,
) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = [
        {
            "id": "T1",
            "file_path": "styles.css",
            "instruction": (
                "Customize the premium theme for the user request. "
                f"Project: {project_name}. Context: {prompt_tail}. "
                "ONLY adjust :root CSS variables (colors, fonts, radius) and text-specific minor tweaks. "
                "Do NOT rename or remove any `.site-*` class selectors. Keep responsive breakpoints intact."
            ),
        },
        {
            "id": "T2",
            "file_path": "index.html",
            "instruction": (
                f"Customize page copy, headings, nav labels, cards, and form text for: {prompt_tail}. "
                f"Project name: {project_name}. "
                "Keep the exact HTML structure and ALL existing `site-*` class names unchanged. "
                "Keep `<link rel=\"stylesheet\" href=\"styles.css\">` and `<script src=\"script.js\">`. "
                "Do not reference missing image files — the template uses CSS gradient media blocks."
            ),
        },
        {
            "id": "T3",
            "file_path": "script.js",
            "instruction": (
                "Keep mobile navigation toggle and smooth scrolling. "
                "You may add small enhancements (active nav state, form focus) without external libraries."
            ),
        },
    ]

    if features:
        tasks.append(
            {
                "id": "T_features",
                "file_path": "index.html",
                "instruction": (
                    "Add or refine a features/services section in index.html using existing `site-*` classes. "
                    "Features: " + ", ".join(str(f) for f in features[:6])
                ),
            }
        )

    return tasks[:4]


def _derive_nextjs_tasks(
    project_name: str,
    pages: list[Any],
    features: list[Any],
    prompt_tail: str,
) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = [
        {
            "id": "T1",
            "file_path": "app/globals.css",
            "instruction": (
                "Customize theme variables and polish the premium layout styling. "
                f"Project: {project_name}. Context: {prompt_tail}. "
                "Keep existing class names used in app/page.tsx — do not rename selectors."
            ),
        },
        {
            "id": "T2",
            "file_path": "app/page.tsx",
            "instruction": (
                f"Customize landing page copy, sections, and cards for: {prompt_tail}. "
                f"Project name: {project_name}. "
                "Keep the existing component structure and className values intact."
            ),
        },
        {
            "id": "T3",
            "file_path": "app/layout.tsx",
            "instruction": f"Update metadata title/description for {project_name}. Keep layout structure unchanged.",
        },
    ]

    for idx, page in enumerate(pages[:4], start=4):
        slug = _slugify(str(page))
        tasks.append(
            {
                "id": f"T{idx}",
                "file_path": f"app/{slug}/page.tsx",
                "instruction": f"Create the {page} page.",
            }
        )

    if features:
        tasks.append(
            {
                "id": "T_features",
                "file_path": "components/features.tsx",
                "instruction": (
                    "Create a features section component for: "
                    + ", ".join(str(f) for f in features[:6])
                ),
            }
        )

    return tasks[:8]


def _derive_fastapi_react_tasks(
    project_name: str,
    pages: list[Any],
    features: list[Any],
    prompt_tail: str,
) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = [
        {
            "id": "T1",
            "file_path": "backend/main.py",
            "instruction": f"Implement FastAPI routes and health check for {project_name}.",
        },
        {
            "id": "T2",
            "file_path": "frontend/src/App.tsx",
            "instruction": f"Build the React app shell for: {prompt_tail}.",
        },
        {
            "id": "T3",
            "file_path": "frontend/src/index.css",
            "instruction": "Add base styling for the frontend.",
        },
    ]

    for idx, page in enumerate(pages[:3], start=4):
        slug = _slugify(str(page))
        tasks.append(
            {
                "id": f"T{idx}",
                "file_path": f"frontend/src/pages/{slug}.tsx",
                "instruction": f"Create the {page} page component.",
            }
        )

    if features:
        tasks.append(
            {
                "id": "T_features",
                "file_path": "frontend/src/components/Features.tsx",
                "instruction": (
                    "Create a features section for: "
                    + ", ".join(str(f) for f in features[:6])
                ),
            }
        )

    return tasks[:8]


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "page"
