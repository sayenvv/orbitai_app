from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from orbit_orchestration.config import OrchestrationSettings
from orbit_orchestration.langchain.llm_factory import create_chat_model

_SYSTEM = """You help users create image generation prompts. The user wants a new image.

Reply with ONLY the questions and draft prompt below (no tool calls, no JSON).

Format exactly:

**Questions**
- Ask 2–4 short bullet questions about details missing from their request (e.g. colors, style, mood, background, aspect ratio).

**Draft prompt**
A single paragraph image prompt you would send to an image model based on what they said so far. Label it clearly.

Keep it concise and friendly."""

_FALLBACK = """**Questions**
- What color palette do you want (e.g. warm browns, pastel, monochrome)?
- What style should it be (photo-realistic, flat illustration, watercolor, 3D render)?
- Any background preference (café interior, plain white, gradient)?
- Portrait, square, or wide aspect ratio?

**Draft prompt**
A high-quality image of a coffee cup, composed for use as a product-style visual, with balanced lighting and clear focus on the cup."""


async def build_image_hitl_prompt(
    user_message: str,
    history: list[tuple[str, str]],
    settings: OrchestrationSettings | None = None,
) -> str:
    llm = create_chat_model(settings)
    lines: list[str] = []
    for role, content in history[-8:]:
        label = "User" if role == "user" else "Assistant"
        lines.append(f"{label}: {content[:1500]}")
    transcript = "\n".join(lines)
    user_block = f"Latest request:\n{user_message.strip()}"
    if transcript:
        user_block = f"Conversation so far:\n{transcript}\n\n{user_block}"

    messages = [
        SystemMessage(content=_SYSTEM),
        HumanMessage(content=user_block),
    ]
    try:
        response = await llm.ainvoke(messages)
        text = response.content if isinstance(response.content, str) else str(response.content)
        cleaned = text.strip()
        if cleaned and "**Questions**" in cleaned:
            return cleaned
    except Exception:
        pass
    return _FALLBACK


def format_image_hitl_user_message(user_message: str, clarification: str) -> str:
    return (
        "I can generate that image. Before I do, a few quick choices will improve the result:\n\n"
        f"{clarification.strip()}\n\n"
        "Reply with your answers (colors, style, etc.), or say **approve** to use the draft prompt."
    )
