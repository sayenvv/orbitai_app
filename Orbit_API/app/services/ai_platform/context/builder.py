"""Token-aware context assembly for each workflow stage."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.services.ai_platform.design_quality import extract_css_classes
from app.services.ai_platform.types import WorkflowContext


class ContextBuilder:
    MAX_TREE_LINES = 120
    MAX_FILE_SNIPPET_CHARS = 4000
    MAX_ERROR_LOG_CHARS = 6000

    def build(self, ctx: WorkflowContext, *, stage: str, role_key: str) -> str:
        sections: list[str] = [
            f"Stage: {stage}",
            f"Role: {role_key}",
            f"User prompt:\n{ctx.prompt.strip()}",
        ]

        if ctx.intent:
            sections.append(f"Intent:\n{ctx.intent}")

        if ctx.intent_metadata:
            sections.append(f"Intent metadata JSON:\n{self._json(ctx.intent_metadata)}")

        if ctx.requirements:
            sections.append(f"Requirements JSON:\n{self._json(ctx.requirements)}")

        if ctx.plan:
            sections.append(f"Plan JSON:\n{self._json(ctx.plan)}")

        if ctx.architecture:
            sections.append(f"Architecture JSON:\n{self._json(ctx.architecture)}")
            template_key = str(ctx.architecture.get("template_key") or "")
            if template_key == "static_html":
                sections.append(
                    "Stack: static HTML, CSS, and vanilla JS only. "
                    "Do not use React, JSX, TSX, npm, or framework components."
                )
            elif template_key == "nextjs_basic":
                sections.append("Stack: Next.js with TypeScript and React.")
            elif template_key == "fastapi_react":
                sections.append("Stack: FastAPI backend with a React frontend.")

        if ctx.tasks:
            task_limit = 12 if stage == "task_breakdown" else 40
            sections.append(f"Tasks JSON:\n{self._json({'tasks': ctx.tasks[:task_limit]})}")
            if stage == "task_breakdown":
                sections.append(
                    "Return at most 12 file-level tasks. Prioritize pages, layout, and key components."
                )
            if stage == "code_generation":
                sections.append(
                    "Generate ONLY the single file in Tasks JSON for this batch. "
                    "Deliver production-quality UI — never ship mismatched HTML/CSS class names. "
                    "For static HTML: HTML must use existing `.site-*` classes from styles.css. "
                    "For Next.js: keep className values aligned with app/globals.css. "
                    "Avoid external image URLs that may 404; prefer CSS gradients or existing media blocks. "
                    'Return exactly one entry in files[]. Return JSON only: '
                    '{"files":[{"path":"...","content":"..."}]}'
                )
                sections.extend(self._design_context(ctx))

        if ctx.file_tree:
            tree = "\n".join(ctx.file_tree[: self.MAX_TREE_LINES])
            sections.append(f"File tree:\n{tree}")

        if ctx.generated_files and stage in {"validation", "fix", "review", "documentation"}:
            preview_limit = 4 if stage == "review" else 12
            snippet_limit = 400 if stage == "review" else 800
            preview = []
            for item in ctx.generated_files[:preview_limit]:
                path = str(item.get("path") or item.get("file_path") or "")
                content = str(item.get("content") or "")
                if len(content) > snippet_limit:
                    content = content[:snippet_limit] + "\n…"
                preview.append({"path": path, "content": content})
            sections.append(f"Generated file previews:\n{self._json({'files': preview})}")
            if stage == "review":
                sections.append(
                    "Keep the review concise. Return compact JSON only — do not restate file contents."
                )

        if ctx.validation and stage in {"fix", "review"}:
            log_tail = str(ctx.validation.get("log") or "")[-3000:]
            sections.append(
                f"Validation JSON:\n{self._json({**ctx.validation, 'log': log_tail})}"
            )
        if stage == "fix" and ctx.validation:
            sections.append(
                "Return JSON only: "
                '{"patches":[{"path":"relative/path","operation":"replace","content":"..."}]}. '
                "Include patches only for files mentioned in the validation log."
            )

        if ctx.errors:
            joined = "\n".join(ctx.errors)[-self.MAX_ERROR_LOG_CHARS :]
            sections.append(f"Recent errors/logs:\n{joined}")

        sections.append(
            "Rules: respond with compact JSON only; do not include unrelated files; "
            "prefer patches over full regeneration when fixing."
        )
        return "\n\n".join(sections)

    def _design_context(self, ctx: WorkflowContext) -> list[str]:
        sections: list[str] = []
        template_key = str((ctx.architecture or {}).get("template_key") or "")

        css_path = None
        if template_key == "static_html":
            css_path = Path(ctx.workspace_path) / "styles.css"
        elif template_key == "nextjs_basic":
            css_path = Path(ctx.workspace_path) / "app" / "globals.css"

        if css_path and css_path.is_file():
            css_text = css_path.read_text(encoding="utf-8", errors="ignore")
            classes = sorted(extract_css_classes(css_text))
            if classes:
                preview = ", ".join(f".{name}" for name in classes[:48])
                sections.append(
                    "Existing CSS classes available (use these in HTML/JSX — do not invent new ones):\n"
                    f"{preview}"
                )

        sections.append(
            "Premium design checklist: responsive spacing, sticky header, clear hierarchy, "
            "accessible contrast, consistent buttons/cards, no broken asset links."
        )
        return sections

    @staticmethod
    def _json(value: Any) -> str:
        return json.dumps(value, indent=2, ensure_ascii=False)
