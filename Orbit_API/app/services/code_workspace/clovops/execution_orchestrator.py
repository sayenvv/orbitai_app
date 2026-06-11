from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Literal

from sqlalchemy.orm import Session

from app.services.code_workspace.clovops.progress import (
    emit_agent_progress,
    emit_terminal_output,
    emit_workflow_event,
)
from app.services.code_workspace.clovops.run_plan import (
    create_project_run_plan,
    create_recovery_plan,
    normalize_terminal_command,
    server_started_successfully,
)
from app.services.code_workspace.clovops.terminal import run_safe_terminal_command

AgentRole = Literal["planner", "executor", "validator"]
PlanKind = Literal["run", "recovery"]


@dataclass
class ExecutionStep:
    command: str
    purpose: str
    agent: AgentRole = "executor"


@dataclass
class AgentPlan:
    kind: PlanKind
    summary: str
    steps: list[ExecutionStep] = field(default_factory=list)
    cycle: int = 0


@dataclass
class StepRecord:
    command: str
    purpose: str
    output: str
    exit_code: int | None
    executed: bool
    safe: bool
    agent: AgentRole
    plan_kind: PlanKind
    plan_cycle: int
    succeeded: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "command": self.command,
            "purpose": self.purpose,
            "output": self.output,
            "exitCode": self.exit_code,
            "executed": self.executed,
            "safe": self.safe,
            "agent": self.agent,
            "planKind": self.plan_kind,
            "planCycle": self.plan_cycle,
            "succeeded": self.succeeded,
        }


def _step_failed(result: dict[str, Any]) -> bool:
    output = str(result.get("output") or "")
    if server_started_successfully(output):
        return False
    exit_code = result.get("exitCode")
    if exit_code in (0, None) and result.get("safe", True):
        return False
    if not result.get("executed") and exit_code in (0, None):
        return False
    return True


class ExecutionOrchestrator:
    """Planner → Executor loop with error handoff back to Planner.

    Flow:
    1. Planner creates a run plan
    2. Executor runs each step
    3. On error → Planner creates a recovery plan → Executor runs it
    4. Any recovery error → hand back to Planner again
    5. Repeat until the run plan succeeds or Planner cannot recover
    """

    def __init__(
        self,
        db: Session,
        user_id: uuid.UUID,
        project_id: uuid.UUID,
        *,
        user_request: str,
        file_map: list[dict],
        context_files: list[dict] | None = None,
        active_file_path: str | None = None,
        project_title: str = "Project",
        max_total_steps: int = 40,
        max_plan_cycles: int = 15,
    ) -> None:
        self.db = db
        self.user_id = user_id
        self.project_id = project_id
        self.user_request = user_request
        self.file_map = file_map
        self.context_files = context_files or []
        self.active_file_path = active_file_path
        self.project_title = project_title
        self.max_total_steps = max_total_steps
        self.max_plan_cycles = max_plan_cycles
        self.executed_steps: list[StepRecord] = []
        self.plan_cycles = 0
        self._failure_signatures: set[tuple[str, str]] = set()

    def _file_paths(self) -> list[str]:
        paths: list[str] = []
        for item in self.file_map:
            path = str(item.get("filePath") or item.get("name") or "").strip()
            if path:
                paths.append(path)
        return paths

    def _recovery_satisfied_uvicorn_goal(self, failed_command: str) -> bool:
        if "uvicorn" not in failed_command.lower():
            return False
        for record in reversed(self.executed_steps):
            if record.plan_kind != "recovery" or not record.succeeded:
                continue
            if server_started_successfully(record.output):
                return True
        return False

    def _emit_planner(self, message: str) -> None:
        emit_agent_progress("plan_changes", message=message)
        emit_workflow_event(
            kind="planner_progress",
            title="Planner",
            message=message,
            agent_id="plan_changes",
            status="running",
            category="background",
        )

    def _emit_executor(self, message: str) -> None:
        emit_agent_progress("terminal", message=message)

    def _emit_validator(self, message: str) -> None:
        emit_agent_progress("validate_code", message=message)
        emit_workflow_event(
            kind="validation_progress",
            title="Validator",
            message=message,
            agent_id="validate_code",
            status="success",
            category="background",
        )

    def _emit_plan(self, plan: AgentPlan) -> None:
        emit_workflow_event(
            kind="plan_created" if plan.kind == "run" else "plan_recovery",
            title="Run plan" if plan.kind == "run" else "Recovery plan",
            message=plan.summary,
            agent_id="plan_changes",
            status="info",
            category="plan",
            meta={
                "planKind": plan.kind,
                "cycle": plan.cycle,
                "steps": [
                    {"command": step.command, "purpose": step.purpose}
                    for step in plan.steps
                ],
            },
            event_id=f"plan-{plan.kind}-{plan.cycle}",
        )

    def _execute_command(
        self,
        step: ExecutionStep,
        *,
        plan_kind: PlanKind,
        plan_cycle: int,
    ) -> StepRecord:
        tool_id = f"tool-{plan_kind}-{plan_cycle}-{abs(hash(step.command)) % 10_000_000}"
        emit_workflow_event(
            kind="tool_call",
            title="Terminal",
            message=step.command,
            detail=step.purpose,
            agent_id="executor",
            status="running",
            category="tool",
            meta={"tool": "terminal", "planKind": plan_kind, "planCycle": plan_cycle},
            event_id=tool_id,
        )
        self._emit_executor(f"{step.purpose} — `{step.command}`")
        result = run_safe_terminal_command(
            self.db,
            self.user_id,
            self.project_id,
            command=step.command,
            active_file_path=self.active_file_path,
        )
        record = StepRecord(
            command=step.command,
            purpose=step.purpose,
            output=str(result.get("output") or ""),
            exit_code=result.get("exitCode") if isinstance(result.get("exitCode"), int) else None,
            executed=bool(result.get("executed")),
            safe=bool(result.get("safe", True)),
            agent="executor",
            plan_kind=plan_kind,
            plan_cycle=plan_cycle,
            succeeded=not _step_failed(result),
        )
        self.executed_steps.append(record)
        if result.get("executed") or str(result.get("output") or "").strip():
            emit_terminal_output(
                command=step.command,
                output=record.output,
                exit_code=record.exit_code,
                executed=record.executed,
                purpose=step.purpose,
                plan_kind=plan_kind,
                plan_cycle=plan_cycle,
                agent=record.agent,
            )
        emit_workflow_event(
            kind="tool_result",
            title="Terminal",
            message=step.command,
            detail=record.output[:4000] if record.output else None,
            agent_id="executor",
            status="success" if record.succeeded else "error",
            category="tool",
            meta={
                "tool": "terminal",
                "planKind": plan_kind,
                "planCycle": plan_cycle,
                "exitCode": record.exit_code,
                "executed": record.executed,
            },
            event_id=tool_id,
        )
        if record.succeeded:
            self._emit_validator(f"Step OK: {step.purpose}")
        return record

    async def _planner_run_plan(self) -> AgentPlan:
        self.plan_cycles += 1
        self._emit_planner("Creating run plan…")
        raw = await create_project_run_plan(
            user_request=self.user_request,
            file_map=self.file_map,
            context_files=self.context_files,
            active_file_path=self.active_file_path,
            project_title=self.project_title,
        )
        steps = [
            ExecutionStep(
                command=normalize_terminal_command(
                    str(item["command"]),
                    self._file_paths(),
                ),
                purpose=str(item.get("purpose") or "Run step"),
                agent="executor",
            )
            for item in raw.get("steps") or []
            if str(item.get("command") or "").strip()
        ]
        plan = AgentPlan(
            kind="run",
            summary=str(raw.get("summary") or "Run plan"),
            steps=steps,
            cycle=self.plan_cycles,
        )
        self._emit_plan(plan)
        return plan

    async def _planner_recovery_plan(
        self,
        *,
        failed_command: str,
        failed_purpose: str,
        output: str,
        exit_code: int | None,
        parent_plan: AgentPlan,
    ) -> AgentPlan | None:
        self.plan_cycles += 1
        if self.plan_cycles > self.max_plan_cycles:
            return None

        self._emit_planner(f"Planning fix for: {failed_purpose}")
        raw = await create_recovery_plan(
            user_request=self.user_request,
            failed_command=failed_command,
            failed_purpose=failed_purpose,
            output=output,
            exit_code=exit_code,
            file_map=self.file_map,
            executed_steps=[step.to_dict() for step in self.executed_steps],
            parent_plan_summary=parent_plan.summary,
        )
        if raw.get("done") or not raw.get("steps"):
            return None

        steps = [
            ExecutionStep(
                command=normalize_terminal_command(
                    str(item["command"]),
                    self._file_paths(),
                ),
                purpose=str(item.get("purpose") or "Recovery step"),
                agent="executor",
            )
            for item in raw.get("steps") or []
            if str(item.get("command") or "").strip()
        ]
        if not steps:
            return None

        plan = AgentPlan(
            kind="recovery",
            summary=str(raw.get("summary") or "Recovery plan"),
            steps=steps,
            cycle=self.plan_cycles,
        )
        self._emit_plan(plan)
        return plan

    async def _execute_plan_until_done(
        self,
        plan: AgentPlan,
        *,
        parent_plan: AgentPlan | None = None,
    ) -> bool:
        """Execute every step in a plan; on failure hand off to Planner for recovery."""
        index = 0
        while index < len(plan.steps):
            if len(self.executed_steps) >= self.max_total_steps:
                return False

            step = plan.steps[index]
            normalized_command = normalize_terminal_command(step.command, self._file_paths())
            if normalized_command != step.command:
                step = ExecutionStep(command=normalized_command, purpose=step.purpose, agent=step.agent)
            record = self._execute_command(step, plan_kind=plan.kind, plan_cycle=plan.cycle)
            if record.succeeded:
                index += 1
                continue

            signature = (step.command, record.output[-400:])
            if signature in self._failure_signatures:
                return False
            self._failure_signatures.add(signature)

            recovery_parent = parent_plan or plan
            recovery = await self._planner_recovery_plan(
                failed_command=step.command,
                failed_purpose=step.purpose,
                output=record.output,
                exit_code=record.exit_code,
                parent_plan=recovery_parent,
            )
            if recovery is None:
                return False

            recovered = await self._execute_plan_until_done(recovery, parent_plan=recovery_parent)
            if not recovered:
                return False

            if self._recovery_satisfied_uvicorn_goal(step.command):
                index += 1
                continue

            retry_command = normalize_terminal_command(step.command, self._file_paths())
            retry_record = self._execute_command(
                ExecutionStep(command=retry_command, purpose=step.purpose, agent=step.agent),
                plan_kind=plan.kind,
                plan_cycle=plan.cycle,
            )
            if retry_record.succeeded:
                index += 1
                continue

            return False

        return True

    async def run(self, *, explicit_command: str | None = None) -> dict[str, Any]:
        if explicit_command:
            plan = AgentPlan(
                kind="run",
                summary=f"Run `{explicit_command}`",
                steps=[
                    ExecutionStep(
                        command=normalize_terminal_command(
                            explicit_command,
                            self._file_paths(),
                        ),
                        purpose=f"Run `{explicit_command}`",
                    )
                ],
                cycle=1,
            )
            self.plan_cycles = 1
            self._emit_planner("Creating run plan…")
        else:
            plan = await self._planner_run_plan()
            if not plan.steps:
                return self._build_result(
                    plan,
                    succeeded=False,
                    message="Could not determine how to run this project.",
                )

        succeeded = await self._execute_plan_until_done(plan)
        return self._build_result(plan, succeeded=succeeded)

    def _build_result(self, plan: AgentPlan, *, succeeded: bool, message: str | None = None) -> dict[str, Any]:
        steps_dict = [step.to_dict() for step in self.executed_steps]
        last = steps_dict[-1] if steps_dict else {}

        summary_lines = [plan.summary]
        for item in steps_dict:
            agent = item.get("agent") or "executor"
            status = "ok" if item.get("succeeded") else "failed"
            kind = item.get("planKind") or "run"
            summary_lines.append(
                f"- [{status}] ({agent}/{kind}) {item.get('purpose')}: `{item.get('command')}`"
            )
        if succeeded:
            summary_lines.append("All steps completed successfully.")
        elif message:
            summary_lines.append(message)
        else:
            summary_lines.append("Stopped — Planner could not recover from the last error.")

        return {
            "command": str(last.get("command") or ""),
            "output": str(last.get("output") or ""),
            "exitCode": 0 if succeeded else last.get("exitCode"),
            "executed": bool(last.get("executed")),
            "safe": bool(last.get("safe", True)),
            "plan_summary": plan.summary,
            "steps": steps_dict,
            "succeeded": succeeded,
            "plan_cycles": self.plan_cycles,
            "response_text": "\n".join(summary_lines),
        }
