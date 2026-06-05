from __future__ import annotations

import json
import re
import uuid
from typing import Any
from urllib.parse import urlparse


def _card_id() -> str:
    return str(uuid.uuid4())


_SITE_SUFFIXES = (
    "booking.com",
    "hotels.com",
    "expedia",
    "tripadvisor",
    "agoda",
    "kayak",
    "trivago",
    "hotwire",
    "priceline",
    "google.com",
    "yelp",
    "trip.com",
    "goibibo",
    "makemytrip",
    "oyo",
    "trivago",
    "cleartrip",
)


def _clean_image_listing_title(title: str) -> str:
    cleaned = title.strip()
    photos_match = re.search(
        r"photos?\s+of\s+(.+?)(?:\s+on\s+|\s+-\s+|$)",
        cleaned,
        flags=re.I,
    )
    if photos_match:
        cleaned = photos_match.group(1).strip()
    cleaned = re.sub(
        r"\bon\s+(?:goibibo|booking\.com|tripadvisor|makemytrip|agoda|expedia|hotels\.com|oyo|cleartrip)\b",
        "",
        cleaned,
        flags=re.I,
    )
    cleaned = re.sub(r"\bBOOK\b", "", cleaned, flags=re.I).strip(" -|•")
    return cleaned


def _clean_title(title: str) -> str:
    cleaned = _clean_image_listing_title(title.strip()) or title.strip()
    for sep in (" | ", " - ", " – ", " — ", " • "):
        if sep in cleaned:
            parts = [part.strip() for part in cleaned.split(sep) if part.strip()]
            kept = [
                part
                for part in parts
                if not any(site in part.lower() for site in _SITE_SUFFIXES)
            ]
            if kept:
                cleaned = kept[0]
                break
    cleaned = re.sub(
        r"\s*[-|•]\s*(?:(?:review|reviews|booking|deals|prices|photos?)\b.*)$",
        "",
        cleaned,
        flags=re.I,
    ).strip(" -|•")
    return cleaned[:120] or title[:120]


def _detect_place_category(text: str) -> str | None:
    if re.search(r"\b(hotel|hotels|resort|hostel|accommodation|stay|lodging|motel|inn)\b", text, re.I):
        return "hotel"
    if re.search(r"\b(restaurant|restaurants|cafe|café|dining|eatery)\b", text, re.I):
        return "restaurant"
    return None


def _extract_location_hint(text: str) -> str:
    match = re.search(
        r"\b(?:in|near|at)\s+([A-Z][\w\s.'()-]{2,40})",
        text,
        flags=re.I,
    )
    if match:
        return match.group(1).strip(" .,")[:80]
    return ""


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return ""


def _normalize_rating_value(value: float) -> str | None:
    if value <= 0:
        return None
    if value <= 5:
        return f"{value:.1f}"
    if value <= 10:
        return f"{value / 2:.1f}"
    return None


def _parse_rating(text: str) -> str | None:
    patterns = [
        r"(\d(?:\.\d)?)\s*/\s*10",
        r"(\d(?:\.\d)?)\s*/\s*5",
        r"(\d(?:\.\d)?)\s*out of\s*5",
        r"rated\s+(\d(?:\.\d)?)",
        r"rating[:\s]+(\d(?:\.\d)?)",
        r"(\d(?:\.\d)?)\s*(?:stars?|★|⭐)",
        r"(?:stars?|★|⭐)\s*(\d(?:\.\d)?)",
        r"(\d(?:\.\d)?)\s*(?:guest rating|user rating|review score|avg\.? rating)",
        r"(\d(?:\.\d)?)\s*\/\s*(?:5\s*)?stars?",
        r"reviews?\s+(\d(?:\.\d)?)\s*/",
        r"score[:\s]+(\d(?:\.\d)?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            normalized = _normalize_rating_value(float(match.group(1)))
            if normalized:
                return normalized

    star_class = re.search(r"\b([1-5])\s*-?\s*star(?:\s+hotel|\s+property|\s+resort)?\b", text, re.I)
    if star_class:
        mapping = {5: "4.6", 4: "4.1", 3: "3.6", 2: "3.0", 1: "2.5"}
        return mapping.get(int(star_class.group(1)))
    return None


def _tokenize(text: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9]{3,}", text.lower())}


def _parse_email(text: str) -> str | None:
    match = re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text)
    return match.group(0)[:120] if match else None


def _normalize_phone(raw: str) -> str | None:
    cleaned = raw.strip()
    digits = re.sub(r"[^\d+]", "", cleaned)
    if digits.startswith("+") and len(digits) >= 11:
        return cleaned[:24]
    if len(digits) == 10 and digits[0] in "6789":
        return f"+91 {digits[:5]} {digits[5:]}"
    if len(digits) >= 10 and digits.startswith("0"):
        return cleaned[:24]
    if len(digits) >= 8:
        return cleaned[:24]
    return None


def _parse_phone(text: str) -> str | None:
    patterns = [
        r"(?:tel(?:ephone)?|phone|mobile|call|contact|reservations?|reach us|whatsapp)[:\s#]*([+\d][\d\s().-]{8,22})",
        r"\b(\+91[\s.-]?\d{10})\b",
        r"\b(\+91[\s.-]?\d{5}[\s.-]?\d{5})\b",
        r"(?<!\d)([6-9]\d{9})(?!\d)",
        r"\b(0\d{2,4}[\s.-]?\d{6,8})\b",
        r"\b(\+\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3,4}[\s.-]?\d{3,6})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            normalized = _normalize_phone(match.group(1))
            if normalized:
                return normalized
    return None


def _match_result_snippet(title: str, results: list[dict[str, Any]]) -> str:
    name_tokens = _tokenize(_clean_title(title))
    if not name_tokens:
        return ""
    best_snippet = ""
    best_score = 0
    for row in results:
        if not isinstance(row, dict):
            continue
        row_title = str(row.get("title") or "")
        row_snippet = str(row.get("snippet") or "")
        score = len(name_tokens & _tokenize(f"{row_title} {row_snippet}"))
        if score > best_score:
            best_score = score
            best_snippet = f"{row_title} {row_snippet}".strip()
    return best_snippet


def _details_from_hints(title: str, hints: list[dict[str, Any]]) -> dict[str, str | None]:
    name_tokens = _tokenize(_clean_title(title))
    best = {
        "phone": None,
        "email": None,
        "rating": None,
        "price": None,
    }
    best_score = -1
    for row in hints:
        if not isinstance(row, dict):
            continue
        blob = f"{row.get('title') or ''} {row.get('snippet') or ''}"
        score = len(name_tokens & _tokenize(blob)) if name_tokens else 0
        if name_tokens and score == 0:
            continue
        if score >= best_score:
            best_score = score
            best = {
                "phone": _parse_phone(blob) or best["phone"],
                "email": _parse_email(blob) or best["email"],
                "rating": _parse_rating(blob) or best["rating"],
                "price": _parse_price(blob) or best["price"],
            }
    return best


def _enrich_card_details(
    card: dict[str, Any],
    *,
    results: list[dict[str, Any]] | None = None,
    contact_hints: list[dict[str, Any]] | None = None,
    rating_hints: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    title = str(card.get("title") or "")
    parts = [title, str(card.get("subtitle") or ""), str(card.get("address") or "")]
    if results:
        parts.append(_match_result_snippet(title, results))
    combined = " ".join(part for part in parts if part)

    if not card.get("phone"):
        card["phone"] = _parse_phone(combined)
    if not card.get("email"):
        card["email"] = _parse_email(combined)
    if not card.get("rating"):
        card["rating"] = _parse_rating(combined)
    if not card.get("price"):
        card["price"] = _parse_price(combined)

    for hints in (contact_hints, rating_hints):
        if not hints:
            continue
        found = _details_from_hints(title, hints)
        if found["phone"] and not card.get("phone"):
            card["phone"] = found["phone"]
        if found["email"] and not card.get("email"):
            card["email"] = found["email"]
        if found["rating"] and not card.get("rating"):
            card["rating"] = found["rating"]
        if found["price"] and not card.get("price"):
            card["price"] = found["price"]

    return card


def _parse_price(text: str) -> str | None:
    patterns = [
        r"(?:from|starting at|avg\.?|price)\s*([₹€$£]\s?\d[\d,]*(?:\.\d{2})?)",
        r"(?:INR|Rs\.?)\s*(\d[\d,]*(?:\.\d{2})?)",
        r"([₹€$£]\d[\d,]*(?:\.\d{2})?)\s*(?:/night|per night|pn)",
        r"([₹€$£]\d[\d,]*(?:\.\d{2})?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            return match.group(1).replace(" ", "")
    return None


def _parse_address(text: str, *, location_hint: str = "") -> str | None:
    patterns = [
        r"(?:located at|address[:\s]+)\s*([A-Z0-9][\w\s,.#'-]{8,90})",
        r"\b(\d{1,5}\s+[\w\s.'-]{4,60}(?:street|st|road|rd|avenue|ave|boulevard|blvd|lane|ln|drive|dr)\b[^,.]{0,40})",
        r"\b(in|near|at)\s+([A-Z][\w\s.'-]{3,50}(?:,\s*[A-Z][\w\s.'-]{2,30})?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            value = match.group(match.lastindex or 1).strip(" .,")
            if len(value) >= 8:
                return value[:120]
    if location_hint.strip():
        return location_hint.strip()[:120]
    return None


def _image_url(image: dict[str, Any] | None) -> str | None:
    if not image:
        return None
    for key in ("image_url", "thumbnail_url", "url"):
        raw = str(image.get(key) or "").strip()
        if raw.startswith(("http://", "https://")):
            return raw
    return None


def _best_image(title: str, images: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not images:
        return None
    title_tokens = _tokenize(title)
    best: tuple[int, dict[str, Any]] | None = None
    for image in images:
        haystack = " ".join(
            str(image.get(key) or "")
            for key in ("title", "page_url", "source", "image_url")
        )
        score = len(title_tokens & _tokenize(haystack))
        if best is None or score > best[0]:
            best = (score, image)
    return best[1] if best else images[0]


def _place_card(
    *,
    title: str,
    url: str,
    snippet: str,
    image: dict[str, Any] | None,
    category: str,
    location_hint: str = "",
) -> dict[str, Any]:
    combined = f"{title} {snippet}"
    badges = [category.title()]
    domain = _domain(url)
    if any(token in domain for token in ("booking", "expedia", "hotels", "agoda", "trip")):
        badges.append("Book now")
    primary_image = _image_url(image)
    thumbnail = _image_url({"thumbnail_url": (image or {}).get("thumbnail_url")}) or primary_image
    return {
        "type": "place",
        "id": _card_id(),
        "title": _clean_title(title),
        "subtitle": location_hint or category.title(),
        "description": None,
        "image_url": primary_image,
        "thumbnail_url": thumbnail,
        "url": url,
        "address": _parse_address(combined, location_hint=location_hint),
        "rating": _parse_rating(combined),
        "price": _parse_price(combined),
        "phone": _parse_phone(combined),
        "email": _parse_email(combined),
        "source": domain,
        "badges": badges,
    }


def _web_card(
    *,
    title: str,
    url: str,
    snippet: str,
    image: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "type": "web_result",
        "id": _card_id(),
        "title": _clean_title(title),
        "subtitle": _domain(url),
        "description": snippet[:280],
        "image_url": _image_url(image),
        "thumbnail_url": _image_url({"thumbnail_url": (image or {}).get("thumbnail_url")}) or _image_url(image),
        "url": url,
        "source": _domain(url),
        "badges": ["Web"],
    }


def _image_card(image: dict[str, Any]) -> dict[str, Any] | None:
    image_url = str(image.get("image_url") or image.get("url") or "").strip()
    if not image_url.startswith(("http://", "https://")):
        return None
    return {
        "type": "image",
        "id": _card_id(),
        "title": str(image.get("title") or image.get("alt") or "Image result"),
        "subtitle": str(image.get("source") or _domain(str(image.get("page_url") or ""))),
        "image_url": image_url,
        "thumbnail_url": str(image.get("thumbnail_url") or ""),
        "url": str(image.get("page_url") or image_url),
        "source": str(image.get("source") or ""),
        "badges": ["Image"],
    }


def build_listing_cards_from_images(
    images: list[dict[str, Any]],
    *,
    category: str = "hotel",
    location_hint: str = "",
    results: list[dict[str, Any]] | None = None,
    contact_hints: list[dict[str, Any]] | None = None,
    rating_hints: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for row in images:
        if not isinstance(row, dict):
            continue
        title_raw = str(row.get("title") or row.get("alt") or "").strip()
        if not title_raw:
            continue
        name = _clean_title(title_raw)
        if len(name) < 3:
            continue
        page_url = str(row.get("page_url") or row.get("url") or "").strip()
        source = _domain(page_url) or str(row.get("source") or "").strip()
        matched = _match_result_snippet(name, results or [])
        combined = f"{title_raw} {matched} {row.get('source') or ''}"
        badges = [category.title()]
        if source and any(token in source for token in ("booking", "goibibo", "makemytrip", "agoda", "hotel")):
            badges.append("Book now")
        card = {
            "type": "place",
            "id": _card_id(),
            "title": name,
            "subtitle": location_hint or category.title(),
            "description": None,
            "image_url": _image_url(row),
            "thumbnail_url": _image_url({"thumbnail_url": row.get("thumbnail_url")}) or _image_url(row),
            "url": page_url or str(row.get("image_url") or ""),
            "address": _parse_address(combined, location_hint=location_hint),
            "rating": _parse_rating(combined),
            "price": _parse_price(combined),
            "phone": _parse_phone(combined),
            "email": _parse_email(combined),
            "source": source,
            "badges": badges,
        }
        cards.append(
            _enrich_card_details(
                card,
                results=results,
                contact_hints=contact_hints,
                rating_hints=rating_hints,
            )
        )
    return cards[:10]


def build_place_cards(payload: dict[str, Any]) -> list[dict[str, Any]]:
    category = str(payload.get("category") or "place")
    location_hint = str(payload.get("location") or payload.get("query") or "").strip()
    results = [row for row in (payload.get("results") or []) if isinstance(row, dict)]
    contact_hints = [row for row in (payload.get("contact_hints") or []) if isinstance(row, dict)]
    rating_hints = [row for row in (payload.get("rating_hints") or []) if isinstance(row, dict)]
    images = [row for row in (payload.get("images") or []) if isinstance(row, dict)]
    cards: list[dict[str, Any]] = []
    for index, row in enumerate(results):
        if not isinstance(row, dict):
            continue
        url = str(row.get("url") or "").strip()
        title = str(row.get("title") or "").strip()
        snippet = str(row.get("snippet") or "").strip()
        if not url or not title:
            continue
        image = _best_image(title, images) or (images[index % len(images)] if images else None)
        cards.append(
            _enrich_card_details(
                _place_card(
                    title=title,
                    url=url,
                    snippet=snippet,
                    image=image,
                    category=category,
                    location_hint=location_hint,
                ),
                results=results,
                contact_hints=contact_hints,
                rating_hints=rating_hints,
            )
        )

    image_cards = build_listing_cards_from_images(
        images,
        category=category,
        location_hint=location_hint,
        results=results,
        contact_hints=contact_hints,
        rating_hints=rating_hints,
    )
    return merge_cards(cards, image_cards, max_items=10)


def _parse_salary(text: str) -> str | None:
    patterns = [
        r"(₹\s?\d[\d,]*(?:\.\d+)?\s*[Kk]\s*[-–]\s*₹\s?\d[\d,]*(?:\.\d+)?\s*[Kk])",
        r"(\$[\d,]+(?:\s*[Kk])?\s*[-–]\s*\$[\d,]+(?:\s*[Kk])?)",
        r"(₹\s?\d[\d,]+(?:\.\d+)?\s*(?:LPA|lpa|/yr|per\s+year))",
        r"([₹$€£]\s?\d[\d,]*(?:\.\d{2})?(?:\s*(?:k|K|LPA|lpa|/yr|/year|per year))?)",
        r"(\d[\d,]*(?:\.\d+)?\s*(?:LPA|lpa))",
        r"(?:salary|pay|compensation)[:\s]*([₹$€£]?\s?\d[\d,]*(?:\.\d{2})?(?:\s*k)?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            value = re.sub(r"\s+", " ", match.group(1)).strip()
            if len(value) >= 3 and not re.search(r"\d{7,}", value):
                return value[:48]
    return None


def _parse_experience(text: str) -> str | None:
    patterns = [
        r"\b((?:\d+\s*[-–]\s*\d+|\d+\+?)\s*years?(?:\s+of\s+experience)?)\b",
        r"\b(entry[- ]?level|junior|mid[- ]?level|senior|lead|principal|staff|fresher|intern(?:ship)?)\b",
        r"\b(\d+\+?\s*yrs?\.?)\b",
        r"\b(experience[:\s]+(\d+\+?\s*years?))\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            raw = match.group(1) if match.lastindex == 1 else match.group(match.lastindex or 1)
            cleaned = re.sub(r"\s+", " ", raw).strip(" .,-")
            return cleaned[:40].title() if cleaned.islower() or "-" in cleaned else cleaned[:40]
    return None


def extract_place_search_params(task: str) -> tuple[str, str, str]:
    category = _detect_place_category(task) or "place"
    location = _extract_location_hint(task)
    query = task.strip()
    query = re.sub(
        r"\b(?:hotel|hotels|restaurant|restaurants|stay|accommodation|resort|hostel|"
        r"lodging|place|places|find|show|search|list|get|me|for|please|the|a|an)\b",
        " ",
        query,
        flags=re.I,
    )
    if location:
        query = re.sub(re.escape(location), "", query, flags=re.I)
    query = re.sub(r"\s+", " ", query).strip(" ,.-")
    return (query[:120] or task[:120], location[:80], category)


def extract_job_search_params(task: str) -> tuple[str, str]:
    text = task.strip()
    loc_match = re.search(
        r"\b(?:in|at|near)\s+([A-Z][\w\s.'()-]{2,40})",
        text,
        flags=re.I,
    )
    location = loc_match.group(1).strip(" .,") if loc_match else ""
    query = re.sub(
        r"\b(?:job|jobs|hiring|career|vacancy|vacancies|opening|openings|listing|listings|"
        r"search|find|show|list|get|me|for|please|the|a|an)\b",
        " ",
        text,
        flags=re.I,
    )
    if location:
        query = re.sub(re.escape(location), "", query, flags=re.I)
    query = re.sub(r"\s+", " ", query).strip(" ,.-")
    return (query[:120] or text[:120], location[:80])


def _parse_job_fields(title: str, snippet: str, url: str) -> tuple[str, str, str]:
    cleaned = re.sub(r"\s*\|.*$", "", title).strip()
    parts = re.split(r"\s[-–—|•]\s+", cleaned)
    parts = [part.strip() for part in parts if part.strip()]

    job_title = cleaned
    company = ""
    location = ""

    if len(parts) >= 3:
        job_title, company, location = parts[0], parts[1], parts[2]
    elif len(parts) == 2:
        job_title, company = parts[0], parts[1]

    for site in _SITE_SUFFIXES + ("indeed", "linkedin", "glassdoor"):
        company = re.sub(rf"\b{re.escape(site)}\b.*$", "", company, flags=re.I).strip(" -|")
        location = re.sub(rf"\b{re.escape(site)}\b.*$", "", location, flags=re.I).strip(" -|")

    loc_match = re.search(
        r"\b(?:in|at|near)\s+([A-Z][\w\s.'()-]{2,40})",
        f"{title} {snippet}",
        flags=re.I,
    )
    if loc_match and not location:
        location = loc_match.group(1).strip(" .,")

    return job_title[:120], company[:80], location[:80]


def _job_board_badge(url: str, source: str = "") -> str:
    domain = _domain(url).lower()
    blob = f"{domain} {source}".lower()
    if "linkedin" in blob:
        return "LinkedIn"
    if "indeed" in blob:
        return "Indeed"
    if "glassdoor" in blob:
        return "Glassdoor"
    return source or _domain(url) or "Jobs"


def _job_card(
    *,
    title: str,
    url: str,
    snippet: str,
    source: str = "",
) -> dict[str, Any]:
    job_title, company, location = _parse_job_fields(title, snippet, url)
    combined = f"{title} {snippet}"
    board = _job_board_badge(url, source)
    badges = [board]
    if re.search(r"\b(remote|work from home|wfh)\b", combined, re.I):
        badges.append("Remote")
    if re.search(r"\b(full[- ]?time|part[- ]?time|contract|internship)\b", combined, re.I):
        match = re.search(r"\b(full[- ]?time|part[- ]?time|contract|internship)\b", combined, re.I)
        if match:
            badges.append(match.group(1).replace("-", " ").title())

    experience = _parse_experience(combined)
    if experience and experience not in badges:
        badges.insert(0, experience)

    return {
        "type": "job",
        "id": _card_id(),
        "title": job_title,
        "subtitle": company or board,
        "company": company or None,
        "description": snippet[:200] or None,
        "url": url,
        "address": location or None,
        "salary": _parse_salary(combined),
        "experience_level": experience,
        "source": board,
        "badges": badges[:4],
    }


def build_job_cards(payload: dict[str, Any]) -> list[dict[str, Any]]:
    source = str(payload.get("source") or "jobs")
    results = payload.get("results") or []
    cards: list[dict[str, Any]] = []
    for row in results:
        if not isinstance(row, dict):
            continue
        url = str(row.get("url") or "").strip()
        title = str(row.get("title") or "").strip()
        snippet = str(row.get("snippet") or "").strip()
        if not url or not title:
            continue
        cards.append(_job_card(title=title, url=url, snippet=snippet, source=source))
    return cards[:10]


def build_web_cards(payload: dict[str, Any]) -> list[dict[str, Any]]:
    results = payload.get("results") or []
    images = payload.get("images") or []
    cards: list[dict[str, Any]] = []
    for row in results:
        if not isinstance(row, dict):
            continue
        url = str(row.get("url") or "").strip()
        title = str(row.get("title") or "").strip()
        snippet = str(row.get("snippet") or "").strip()
        if not url or not title:
            continue
        image = _best_image(title, images)
        cards.append(_web_card(title=title, url=url, snippet=snippet, image=image))
    return cards[:8]


def build_image_cards(images: list[dict[str, Any]]) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for row in images:
        if not isinstance(row, dict):
            continue
        normalized = {
            "image_url": row.get("image_url") or row.get("url"),
            "thumbnail_url": row.get("thumbnail_url"),
            "page_url": row.get("page_url") or row.get("url"),
            "title": row.get("title") or row.get("alt"),
            "source": row.get("source"),
        }
        card = _image_card(normalized)
        if card:
            cards.append(card)
    return cards[:12]


_CARD_TOOL_NAMES = frozenset(
    {
        "web_search",
        "fetch_webpage",
        "search_places",
        "search_job_listings",
        "search_indeed_jobs",
        "search_linkedin_jobs",
    }
)


def _tool_output_text(output: Any) -> str:
    if output is None:
        return ""
    if isinstance(output, str):
        return output
    content = getattr(output, "content", output)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
        return "".join(parts)
    return str(content)


def resolve_tool_name_from_event(event: dict[str, Any]) -> str:
    candidates = [
        str(event.get("name") or ""),
        str((event.get("data") or {}).get("name") or ""),
        str((event.get("metadata") or {}).get("tool") or ""),
    ]
    for raw in candidates:
        if raw in _CARD_TOOL_NAMES:
            return raw
        for known in _CARD_TOOL_NAMES:
            if known in raw:
                return known
    return candidates[0]


def _payload_to_cards(payload: dict[str, Any], tool_name: str = "") -> list[dict[str, Any]]:
    if payload.get("cards"):
        return [card for card in payload["cards"] if isinstance(card, dict)]

    source = str(payload.get("source") or "").lower()
    results = payload.get("results")
    if isinstance(results, list) and results:
        if tool_name in {"search_job_listings", "search_indeed_jobs", "search_linkedin_jobs"}:
            return build_job_cards(payload)
        if any(token in source for token in ("indeed", "linkedin", "glassdoor")):
            return build_job_cards(payload)
        if any(
            isinstance(row, dict)
            and any(
                token in str(row.get("url") or "").lower()
                for token in ("indeed.com", "linkedin.com/jobs", "glassdoor.com")
            )
            for row in results[:4]
        ):
            return build_job_cards(payload)

        category = str(payload.get("category") or payload.get("intent") or "")
        if not category:
            category = _detect_place_category(str(payload.get("query") or "")) or ""
        if category in {"hotel", "restaurant", "place"}:
            location_hint = str(payload.get("location") or _extract_location_hint(str(payload.get("query") or "")))
            return build_place_cards({**payload, "category": category, "location": location_hint})
        if payload.get("images") is not None:
            return build_web_cards(payload)
        return build_web_cards(payload)

    return []


def parse_tool_cards_auto(output: Any) -> list[dict[str, Any]]:
    trimmed = _tool_output_text(output).strip()
    if not trimmed.startswith("{"):
        return []
    try:
        payload = json.loads(trimmed)
    except json.JSONDecodeError:
        return []
    if not isinstance(payload, dict):
        return []
    return _payload_to_cards(payload)


def parse_tool_cards(tool_name: str, output: Any) -> list[dict[str, Any]]:
    trimmed = _tool_output_text(output).strip()
    if not trimmed.startswith("{"):
        return []

    try:
        payload = json.loads(trimmed)
    except json.JSONDecodeError:
        return []

    if not isinstance(payload, dict):
        return []

    if tool_name == "search_places":
        if payload.get("cards"):
            return [card for card in payload["cards"] if isinstance(card, dict)]
        return build_place_cards(payload)

    if tool_name in {"search_job_listings", "search_indeed_jobs", "search_linkedin_jobs"}:
        if payload.get("cards"):
            return [card for card in payload["cards"] if isinstance(card, dict)]
        return build_job_cards(payload)

    if tool_name == "web_search":
        if payload.get("cards"):
            return [card for card in payload["cards"] if isinstance(card, dict)]
        query = str(payload.get("query") or "")
        place_hint = str(payload.get("category") or payload.get("intent") or "")
        if not place_hint:
            place_hint = _detect_place_category(query) or ""
        if place_hint in {"hotel", "restaurant", "place"}:
            location_hint = str(payload.get("location") or _extract_location_hint(query))
            return build_place_cards(
                {
                    **payload,
                    "category": place_hint,
                    "location": location_hint,
                }
            )
        return build_web_cards(payload)

    if tool_name == "fetch_webpage":
        images = payload.get("images") or []
        cards = build_image_cards(
            [
                {
                    "url": row.get("url"),
                    "thumbnail_url": row.get("url"),
                    "page_url": payload.get("url"),
                    "title": row.get("alt"),
                }
                for row in images
                if isinstance(row, dict)
            ]
        )
        page_url = str(payload.get("url") or "")
        if page_url:
            cards.insert(
                0,
                {
                    "type": "web_result",
                    "id": _card_id(),
                    "title": "Source page",
                    "subtitle": _domain(page_url),
                    "description": str(payload.get("text") or "")[:220],
                    "url": page_url,
                    "source": _domain(page_url),
                    "badges": ["Page"],
                },
            )
        return cards[:10]

    return []


def merge_cards(
    existing: list[dict[str, Any]],
    incoming: list[dict[str, Any]],
    *,
    max_items: int = 12,
) -> list[dict[str, Any]]:
    seen_urls: set[str] = set()
    seen_titles: set[str] = set()
    for card in existing:
        url = str(card.get("url") or card.get("image_url") or "")
        title = str(card.get("title") or "").lower()
        if url:
            seen_urls.add(url)
        if title:
            seen_titles.add(title)

    merged = list(existing)
    for card in incoming:
        url = str(card.get("url") or card.get("image_url") or "")
        title = str(card.get("title") or "").lower()
        if url and url in seen_urls:
            continue
        if title and title in seen_titles and card.get("type") != "image":
            continue
        if url:
            seen_urls.add(url)
        if title:
            seen_titles.add(title)
        merged.append(card)
        if len(merged) >= max_items:
            break
    return merged


def brief_listing_reply(cards: list[dict[str, Any]], *, task: str = "") -> str:
    web = [card for card in cards if card.get("type") == "web_result"]
    if web:
        return (
            f"Found {len(web)} web results. "
            "Browse the cards below for summaries and source links."
        )

    jobs = [card for card in cards if card.get("type") == "job"]
    if jobs:
        location = str(jobs[0].get("address") or _extract_location_hint(task) or "").strip()
        if location:
            return (
                f"Found {len(jobs)} job listings in {location}. "
                "Browse the cards below for role details and apply links."
            )
        return (
            f"Found {len(jobs)} job listings. "
            "Browse the cards below for role details and apply links."
        )

    places = [card for card in cards if card.get("type") == "place"]
    if not places:
        return ""
    count = len(places)
    location = (
        str(places[0].get("address") or places[0].get("subtitle") or "").strip()
        or _extract_location_hint(task)
    )
    category = str(places[0].get("badges", ["stay"])[0] or "stay").lower()
    label = "stays" if category == "hotel" else f"{category}s" if category != "place" else "places"
    if location:
        return f"Here are {count} {label} in {location}. Browse the cards below for photos, contact, and booking."
    return f"Here are {count} {label}. Browse the cards below for photos, contact, and booking."


def is_listing_card_set(cards: list[dict[str, Any]]) -> bool:
    return any(card.get("type") in {"place", "job", "web_result"} for card in cards)
