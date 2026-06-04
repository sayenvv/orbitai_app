"""Stable app slug constants — keep in sync with Orbit_UI/packages/clovai-apps/src/app-ids.ts."""

APP_SLUG_LOGO_STUDIO = "logo-studio"
APP_SLUG_PHOTO_STUDIO = "photo-studio"
APP_SLUG_PHOTO_GENERATOR = "photo-generator"  # legacy alias
APP_SLUG_CREATIVE_EDITOR = "creative-editor"
APP_SLUG_VIDEO_SNIPPETS = "video-snippets"
APP_SLUG_VOICE_MAKER = "voice-maker"
APP_SLUG_ASSET_REMIX = "asset-remix"
APP_SLUG_CAREER_COACH = "career-coach"
APP_SLUG_RESEARCH_COMPANION = "research-companion"
APP_SLUG_PROJECT_PLANNING = "project-planning"
APP_SLUG_CLOVAI_PROJECTS = "clovai-projects"  # legacy alias slug

LAUNCH_APP_SLUGS = frozenset(
    {
        APP_SLUG_PHOTO_STUDIO,
        APP_SLUG_RESEARCH_COMPANION,
        APP_SLUG_PROJECT_PLANNING,
    }
)

APP_SLUG_ALIASES: dict[str, str] = {
    APP_SLUG_PHOTO_GENERATOR: APP_SLUG_PHOTO_STUDIO,
    APP_SLUG_CLOVAI_PROJECTS: APP_SLUG_PROJECT_PLANNING,
}


def normalize_app_slug(slug: str) -> str:
    cleaned = slug.strip().lower()
    return APP_SLUG_ALIASES.get(cleaned, cleaned)
