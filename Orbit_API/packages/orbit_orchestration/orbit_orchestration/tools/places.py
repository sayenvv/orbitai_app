from __future__ import annotations

import json

from langchain_core.tools import tool

from orbit_orchestration.tools.card_builder import build_place_cards
from orbit_orchestration.tools.web_tools import _ddg_image_search, _ddg_search, _fast_search_enabled, _run_parallel

_PLACE_ALIASES = {
    "hotel": "hotel",
    "hotels": "hotel",
    "restaurant": "restaurant",
    "restaurants": "restaurant",
    "cafe": "cafe",
    "cafes": "cafe",
    "place": "place",
    "places": "place",
}


@tool
def search_places(
    query: str,
    location: str = "",
    category: str = "hotel",
    max_results: int = 6,
) -> str:
    """Search hotels, restaurants, or places with structured card data (image, rating, price, address hints)."""
    cleaned_query = query.strip()
    if not cleaned_query and not location.strip():
        return json.dumps({"error": "Provide a place query or location."})

    normalized_category = _PLACE_ALIASES.get(category.strip().lower(), "place")
    limit = max(1, min(int(max_results), 8))
    location_part = location.strip()

    search_terms = " ".join(
        part
        for part in [
            cleaned_query,
            location_part,
            normalized_category,
            "reviews rating booking",
        ]
        if part
    )
    image_query = " ".join(
        part for part in [cleaned_query, location_part, normalized_category] if part
    )

    if _fast_search_enabled():
        results, images = _run_parallel(
            lambda: _ddg_search(search_terms, max_results=limit),
            lambda: _ddg_image_search(image_query, max_results=max(limit, 6)),
        )
        contact_hints: list[dict[str, str]] = []
        rating_hints: list[dict[str, str]] = []
    else:
        contact_terms = " ".join(
            part
            for part in [
                cleaned_query,
                location_part,
                normalized_category,
                "phone number contact call",
            ]
            if part
        )
        rating_terms = " ".join(
            part
            for part in [
                cleaned_query,
                location_part,
                normalized_category,
                "rating reviews stars tripadvisor goibibo",
            ]
            if part
        )
        results, contact_hints, rating_hints, images = _run_parallel(
            lambda: _ddg_search(search_terms, max_results=limit),
            lambda: _ddg_search(contact_terms, max_results=limit + 2),
            lambda: _ddg_search(rating_terms, max_results=limit + 3),
            lambda: _ddg_image_search(image_query, max_results=max(limit, 6)),
        )

    payload = {
        "category": normalized_category,
        "query": cleaned_query,
        "location": location_part,
        "results": results[:limit],
        "contact_hints": contact_hints,
        "rating_hints": rating_hints,
        "images": images,
    }
    payload["cards"] = build_place_cards(payload)
    return json.dumps(payload)
