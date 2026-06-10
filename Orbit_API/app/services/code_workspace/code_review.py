from __future__ import annotations

import ast
import json
from typing import Any


def validate_source_syntax(
    content: str,
    *,
    language: str | None,
    file_path: str,
) -> dict[str, Any]:
    """Lightweight syntax validation before/after agent edits."""
    lang = (language or "").lower().strip()
    path_lower = file_path.lower()

    if lang in {"python", "py"} or path_lower.endswith(".py"):
        return _validate_python(content)
    if lang == "json" or path_lower.endswith(".json"):
        return _validate_json(content)
    if lang in {"typescript", "ts", "javascript", "js"} or path_lower.endswith((".ts", ".tsx", ".js", ".jsx")):
        return _validate_braces(content, file_path)

    return {"ok": True, "errors": []}


def _validate_python(content: str) -> dict[str, Any]:
    try:
        ast.parse(content)
        return {"ok": True, "errors": []}
    except SyntaxError as exc:
        line = exc.lineno or 1
        return {
            "ok": False,
            "errors": [
                {
                    "line": line,
                    "severity": "error",
                    "message": exc.msg or "Python syntax error",
                }
            ],
        }


def _validate_json(content: str) -> dict[str, Any]:
    stripped = content.strip()
    if not stripped:
        return {"ok": True, "errors": []}
    try:
        json.loads(stripped)
        return {"ok": True, "errors": []}
    except json.JSONDecodeError as exc:
        line = exc.lineno or 1
        return {
            "ok": False,
            "errors": [
                {
                    "line": line,
                    "severity": "error",
                    "message": exc.msg or "Invalid JSON",
                }
            ],
        }


def _validate_braces(content: str, file_path: str) -> dict[str, Any]:
    """Brace/paren balance check for JS/TS when a compiler is unavailable."""
    pairs = {"(": ")", "[": "]", "{": "}"}
    closing = set(pairs.values())
    stack: list[tuple[str, int]] = []
    line = 1
    in_string: str | None = None
    escape = False

    for index, char in enumerate(content):
        if char == "\n":
            line += 1
        if in_string:
            if escape:
                escape = False
                continue
            if char == "\\":
                escape = True
                continue
            if char == in_string:
                in_string = None
            continue

        if char in {"'", '"', "`"}:
            in_string = char
            continue

        if char in pairs:
            stack.append((char, line))
            continue

        if char in closing:
            if not stack:
                return {
                    "ok": False,
                    "errors": [
                        {
                            "line": line,
                            "severity": "error",
                            "message": f"Unexpected '{char}'",
                        }
                    ],
                }
            opener, _ = stack.pop()
            if pairs[opener] != char:
                return {
                    "ok": False,
                    "errors": [
                        {
                            "line": line,
                            "severity": "error",
                            "message": f"Mismatched '{char}' (expected '{pairs[opener]}')",
                        }
                    ],
                }

    if in_string:
        return {
            "ok": False,
            "errors": [
                {
                    "line": line,
                    "severity": "error",
                    "message": "Unterminated string literal",
                }
            ],
        }

    if stack:
        opener, opener_line = stack[-1]
        return {
            "ok": False,
            "errors": [
                {
                    "line": opener_line,
                    "severity": "error",
                    "message": f"Unclosed '{opener}'",
                }
            ],
        }

    return {"ok": True, "errors": []}
