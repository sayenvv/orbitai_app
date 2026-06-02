from __future__ import annotations

import time

from clovai_apps.photo_studio.design_schemas import PhotoStudioDesignItem


def _shape(
    id: str,
    shape_type: str,
    x: float,
    y: float,
    width: float,
    height: float,
    fill_color: str,
    stroke_color: str | None = None,
) -> dict:
    stroke = stroke_color or fill_color
    corner_radius = 4 if shape_type in {"rectangle", "square"} else 0
    return {
        "id": id,
        "shapeType": shape_type,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "strokeWidth": 3,
        "strokeColor": stroke,
        "fillColor": fill_color,
        "fillOpacity": 0.8,
        "cornerRadius": corner_radius,
        "label": "",
    }


def _text(
    id: str,
    content: str,
    x: float,
    y: float,
    color: str = "#ffffff",
    font_style_id: str = "bold-headline",
) -> dict:
    return {
        "id": id,
        "x": x,
        "y": y,
        "width": 38,
        "height": 10,
        "content": content,
        "fontStyleId": font_style_id,
        "fontSize": 16,
        "color": color,
    }


def get_system_design_templates() -> list[PhotoStudioDesignItem]:
    now = int(time.time() * 1000)
    day = 86_400_000

    raw = [
        {
            "id": "design-mock-orbit-logo",
            "title": "Orbit Brand Mark",
            "aspect_ratio": "1:1",
            "canvas_background_id": "violet-sunset",
            "shapes": [
                _shape("mock-s-1", "circle", 50, 42, 26, 26, "#a855f7", "#7c3aed"),
                _shape("mock-s-2", "ellipse", 50, 42, 36, 36, "#c084fc", "#ddd6fe"),
            ],
            "texts": [_text("mock-t-1", "ORBIT", 50, 68)],
            "created_at": now - day * 3,
        },
        {
            "id": "design-mock-minimal-badge",
            "title": "Minimal Badge",
            "aspect_ratio": "1:1",
            "canvas_background_id": "midnight",
            "shapes": [
                _shape("mock-s-3", "hexagon", 50, 45, 30, 30, "#6366f1", "#818cf8"),
                _shape("mock-s-4", "diamond", 50, 45, 18, 18, "#22d3ee", "#06b6d4"),
            ],
            "texts": [_text("mock-t-2", "STUDIO", 50, 72, "#e2e8f0", "modern-sans")],
            "created_at": now - day * 5,
        },
        {
            "id": "design-mock-product-hero",
            "title": "Product Hero",
            "aspect_ratio": "1:1",
            "canvas_background_id": "amber-glow",
            "shapes": [
                _shape("mock-s-5", "rectangle", 50, 55, 52, 38, "#f97316", "#ea580c"),
                _shape("mock-s-6", "circle", 50, 38, 22, 22, "#fde68a", "#fbbf24"),
            ],
            "texts": [_text("mock-t-3", "NEW DROP", 50, 78, "#1c1917")],
            "created_at": now - day * 2,
        },
        {
            "id": "design-mock-launch-banner",
            "title": "Launch Banner",
            "aspect_ratio": "1:1",
            "canvas_background_id": "cyan-ocean",
            "shapes": [
                _shape("mock-s-9", "rectangle", 50, 50, 72, 48, "#0ea5e9", "#0284c7"),
                _shape("mock-s-10", "arrow", 68, 50, 24, 14, "#ffffff", "#e0f2fe"),
            ],
            "texts": [_text("mock-t-5", "SUMMER LAUNCH", 32, 52, "#ffffff")],
            "created_at": now - day * 1,
        },
        {
            "id": "design-mock-web-hero",
            "title": "Web Hero",
            "aspect_ratio": "1:1",
            "canvas_background_id": "fuchsia-pop",
            "shapes": [
                _shape("mock-s-11", "ellipse", 28, 50, 28, 40, "#ec4899", "#db2777"),
                _shape("mock-s-12", "triangle", 72, 50, 26, 36, "#a855f7", "#9333ea"),
            ],
            "texts": [_text("mock-t-6", "CREATIVE SUITE", 50, 78, "#fdf4ff")],
            "created_at": now - day * 4,
        },
        {
            "id": "design-mock-neon-pulse",
            "title": "Neon Pulse",
            "aspect_ratio": "1:1",
            "canvas_background_id": "fuchsia-pop",
            "shapes": [
                _shape("mock-s-17", "circle", 50, 46, 32, 32, "#d946ef", "#a855f7"),
                _shape("mock-s-18", "star", 50, 46, 20, 20, "#fdf4ff", "#f0abfc"),
            ],
            "texts": [_text("mock-t-9", "PULSE", 50, 74, "#fdf4ff")],
            "created_at": now - day * 9,
        },
        {
            "id": "design-mock-ocean-mark",
            "title": "Ocean Mark",
            "aspect_ratio": "1:1",
            "canvas_background_id": "cyan-ocean",
            "shapes": [
                _shape("mock-s-19", "triangle", 50, 44, 34, 34, "#06b6d4", "#0891b2"),
                _shape("mock-s-20", "hexagon", 50, 44, 22, 22, "#67e8f9", "#22d3ee"),
            ],
            "texts": [_text("mock-t-10", "WAVE", 50, 72, "#ecfeff", "modern-sans")],
            "created_at": now - day * 10,
        },
    ]

    return [
        PhotoStudioDesignItem.model_validate({**item, "source": "system"})
        for item in raw
    ]
