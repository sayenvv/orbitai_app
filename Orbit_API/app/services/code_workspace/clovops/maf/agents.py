from __future__ import annotations

from dataclasses import dataclass

from agent_framework import Agent
from agent_framework.openai import OpenAIChatClient


@dataclass(frozen=True)
class ClovopsAgents:
    manager: Agent
    planner: Agent
    code_writer: Agent
    code_reviewer: Agent
    validator: Agent
    terminal_agent: Agent
    assistant: Agent


def build_clovops_agents(client: OpenAIChatClient) -> ClovopsAgents:
    """Specialist agents for the Clovops group-chat orchestration."""
    planner = Agent(
        client=client,
        name="Planner",
        description="Plans code changes from user requests and project context.",
        instructions=(
            "You are the Clovops planning agent inside a code IDE.\n"
            "Present a concise implementation plan with affected file paths, risks, and steps.\n"
            "Wait for human feedback when asked. Do not invent files outside the provided context."
        ),
    )

    code_writer = Agent(
        client=client,
        name="CodeWriter",
        description="Implements planned code changes.",
        instructions=(
            "You are the Clovops code writer.\n"
            "Propose concrete edits aligned with the approved plan.\n"
            "Reference file paths explicitly and keep changes minimal."
        ),
    )

    code_reviewer = Agent(
        client=client,
        name="CodeReviewer",
        description="Reviews proposed code changes for correctness and style.",
        instructions=(
            "You are the Clovops code reviewer.\n"
            "Review proposed changes for bugs, regressions, and missing edge cases.\n"
            "Be specific about file paths and lines when possible."
        ),
    )

    validator = Agent(
        client=client,
        name="Validator",
        description="Validates that changes satisfy the user request.",
        instructions=(
            "You are the Clovops validation agent.\n"
            "Check whether the plan and proposed edits satisfy the original user request.\n"
            "Flag blocking issues clearly; approve when ready to implement."
        ),
    )

    terminal_agent = Agent(
        client=client,
        name="TerminalAgent",
        description="Handles safe terminal command requests.",
        instructions=(
            "You are the Clovops terminal agent.\n"
            "Plan safe install and run steps for the project (dependencies first, then start).\n"
            "When a step fails, propose targeted install/fix commands before retrying.\n"
            "Never propose destructive commands outside the project sandbox."
        ),
    )

    assistant = Agent(
        client=client,
        name="Assistant",
        description="General IDE assistant for chat and explanations.",
        instructions=(
            "You are the Clovops IDE assistant.\n"
            "Reply briefly using only provided project context.\n"
            "Do not invent project details."
        ),
    )

    manager = Agent(
        client=client,
        name="ClovopsManager",
        description="Orchestrates the Clovops multi-agent coding workflow.",
        instructions=(
            "You manage a coding workflow team: Planner, CodeWriter, CodeReviewer, Validator, "
            "TerminalAgent, and Assistant.\n"
            "Select the next participant who should speak based on the task phase:\n"
            "1) Planning or plan review → Planner\n"
            "2) Implementation discussion → CodeWriter\n"
            "3) Quality review → CodeReviewer\n"
            "4) Final validation → Validator\n"
            "5) Shell/terminal tasks → TerminalAgent\n"
            "6) General chat → Assistant\n"
            "Rotate through relevant specialists until the task is complete.\n"
            "Do not select the same participant twice in a row unless necessary."
        ),
    )

    return ClovopsAgents(
        manager=manager,
        planner=planner,
        code_writer=code_writer,
        code_reviewer=code_reviewer,
        validator=validator,
        terminal_agent=terminal_agent,
        assistant=assistant,
    )
