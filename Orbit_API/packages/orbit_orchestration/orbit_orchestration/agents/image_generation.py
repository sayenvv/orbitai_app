from __future__ import annotations

import json
import time
import uuid

from autogen_core.tools import FunctionTool

from orbit_orchestration.config import get_orchestration_settings


async def _generate_image_tool(
    prompt: str,
    *,
    aspect_ratio: str | None = None,
    style_preset: str | None = None,
) -> str:
    """Prepare an image generation job (integrates with Orbit Photo Studio patterns)."""
    cfg = get_orchestration_settings()
    batch_id = str(uuid.uuid4())
    payload = {
        "batch_id": batch_id,
        "prompt": prompt.strip(),
        "aspect_ratio": aspect_ratio or cfg.image_default_aspect_ratio,
        "style_preset": style_preset or cfg.image_default_style,
        "status": "queued",
        "created_at": int(time.time() * 1000),
        "note": "Connect to Orbit Photo Studio / provider API for final image bytes.",
    }
    return json.dumps(payload, indent=2)


def build_image_generation_tool() -> FunctionTool:
    return FunctionTool(
        _generate_image_tool,
        description=(
            "Generate an image from a detailed prompt. Returns JSON metadata including batch_id. "
            "Always confirm the prompt with the human before calling when the request is ambiguous."
        ),
        name="generate_image",
    )
