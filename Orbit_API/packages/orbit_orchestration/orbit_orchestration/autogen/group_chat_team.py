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
from orbit_orchestration.domain.routing import TaskRouting
from orbit_orchestration.domain.session import OrchestrationSession
from orbit_orchestration.domain.types import AgentName


def _summarizer_agent(
    model_client: OpenAIChatCompletionClient,
    settings: OrchestrationSettings,
) -> AssistantAgent:
    return AssistantAgent(
        name="summarizer",
        description="Summarizes documents and long text using LangChain-backed tools.",
        model_client=model_client,
        tools=[build_summarization_tool(settings)],
        system_message=(
            "You are the summarization specialist. When the user provides text or asks for a "
            "summary, call summarize_text. Be concise in chat; put the full summary in the tool output."
        ),
    )


def _image_agent(model_client: OpenAIChatCompletionClient) -> AssistantAgent:
    return AssistantAgent(
        name="image_generator",
        description="Creates images from prompts using the generate_image tool.",
        model_client=model_client,
        tools=[build_image_generation_tool()],
        system_message=(
            "You are the image generation specialist. Before calling generate_image for a new "
            "image, ask the human (via the human participant) to approve or edit the prompt. "
            "Only call generate_image after explicit human approval. When the workflow is "
            "finished, say TERMINATE."
        ),
    )


def _active_specialists(routing: TaskRouting | None) -> set[AgentName]:
    if routing is None:
        return {"summarizer", "image_generator"}
    specialists = {a for a in routing.selected_agents if a in ("summarizer", "image_generator")}
    return specialists or {"summarizer", "image_generator"}


def build_group_chat_team(
    session: OrchestrationSession,
    model_client: OpenAIChatCompletionClient,
    settings: OrchestrationSettings | None = None,
    routing: TaskRouting | None = None,
) -> SelectorGroupChat:
    cfg = settings or get_orchestration_settings()
    route = routing or session.routing
    specialists = _active_specialists(route)

    participants = [build_human_proxy(session)]
    if "summarizer" in specialists:
        participants.append(_summarizer_agent(model_client, cfg))
    if "image_generator" in specialists:
        participants.append(_image_agent(model_client))

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
