from __future__ import annotations

from autogen_agentchat.agents import UserProxyAgent

from orbit_orchestration.domain.constants import HITL_PAUSE_SENTINEL
from orbit_orchestration.domain.session import OrchestrationSession
from orbit_orchestration.domain.types import OrchestrationMessage, OrchestrationStatus


def build_human_proxy(session: OrchestrationSession) -> UserProxyAgent:
    """Human proxy for API-driven HITL.

    AutoGen wraps raised exceptions from ``input_func`` as ``RuntimeError`` and
    tears down the group chat. Instead, return :data:`HITL_PAUSE_SENTINEL` and let
    :class:`~autogen_agentchat.conditions.TextMentionTermination` stop the team cleanly.
    """

    async def input_func(prompt: str, cancellation_token=None) -> str:  # noqa: ARG001
        pending = session.pending_human_input
        if pending:
            session.pending_human_input = None
            return pending

        session.status = OrchestrationStatus.awaiting_human
        session.human_prompt = prompt.strip() or (
            "What colors and style do you want for this image? "
            "Reply with preferences or say approve to continue."
        )
        session.messages.append(
            OrchestrationMessage(
                source="human",
                content=f"[Awaiting human] {session.human_prompt}",
            )
        )
        return HITL_PAUSE_SENTINEL

    return UserProxyAgent(
        name="human",
        description="Human operator who approves image generation and steers the workflow.",
        input_func=input_func,
    )
