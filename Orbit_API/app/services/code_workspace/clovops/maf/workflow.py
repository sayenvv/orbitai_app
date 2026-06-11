from __future__ import annotations

from agent_framework import Agent, Workflow
from agent_framework.orchestrations import GroupChatBuilder

from app.services.code_workspace.clovops.maf.agents import ClovopsAgents


def build_plan_review_group_chat(agents: ClovopsAgents, *, max_rounds: int = 5) -> Workflow:
    """Group chat council to review an implementation plan before execution.

    Human-in-the-loop is enabled via ``with_request_info(agents=[planner])`` so the
    user can approve or steer the plan before the writer/reviewer cycle continues.
    """
    participants = [agents.planner, agents.code_reviewer, agents.validator]
    return (
        GroupChatBuilder(
            participants=participants,
            orchestrator_agent=agents.manager,
            max_rounds=max_rounds,
            intermediate_output_from=participants,
        )
        .with_request_info(agents=[agents.planner])
        .build()
    )


def build_code_collaboration_group_chat(agents: ClovopsAgents, *, max_rounds: int = 8) -> Workflow:
    """Group chat for write → review → validate collaboration."""
    participants = [agents.code_writer, agents.code_reviewer, agents.validator]
    return (
        GroupChatBuilder(
            participants=participants,
            orchestrator_agent=agents.manager,
            max_rounds=max_rounds,
            intermediate_output_from=participants,
        )
        .with_request_info(agents=[agents.code_writer])
        .build()
    )


def build_terminal_group_chat(agents: ClovopsAgents, *, max_rounds: int = 3) -> Workflow:
    """Short group chat for terminal command planning with human approval."""
    participants = [agents.terminal_agent, agents.validator]
    return (
        GroupChatBuilder(
            participants=participants,
            orchestrator_agent=agents.manager,
            max_rounds=max_rounds,
            intermediate_output_from=participants,
        )
        .with_request_info(agents=[agents.terminal_agent])
        .build()
    )


def build_assistant_group_chat(agents: ClovopsAgents, *, max_rounds: int = 2) -> Workflow:
    """Lightweight group chat for general assistant responses."""
    participants = [agents.assistant]
    return GroupChatBuilder(
        participants=participants,
        orchestrator_agent=agents.manager,
        max_rounds=max_rounds,
        intermediate_output_from=participants,
    ).build()


def select_group_chat_workflow(
    agents: ClovopsAgents,
    *,
    request_type: str | None,
    phase: str,
) -> Workflow:
    if phase == "plan_review":
        return build_plan_review_group_chat(agents)
    if request_type == "terminal" or phase == "terminal":
        return build_terminal_group_chat(agents)
    if request_type in {"code_edit", "bug_fix", "code_question"}:
        if phase == "collaboration":
            return build_code_collaboration_group_chat(agents)
        return build_plan_review_group_chat(agents)
    return build_assistant_group_chat(agents)
