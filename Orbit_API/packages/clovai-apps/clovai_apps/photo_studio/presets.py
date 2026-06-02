from __future__ import annotations

from typing import Literal

PhotoStudioCreationType = Literal["logo", "product", "lifestyle", "campaign"]
PhotoStudioAspectRatio = Literal["1:1", "4:5", "16:9", "9:16"]
PhotoStudioStylePreset = Literal["studio", "editorial", "cinematic", "minimal"]
CanvasBackgroundId = Literal[
    "violet-sunset",
    "cyan-ocean",
    "fuchsia-pop",
    "emerald-fresh",
    "amber-glow",
    "slate-studio",
    "custom",
    "checkerboard",
    "solid-white",
    "solid-black",
]

GENERATION_BATCH_SIZE = 4

CREATION_TYPES: tuple[dict[str, str], ...] = (
    {"id": "logo", "label": "Logo & brand", "description": "Transparent PNG logos — preview on colorful backgrounds."},
    {"id": "product", "label": "Product photo", "description": "Clean studio shots and e-commerce visuals."},
    {"id": "lifestyle", "label": "Lifestyle scene", "description": "Editorial mockups and in-context photography."},
    {"id": "campaign", "label": "Campaign visual", "description": "Ads, banners, and social-ready creatives."},
)

ASPECT_RATIOS: tuple[dict[str, str], ...] = (
    {"id": "1:1", "label": "Square", "hint": "Logos & social posts"},
    {"id": "4:5", "label": "Portrait", "hint": "Product & feed posts"},
    {"id": "16:9", "label": "Landscape", "hint": "Banners & ads"},
    {"id": "9:16", "label": "Story", "hint": "Reels & vertical ads"},
)

STYLE_PRESETS: tuple[dict[str, str], ...] = (
    {"id": "studio", "label": "Studio clean"},
    {"id": "editorial", "label": "Editorial"},
    {"id": "cinematic", "label": "Cinematic"},
    {"id": "minimal", "label": "Minimal brand"},
)

GENERATION_PREVIEW_GRADIENTS: tuple[str, ...] = (
    "from-violet-500 via-fuchsia-500 to-indigo-600",
    "from-cyan-500 via-sky-500 to-blue-600",
    "from-fuchsia-500 via-pink-500 to-rose-600",
    "from-emerald-500 via-teal-500 to-cyan-600",
)

DEFAULT_CANVAS_BACKGROUND_IDS: tuple[CanvasBackgroundId, ...] = (
    "violet-sunset",
    "cyan-ocean",
    "fuchsia-pop",
    "emerald-fresh",
)
