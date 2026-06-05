from __future__ import annotations

import json

from langchain_core.tools import tool

from orbit_orchestration.tools.card_builder import build_job_cards
from orbit_orchestration.tools.web_tools import _ddg_search


def _format_jobs(rows: list[dict[str, str]], *, source: str) -> str:
    payload: dict[str, object] = {"source": source, "results": rows}
    if not rows:
        payload["note"] = "No listings found."
    else:
        payload["cards"] = build_job_cards(payload)
    return json.dumps(payload)


@tool
def search_job_listings(query: str, location: str = "", max_results: int = 8) -> str:
    """Search job ads across Indeed, LinkedIn, and Glassdoor via web search."""
    parts = [query.strip(), location.strip(), "jobs"]
    search_q = " ".join(part for part in parts if part)
    rows = _ddg_search(
        f"{search_q} (site:indeed.com OR site:linkedin.com/jobs OR site:glassdoor.com)",
        max_results=max(1, min(int(max_results), 10)),
    )
    return _format_jobs(rows, source="indeed+linkedin+glassdoor")


@tool
def search_indeed_jobs(query: str, location: str = "", max_results: int = 6) -> str:
    """Search Indeed job listings only."""
    parts = [query.strip(), location.strip(), "site:indeed.com"]
    search_q = " ".join(part for part in parts if part)
    rows = _ddg_search(search_q, max_results=max(1, min(int(max_results), 10)))
    return _format_jobs(rows, source="indeed")


@tool
def search_linkedin_jobs(query: str, location: str = "", max_results: int = 6) -> str:
    """Search LinkedIn job listings only."""
    parts = [query.strip(), location.strip(), "site:linkedin.com/jobs"]
    search_q = " ".join(part for part in parts if part)
    rows = _ddg_search(search_q, max_results=max(1, min(int(max_results), 10)))
    return _format_jobs(rows, source="linkedin")
