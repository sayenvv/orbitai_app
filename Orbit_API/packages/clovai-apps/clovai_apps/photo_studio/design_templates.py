from __future__ import annotations

import time

from clovai_apps.photo_studio.design_schemas import PhotoStudioDesignItem


# SVG paths use a 100×100 viewBox (see photo-studio-path-presets.ts in the UI package).
PATH_LOBE_UP = (
    "M50 12 C62 12 70 22 70 34 C70 46 62 54 50 56 "
    "C38 54 30 46 30 34 C30 22 38 12 50 12 Z"
)
PATH_LOBE_CHATGPT = (
    "M50 5 C57 5 63 11 63 19 L63 45 C63 53 57 59 50 59 "
    "C43 59 37 53 37 45 L37 19 C37 11 43 5 50 5 Z"
)
PATH_CHATGPT_ICON_VIEWBOX = 16
# OpenAI / ChatGPT app icon (Bootstrap Icons openai, viewBox 16×16)
PATH_CHATGPT_ICON = "M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z"
PATH_RING_SOFT = (
    "M50 18 C66 18 78 30 78 46 C78 62 66 74 50 74 "
    "C34 74 22 62 22 46 C22 30 34 18 50 18 Z "
    "M50 28 C58 28 64 34 64 42 C64 50 58 56 50 56 "
    "C42 56 36 50 36 42 C36 34 42 28 50 28 Z"
)


def _shape(
    id: str,
    shape_type: str,
    x: float,
    y: float,
    width: float,
    height: float,
    fill_color: str,
    stroke_color: str | None = None,
    *,
    stroke_width: int = 3,
    fill_opacity: float = 0.8,
    corner_radius: int | None = None,
    rotation: float = 0,
    group_id: str | None = None,
    path_data: str | None = None,
    path_view_box: int | None = None,
    path_fill_rule: str | None = None,
    side_gaps: dict | None = None,
) -> dict:
    stroke = stroke_color or fill_color
    if path_data:
        shape_type = "path"
    if corner_radius is None:
        corner_radius = 4 if shape_type in {"rectangle", "square"} else 0
    item = {
        "id": id,
        "shapeType": shape_type,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "strokeWidth": stroke_width,
        "strokeColor": stroke,
        "fillColor": fill_color,
        "fillOpacity": fill_opacity,
        "cornerRadius": corner_radius,
        "rotation": rotation,
        "groupId": group_id,
        "label": "",
    }
    if path_data:
        item["pathData"] = path_data
    if path_view_box:
        item["pathViewBox"] = path_view_box
    if path_fill_rule:
        item["pathFillRule"] = path_fill_rule
    if side_gaps:
        item["sideGaps"] = side_gaps
    return item


# Inward cut on the inner edge of each radial lobe (local bottom → toward center).
_LOBE_WEAVE_GAP = {"bottom": {"size": 40, "position": 50, "depth": 45}}


def _interwoven_mark_shapes() -> list[dict]:
    """Radial AI-style mark using custom SVG paths (not primitive hexagons)."""
    green = "#10a37f"
    green_dark = "#0d8f6f"
    group = "interwoven-mark"
    shapes: list[dict] = [
        _shape(
            "mark-ring",
            "path",
            50,
            46,
            36,
            36,
            green,
            green,
            stroke_width=1,
            fill_opacity=0.1,
            path_data=PATH_RING_SOFT,
        ),
    ]
    lobe_positions = [
        (50, 30, 0),
        (65.5, 39, 60),
        (65.5, 57, 120),
        (50, 66, 180),
        (34.5, 57, 240),
        (34.5, 39, 300),
    ]
    for index, (x, y, rotation) in enumerate(lobe_positions, start=1):
        shapes.append(
            _shape(
                f"mark-lobe-{index}",
                "path",
                x,
                y,
                24,
                24,
                green,
                green_dark,
                stroke_width=2,
                fill_opacity=1,
                rotation=rotation,
                group_id=group,
                path_data=PATH_LOBE_UP,
            )
        )
    return shapes


def _chatgpt_editable_logo_shapes() -> list[dict]:
    """Six knot arms — each arm has its own fill color in Photo Studio."""
    green = "#10a37f"
    green_dark = "#0d8f6f"
    group = "chatgpt-mark"
    layout = [
        (50, 28.5, 0),
        (66, 37.5, 60),
        (66, 54.5, 120),
        (50, 63.5, 180),
        (34, 54.5, 240),
        (34, 37.5, 300),
    ]
    shapes: list[dict] = []
    for index, (x, y, rotation) in enumerate(layout, start=1):
        item = _shape(
            f"chatgpt-lobe-{index}",
            "path",
            x,
            y,
            20,
            30,
            green if index % 2 == 1 else green_dark,
            green_dark,
            stroke_width=0,
            fill_opacity=1,
            rotation=rotation,
            group_id=group,
            path_data=PATH_LOBE_CHATGPT,
        )
        item["label"] = f"Arm {index}"
        shapes.append(item)
    return shapes


def _chatgpt_solid_logo_shapes() -> list[dict]:
    """Official OpenAI / ChatGPT icon as one path (viewBox 16)."""
    green = "#10a37f"
    item = _shape(
        "chatgpt-icon",
        "path",
        50,
        44,
        40,
        40,
        green,
        green,
        stroke_width=0,
        fill_opacity=1,
        path_data=PATH_CHATGPT_ICON,
        path_view_box=PATH_CHATGPT_ICON_VIEWBOX,
        path_fill_rule="evenodd",
    )
    item["label"] = "ChatGPT icon"
    return [item]


def _text(
    id: str,
    content: str,
    x: float,
    y: float,
    color: str = "#ffffff",
    font_style_id: str = "bold-headline",
    *,
    width: float = 38,
    font_size: int = 16,
) -> dict:
    return {
        "id": id,
        "x": x,
        "y": y,
        "width": width,
        "height": 10,
        "content": content,
        "fontStyleId": font_style_id,
        "fontSize": font_size,
        "color": color,
    }


def get_system_design_templates() -> list[PhotoStudioDesignItem]:
    now = int(time.time() * 1000)
    day = 86_400_000

    raw = [
        {
            "id": "design-mock-chatgpt-style-logo",
            "title": "ChatGPT Logo",
            "aspect_ratio": "1:1",
            "canvas_background_id": "custom",
            "shapes": _chatgpt_solid_logo_shapes(),
            "texts": [
                _text(
                    "chatgpt-wordmark",
                    "ChatGPT",
                    50,
                    82,
                    "#0f172a",
                    "modern-sans",
                    width=48,
                    font_size=24,
                ),
            ],
            "created_at": now - day * 2,
        },
        {
            "id": "design-mock-interwoven-logo",
            "title": "Interwoven AI Mark",
            "aspect_ratio": "1:1",
            "canvas_background_id": "custom",
            "shapes": _interwoven_mark_shapes(),
            "texts": [
                _text(
                    "mark-wordmark",
                    "Your Brand",
                    50,
                    82,
                    "#0f172a",
                    "modern-sans",
                    width=56,
                    font_size=22,
                ),
            ],
            "created_at": now - day * 1,
        },
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
