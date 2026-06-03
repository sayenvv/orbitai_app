from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from clovai_apps.constants import (
    APP_SLUG_ASSET_REMIX,
    APP_SLUG_CAREER_COACH,
    APP_SLUG_CREATIVE_EDITOR,
    APP_SLUG_LOGO_STUDIO,
    APP_SLUG_PHOTO_STUDIO,
    APP_SLUG_RESEARCH_COMPANION,
    APP_SLUG_VIDEO_SNIPPETS,
    APP_SLUG_VOICE_MAKER,
    LAUNCH_APP_SLUGS,
    normalize_app_slug,
)

AppTier = Literal["starter", "pro"]

# Stable catalog UUIDs — keep in sync with Orbit_UI/packages/clovai-apps/src/app-ids.ts
CATALOG_APP_IDS = {
    "logo_studio": "a1000001-0001-4000-8000-000000000001",
    "photo_studio": "a1000001-0002-4000-8000-000000000002",
    "creative_editor": "a1000001-0003-4000-8000-000000000003",
    "video_snippets": "a1000001-0004-4000-8000-000000000004",
    "voice_maker": "a1000001-0005-4000-8000-000000000005",
    "asset_remix": "a1000001-0006-4000-8000-000000000006",
    "career_coach": "a1000001-0007-4000-8000-000000000007",
    "research_companion": "a1000001-0008-4000-8000-000000000008",
}

CATALOG_ID_BY_SLUG: dict[str, str] = {
    APP_SLUG_LOGO_STUDIO: CATALOG_APP_IDS["logo_studio"],
    APP_SLUG_PHOTO_STUDIO: CATALOG_APP_IDS["photo_studio"],
    APP_SLUG_CREATIVE_EDITOR: CATALOG_APP_IDS["creative_editor"],
    APP_SLUG_VIDEO_SNIPPETS: CATALOG_APP_IDS["video_snippets"],
    APP_SLUG_VOICE_MAKER: CATALOG_APP_IDS["voice_maker"],
    APP_SLUG_ASSET_REMIX: CATALOG_APP_IDS["asset_remix"],
    APP_SLUG_CAREER_COACH: CATALOG_APP_IDS["career_coach"],
    APP_SLUG_RESEARCH_COMPANION: CATALOG_APP_IDS["research_companion"],
}

# Apps with a live workspace in the chat UI (not just marketing detail pages).
VISIBLE_APP_SLUGS = frozenset({APP_SLUG_PHOTO_STUDIO, APP_SLUG_RESEARCH_COMPANION})


class CatalogAppSummary(BaseModel):
    id: str
    slug: str
    name: str
    category: str
    tag: str
    tier: AppTier
    tagline: str
    short_description: str = Field(serialization_alias="shortDescription")
    model_access: str = Field(serialization_alias="modelAccess")
    featured: bool = False
    launch_available: bool = Field(default=False, serialization_alias="launchAvailable")

    model_config = {"populate_by_name": True}


APPS_CATALOG: tuple[CatalogAppSummary, ...] = (
    CatalogAppSummary(
        id=CATALOG_APP_IDS["logo_studio"],
        slug=APP_SLUG_LOGO_STUDIO,
        name="Logo Studio",
        category="Branding",
        tag="Identity",
        tier="starter",
        tagline="Design a complete brand identity from a single prompt.",
        short_description="Generate polished logo concepts and brand marks in minutes.",
        model_access="Starter model access",
        featured=True,
    ),
    CatalogAppSummary(
        id=CATALOG_APP_IDS["photo_studio"],
        slug=APP_SLUG_PHOTO_STUDIO,
        name="Clovai Canvas",
        category="Image",
        tag="Visuals",
        tier="starter",
        tagline="Logos, product shots, and campaign visuals from a single studio.",
        short_description="Create logos, product photos, lifestyle scenes, and ad visuals from text prompts.",
        model_access="Starter model access",
        featured=True,
        launch_available=True,
    ),
    CatalogAppSummary(
        id=CATALOG_APP_IDS["creative_editor"],
        slug=APP_SLUG_CREATIVE_EDITOR,
        name="Creative Editor",
        category="Editing",
        tag="Studio",
        tier="pro",
        tagline="A pro-grade AI canvas for retouch, cleanup, and upscale.",
        short_description="Edit, clean, and upscale images with pro AI workflows.",
        model_access="Pro model access",
        featured=True,
    ),
    CatalogAppSummary(
        id=CATALOG_APP_IDS["video_snippets"],
        slug=APP_SLUG_VIDEO_SNIPPETS,
        name="Video Snippets",
        category="Video",
        tag="Motion",
        tier="pro",
        tagline="Turn a concept into a polished social reel in minutes.",
        short_description="Turn concepts into short product reels and promos.",
        model_access="Pro model access",
    ),
    CatalogAppSummary(
        id=CATALOG_APP_IDS["voice_maker"],
        slug=APP_SLUG_VOICE_MAKER,
        name="Voice Maker",
        category="Audio",
        tag="Voice",
        tier="pro",
        tagline="Studio-quality voiceovers with natural, expressive delivery.",
        short_description="Generate natural-sounding voiceovers for content and demos.",
        model_access="Pro model access",
    ),
    CatalogAppSummary(
        id=CATALOG_APP_IDS["asset_remix"],
        slug=APP_SLUG_ASSET_REMIX,
        name="Asset Remix",
        category="Design",
        tag="Remix",
        tier="starter",
        tagline="Restyle any creative into fresh on-brand directions.",
        short_description="Restyle existing assets into new themes and directions.",
        model_access="Starter model access",
    ),
    CatalogAppSummary(
        id=CATALOG_APP_IDS["career_coach"],
        slug=APP_SLUG_CAREER_COACH,
        name="Career Coach",
        category="Career",
        tag="Jobs",
        tier="starter",
        tagline="Prepare resumes, job applications, and interviews with confidence.",
        short_description="AI job search prep for resumes, interviews, and role-specific practice.",
        model_access="Starter model access",
    ),
    CatalogAppSummary(
        id=CATALOG_APP_IDS["research_companion"],
        slug=APP_SLUG_RESEARCH_COMPANION,
        name="Clovai Insights",
        category="Research",
        tag="Research",
        tier="pro",
        tagline="Analyze documents, organize evidence, and build structured research notes.",
        short_description="Multipurpose research assistant for papers, case studies, and reports.",
        model_access="Pro model access",
        featured=True,
        launch_available=True,
    ),
)


def list_apps(*, visible_only: bool = False) -> list[CatalogAppSummary]:
    if not visible_only:
        return list(APPS_CATALOG)
    return [app for app in APPS_CATALOG if app.slug in VISIBLE_APP_SLUGS]


def list_visible_apps() -> list[CatalogAppSummary]:
    return list_apps(visible_only=True)


def find_app_by_id_or_slug(id_or_slug: str) -> CatalogAppSummary | None:
    cleaned = id_or_slug.strip()
    by_id = next((app for app in APPS_CATALOG if app.id == cleaned), None)
    if by_id:
        return by_id

    slug = normalize_app_slug(cleaned)
    return next((app for app in APPS_CATALOG if app.slug == slug), None)


def get_catalog_id_for_slug(slug: str) -> str | None:
    return CATALOG_ID_BY_SLUG.get(normalize_app_slug(slug))


def is_known_app_slug(slug: str) -> bool:
    return normalize_app_slug(slug) in CATALOG_ID_BY_SLUG


def is_launch_app_slug(slug: str) -> bool:
    return normalize_app_slug(slug) in LAUNCH_APP_SLUGS
