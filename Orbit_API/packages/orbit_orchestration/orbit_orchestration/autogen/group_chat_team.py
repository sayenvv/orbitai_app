from __future__ import annotations

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination
from autogen_agentchat.teams import SelectorGroupChat
from autogen_ext.models.openai import OpenAIChatCompletionClient

from orbit_orchestration.agents.image_generation import build_image_generation_tool
from orbit_orchestration.agents.summarization import build_summarization_tool
from orbit_orchestration.autogen.human_proxy import build_human_proxy
from orbit_orchestration.config import OrchestrationSettings, get_orchestration_settings
from orbit_orchestration.domain.constants import HITL_PAUSE_SENTINEL
from orbit_orchestration.domain.routing import TaskRouting, active_specialists
from orbit_orchestration.domain.session import OrchestrationSession
from orbit_orchestration.domain.types import AgentName


def _assistant_agent(model_client: OpenAIChatCompletionClient) -> AssistantAgent:
    return AssistantAgent(
        name="assistant",
        description="General helpful assistant for conversation, Q&A, and explanations.",
        model_client=model_client,
        system_message=(
            "You are the main Orbit assistant. Reply naturally to the user. "
            "Do not call tools. Do not mention routing, agents, or internal orchestration. "
            "For greetings, respond warmly and briefly. For questions, give a clear answer. "
            "Use fenced markdown code blocks with language tags (```python, ```css, ```html, "
            "```json, etc.) when showing code or structured data."
        ),
    )


def _summarizer_agent(
    model_client: OpenAIChatCompletionClient,
    settings: OrchestrationSettings,
) -> AssistantAgent:
    return AssistantAgent(
        name="summarizer",
        description="Summarizes long documents and text using summarize_text.",
        model_client=model_client,
        tools=[build_summarization_tool(settings)],
        system_message=(
            "You summarize long content. Only call summarize_text when the user pasted long text "
            "or explicitly asked for a summary. Pass one string argument `text` with the raw content. "
            "Never pass JSON schema objects. For short greetings or questions, do not use tools."
        ),
    )


def _image_agent(model_client: OpenAIChatCompletionClient) -> AssistantAgent:
    return AssistantAgent(
        name="image_generator",
        description="Creates images from prompts using the generate_image tool.",
        model_client=model_client,
        tools=[build_image_generation_tool()],
        system_message=(
            "You are the image generation specialist. The human has already answered clarifying "
            "questions in the conversation. Use their latest message as approval to proceed. "
            "Call generate_image once with a detailed prompt that includes their preferences "
            "(colors, style, mood, composition). Do not ask more questions. When done, say TERMINATE."
        ),
    )


def build_group_chat_team(
    session: OrchestrationSession,
    model_client: OpenAIChatCompletionClient,
    settings: OrchestrationSettings | None = None,
    routing: TaskRouting | None = None,
) -> SelectorGroupChat:
    cfg = settings or get_orchestration_settings()
    route = routing or session.routing
    specialists = active_specialists(route)

    participants: list = [_assistant_agent(model_client)]
    if "summarizer" in specialists:
        participants.append(_summarizer_agent(model_client, cfg))
    if "image_generator" in specialists:
        participants.append(build_human_proxy(session))
        participants.append(_image_agent(model_client))

    if len(participants) < 2:
        raise ValueError(
            "SelectorGroupChat requires at least two participants; use direct assistant mode."
        )

    termination = (
        MaxMessageTermination(cfg.max_team_turns)
        | TextMentionTermination("TERMINATE")
        | TextMentionTermination(HITL_PAUSE_SENTINEL)
    )

    return SelectorGroupChat(
        participants=participants,
        model_client=model_client,
        termination_condition=termination,
    )
