# clovai-apps

Shared backend package for Clovai app catalog, slugs, and app-specific logic. Mirrors the frontend `@orbit/clovai-apps` package.

## Install (local dev)

From `Orbit_API/`:

```bash
pip install -r requirements-local.txt
```

## Usage

```python
from clovai_apps import (
    APP_SLUG_PHOTO_STUDIO,
    find_app_by_id_or_slug,
    list_visible_apps,
    normalize_app_slug,
)
from clovai_apps.shared.assets import build_image_document_metadata, detect_upload_kind, is_image_upload

app = find_app_by_id_or_slug("photo-studio")
visible = list_visible_apps()
slug = normalize_app_slug("photo-generator")  # -> "photo-studio"
```

## Layout

```
clovai_apps/
├── catalog.py           # App IDs, slugs, catalog entries (source of truth for backend)
├── constants.py         # App slug constants
├── shared/assets.py     # Image upload helpers used by /api/files
├── photo_studio/        # Photo Studio generation & asset logic
└── research_companion/  # Research Companion helpers
```

HTTP routes live in `Orbit_API/app/api/v1/public/apps.py` and delegate to this package.
