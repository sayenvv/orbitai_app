from __future__ import annotations

import re
from typing import Callable, Literal

from clovai_apps.code_workspace.schemas import CodeWorkspaceNode, CodeWorkspaceSearchMatch

DEFAULT_MAX_RESULTS = 200


def _parse_extension_filter(query: str) -> str | None:
    trimmed = query.strip()
    if re.fullmatch(r"\*?\.[a-z0-9]+", trimmed, flags=re.IGNORECASE):
        return trimmed.lstrip("*.").lower()
    return None


def _file_extension(name: str) -> str:
    dot_index = name.rfind(".")
    if dot_index <= 0:
        return ""
    return name[dot_index + 1 :].lower()


def _find_match_positions(text: str, query: str, *, case_sensitive: bool) -> list[tuple[int, int]]:
    if not query:
        return []

    haystack = text if case_sensitive else text.lower()
    needle = query if case_sensitive else query.lower()
    matches: list[tuple[int, int]] = []
    start = 0

    while start < len(haystack):
        index = haystack.find(needle, start)
        if index == -1:
            break
        matches.append((index, index + len(needle)))
        start = index + max(len(needle), 1)

    return matches


def _push_match(
    results: list[CodeWorkspaceSearchMatch],
    match: CodeWorkspaceSearchMatch,
    *,
    max_results: int,
) -> bool:
    results.append(match)
    return len(results) >= max_results


def _add_filename_matches(
    results: list[CodeWorkspaceSearchMatch],
    node: CodeWorkspaceNode,
    file_path: str,
    query: str,
    *,
    case_sensitive: bool,
    max_results: int,
) -> bool:
    for start, end in _find_match_positions(node.name, query, case_sensitive=case_sensitive):
        if _push_match(
            results,
            CodeWorkspaceSearchMatch(
                file_id=node.id,
                file_path=file_path,
                line=1,
                column=start + 1,
                line_text=node.name,
                match_start=start,
                match_end=end,
                kind="filename",
            ),
            max_results=max_results,
        ):
            return True

    if file_path != node.name:
        for start, end in _find_match_positions(file_path, query, case_sensitive=case_sensitive):
            if _push_match(
                results,
                CodeWorkspaceSearchMatch(
                    file_id=node.id,
                    file_path=file_path,
                    line=1,
                    column=start + 1,
                    line_text=file_path,
                    match_start=start,
                    match_end=end,
                    kind="filename",
                ),
                max_results=max_results,
            ):
                return True

    return False


def search_project_nodes(
    nodes: list[CodeWorkspaceNode],
    file_contents: dict[str, str],
    query: str,
    *,
    case_sensitive: bool = False,
    max_results: int = DEFAULT_MAX_RESULTS,
    mode: Literal["all", "filename", "content"] = "all",
    resolve_path: Callable[[str], str],
) -> list[CodeWorkspaceSearchMatch]:
    trimmed = query.strip()
    if not trimmed:
        return []

    extension_filter = _parse_extension_filter(trimmed)
    is_extension_only_query = extension_filter is not None
    results: list[CodeWorkspaceSearchMatch] = []
    seen_filename_matches: set[str] = set()
    capped = max(1, min(max_results, DEFAULT_MAX_RESULTS))

    file_nodes = [node for node in nodes if node.kind == "file"]
    scoped_files = (
        [node for node in file_nodes if _file_extension(node.name) == extension_filter]
        if extension_filter
        else file_nodes
    )

    if mode in {"all", "filename"}:
        for node in scoped_files:
            file_path = resolve_path(node.id)

            if is_extension_only_query:
                ext = f".{extension_filter}"
                match_start = max(file_path.rfind(ext), node.name.rfind(ext))
                match_end = match_start + len(ext) if match_start >= 0 else len(file_path)
                dedupe_key = f"{node.id}:ext"
                if dedupe_key in seen_filename_matches:
                    continue
                seen_filename_matches.add(dedupe_key)
                if _push_match(
                    results,
                    CodeWorkspaceSearchMatch(
                        file_id=node.id,
                        file_path=file_path,
                        line=1,
                        column=match_start + 1 if match_start >= 0 else 1,
                        line_text=file_path,
                        match_start=max(0, match_start),
                        match_end=match_end,
                        kind="filename",
                    ),
                    max_results=capped,
                ):
                    return results
                continue

            if _add_filename_matches(
                results,
                node,
                file_path,
                trimmed,
                case_sensitive=case_sensitive,
                max_results=capped,
            ):
                return results

    if mode in {"all", "content"}:
        for node in scoped_files:
            content = file_contents.get(node.id, "")
            lines = content.split("\n")
            file_path = resolve_path(node.id)

            for line_index, line_text in enumerate(lines):
                for start, end in _find_match_positions(line_text, trimmed, case_sensitive=case_sensitive):
                    if _push_match(
                        results,
                        CodeWorkspaceSearchMatch(
                            file_id=node.id,
                            file_path=file_path,
                            line=line_index + 1,
                            column=start + 1,
                            line_text=line_text,
                            match_start=start,
                            match_end=end,
                            kind="content",
                        ),
                        max_results=capped,
                    ):
                        return results

    return results
