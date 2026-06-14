"""Low-token workflow path for simple static HTML/CSS sites."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from app.services.ai_platform.project_routing import _prompt_requests_template, resolve_template_key
from app.services.ai_platform.types import WorkflowContext

_NO_FRAMEWORK = ("react", "next.js", "nextjs", "vue", "angular", "svelte", "fastapi")
_STATIC_SITE_HINTS = (
    "portfolio",
    "landing page",
    "personal site",
    "business website",
    "company site",
    "brochure site",
    "marketing site",
)


def is_static_fast_path_prompt(prompt: str) -> bool:
    if _prompt_requests_template(prompt, "static_html"):
        return True
    text = re.sub(r"\s+", " ", prompt.strip().lower())
    if any(hint in text for hint in _STATIC_SITE_HINTS) and not any(
        token in text for token in _NO_FRAMEWORK
    ):
        return True
    return False


def build_local_intent(prompt: str) -> dict[str, Any]:
    return {
        "intent": "project_generation",
        "project_type": "website",
        "requires_code_generation": True,
        "requires_zip": True,
        "framework_guess": "static_html",
    }


def build_local_requirements(prompt: str) -> dict[str, Any]:
    headline = prompt.strip().splitlines()[0][:80] or "Website"
    return {
        "project_name": headline,
        "features": ["Responsive layout", "Hero section", "Contact section"],
        "pages": ["Home", "Work", "Contact"],
        "tech_stack": ["HTML", "CSS", "JavaScript"],
        "non_functional_requirements": ["Mobile-first", "Accessible contrast"],
        "acceptance_criteria": [
            "Semantic HTML",
            "Styles load correctly",
            "No broken asset links",
        ],
    }


def build_local_plan() -> dict[str, Any]:
    return {
        "phases": [
            {
                "name": "Build",
                "tasks": ["Seed premium template", "Customize copy", "Package ZIP"],
            }
        ]
    }


def build_local_architecture(template_key: str = "static_html") -> dict[str, Any]:
    return {
        "framework": "Static HTML",
        "language": "HTML/CSS/JS",
        "folder_structure": ["index.html", "styles.css", "script.js"],
        "dependencies": [],
        "entry_points": ["index.html"],
        "build_command": "",
        "template_key": template_key,
    }


def prepare_static_fast_context(ctx: WorkflowContext) -> WorkflowContext:
    """Fill ctx with local planning outputs and mark the run as static fast path."""
    requirements = build_local_requirements(ctx.prompt)
    metadata = dict(ctx.intent_metadata or {})
    metadata["static_fast_path"] = True
    metadata.update(build_local_intent(ctx.prompt))
    preview = ctx.model_copy(update={"requirements": requirements, "intent_metadata": metadata})
    architecture = build_local_architecture(resolve_template_key(preview))
    return preview.model_copy(
        update={
            "intent": "project_generation",
            "requirements": requirements,
            "plan": build_local_plan(),
            "architecture": architecture,
        }
    )


def should_use_static_fast_path(ctx: WorkflowContext) -> bool:
    if ctx.intent_metadata.get("static_fast_path"):
        return True
    if not is_static_fast_path_prompt(ctx.prompt):
        return False
    return resolve_template_key(ctx) == "static_html"


def codegen_tasks(ctx: WorkflowContext) -> list[dict[str, Any]]:
    """One LLM call — customize landing copy only; CSS/JS stay from the premium template."""
    project_name = str((ctx.requirements or {}).get("project_name") or "Website")
    prompt_tail = ctx.prompt.strip()[:240]
    return [
        {
            "id": "T1",
            "file_path": "index.html",
            "instruction": (
                f"Customize headings, nav labels, hero text, card titles, and footer for: {prompt_tail}. "
                f"Project name: {project_name}. "
                "Keep the exact HTML structure and ALL `site-*` class names. "
                "Keep `<link rel=\"stylesheet\" href=\"styles.css\">` and `<script src=\"script.js\">`. "
                "Do not add images — keep CSS gradient media blocks."
            ),
        }
    ]


def build_compact_codegen_prompt(ctx: WorkflowContext, *, task: dict[str, Any]) -> str:
    file_path = str(task.get("file_path") or "index.html")
    workspace = Path(ctx.workspace_path or "")
    current = ""
    target = workspace / file_path
    if target.is_file():
        current = target.read_text(encoding="utf-8", errors="ignore")[:6500]

    project_name = str((ctx.requirements or {}).get("project_name") or "Website")
    return "\n\n".join(
        [
            f"User request:\n{ctx.prompt.strip()}",
            f"Project name: {project_name}",
            f"Edit only: {file_path}",
            str(task.get("instruction") or ""),
            "Rules: keep all `site-*` classes and structure; change text/branding only.",
            f"Current {file_path}:\n{current}" if current else "",
            f'Return JSON only: {{"files":[{{"path":"{file_path}","content":"..."}}]}}',
        ]
    )


def build_local_documentation(ctx: WorkflowContext) -> dict[str, Any]:
    name = str((ctx.requirements or {}).get("project_name") or "Website")
    readme = f"""# {name}

Static HTML/CSS site generated by Orbit.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

## Files

- `index.html` — main page
- `styles.css` — layout and theme
- `script.js` — navigation and interactions

## Customize

Edit copy in `index.html` and theme variables in `:root` inside `styles.css`.
"""
    return {"files": [{"path": "README.md", "content": readme}]}


def build_local_artifact(ctx: WorkflowContext) -> dict[str, Any]:
    run_id = ctx.workflow_run_id.split("-")[0]
    return {
        "artifact_name": f"project-{run_id}.zip",
        "include_paths": [],
        "exclude_paths": [
            "node_modules",
            ".next",
            "dist",
            "build",
            "__pycache__",
            ".git",
            ".env",
            ".checkpoints",
            "artifacts",
        ],
    }


def build_local_validation() -> dict[str, Any]:
    return {
        "status": "passed",
        "exit_code": 0,
        "log": "Static HTML project — no build step required.",
        "commands": [],
    }


def build_local_review(security_scan: dict[str, Any]) -> dict[str, Any]:
    findings = list(security_scan.get("findings") or [])
    return {
        "passed": bool(security_scan.get("passed", True)),
        "issues": ["Static fast path — security scan only."],
        "missing_files": [],
        "security_warnings": findings,
        "review_mode": "static_fast_path",
    }
