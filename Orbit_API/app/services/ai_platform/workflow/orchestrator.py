"""Directed workflow orchestrator for project generation."""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models import User
from app.models.ai_platform import PlatformWorkflowConfig
from app.services.ai_platform.artifacts.blob_service import BlobStorageService
from app.services.ai_platform.checkpoint.manager import CheckpointManager
from app.services.ai_platform.common_agent.factory import CommonAgentFactory
from app.services.ai_platform.context.builder import ContextBuilder
from app.services.ai_platform.design_quality import repair_static_project
from app.services.ai_platform.project_routing import derive_tasks, resolve_template_key
from app.services.ai_platform.static_fast_path import (
    build_compact_codegen_prompt,
    build_local_artifact,
    build_local_documentation,
    build_local_intent,
    build_local_review,
    build_local_validation,
    codegen_tasks,
    is_static_fast_path_prompt,
    prepare_static_fast_context,
    should_use_static_fast_path,
)
from app.services.ai_platform.stores.config_store import (
    ensure_default_platform_configs,
    get_agent_config_by_role,
    get_workflow_for_intent,
)
from app.services.ai_platform.stores.run_store import RunStore
from app.services.ai_platform.tools.file_tools import list_file_tree, write_workspace_files
from app.services.ai_platform.tools.registry import tool_registry
from app.services.ai_platform.tools.validation_tools import run_validation
from app.services.ai_platform.tools.zip_tools import create_workspace_zip
from app.services.ai_platform.types import StreamEvent, WorkflowContext
from app.services.ai_platform.workspace.manager import WorkspaceManager
from app.services.token_usage import record_usage


class WorkflowOrchestrator:
    def __init__(self) -> None:
        self.context_builder = ContextBuilder()
        self.checkpoints = CheckpointManager()
        self.runs = RunStore()
        self.workspaces = WorkspaceManager()
        self.blobs = BlobStorageService()

    async def run_project_generation(
        self,
        db: Session,
        *,
        user: User,
        prompt: str,
        estimated_tokens: int = 8000,
    ) -> AsyncIterator[dict[str, Any]]:
        ensure_default_platform_configs(db)

        run_id = uuid.uuid4()
        workspace_path = self.workspaces.create(user.id, run_id)
        workflow_row = self.runs.create_run(
            db,
            user_id=user.id,
            prompt=prompt,
            workflow_config_id=None,
            workspace_path=workspace_path,
        )

        ctx = WorkflowContext(
            workflow_run_id=str(workflow_row.id),
            user_id=str(user.id),
            prompt=prompt,
            stage="intent_classification",
            workspace_path=workspace_path,
        )

        yield StreamEvent(
            type="workflow_started",
            stage="intent_classification",
            message="Starting project generation workflow",
            payload={"workflow_run_id": str(workflow_row.id)},
        ).to_sse()
        self.runs.log(
            db,
            workflow_run_id=workflow_row.id,
            stage="intent_classification",
            log_type="workflow_started",
            message="Starting project generation workflow",
        )

        total_in = 0
        total_out = 0

        try:
            if is_static_fast_path_prompt(prompt):
                intent_payload = build_local_intent(prompt)
                usage = {"token_input": 0, "token_output": 0}
                ctx = prepare_static_fast_context(
                    ctx.model_copy(
                        update={
                            "intent": str(intent_payload["intent"]),
                            "intent_metadata": intent_payload,
                        }
                    )
                )
                yield StreamEvent(
                    type="agent_completed",
                    stage="intent_classification",
                    agent="Intent Classifier",
                    message="Intent classified as project_generation (static fast path)",
                    payload={**intent_payload, "static_fast_path": True},
                ).to_sse()
            else:
                intent_payload, usage = await self._run_agent_stage(
                    db, ctx, stage="intent_classification", role_key="intent_classifier"
                )
                total_in += usage["token_input"]
                total_out += usage["token_output"]
                ctx.intent = str(intent_payload.get("intent") or "project_generation")
                ctx.intent_metadata = dict(intent_payload)
                if should_use_static_fast_path(ctx):
                    ctx = prepare_static_fast_context(ctx)
                yield StreamEvent(
                    type="agent_completed",
                    stage="intent_classification",
                    agent="Intent Classifier",
                    message=f"Intent classified as {ctx.intent}",
                    payload=intent_payload,
                ).to_sse()

            ctx.intent = str(ctx.intent or intent_payload.get("intent") or "project_generation")
            self.checkpoints.save(
                db,
                workflow_run_id=workflow_row.id,
                stage="intent_classification",
                checkpoint_data=dict(ctx.intent_metadata or intent_payload),
                workspace_path=workspace_path,
            )

            workflow_cfg = get_workflow_for_intent(db, ctx.intent) or self._default_workflow(db)
            stages = list(workflow_cfg.stages_json or [])
            max_fix = int(workflow_cfg.max_fix_attempts or 3)

            for stage_item in stages:
                stage = str(stage_item.get("stage") or "")
                role_key = str(stage_item.get("role_key") or "")
                if stage in {"intent_classification", "upload", "fix"}:
                    continue
                ctx.stage = stage
                workflow_row.current_stage = stage
                db.add(workflow_row)
                db.commit()

                yield StreamEvent(
                    type="agent_started",
                    stage=stage,
                    agent=role_key.replace("_", " ").title(),
                    message=f"Running stage {stage}",
                ).to_sse()

                if stage == "write_files":
                    written = write_workspace_files(workspace_path, ctx.generated_files)
                    ctx.file_tree = list_file_tree(workspace_path)
                    payload = {"written": written}
                    yield StreamEvent(
                        type="file_created",
                        stage=stage,
                        message=f"Wrote {len(written)} files",
                        payload=payload,
                    ).to_sse()
                    self.checkpoints.save(
                        db,
                        workflow_run_id=workflow_row.id,
                        stage=stage,
                        checkpoint_data=payload,
                        workspace_path=workspace_path,
                    )
                    continue

                if stage == "validation":
                    if should_use_static_fast_path(ctx):
                        validation = build_local_validation()
                        ctx.validation = validation
                        yield StreamEvent(
                            type="command_log",
                            stage=stage,
                            message="Static site — validation skipped (no build step)",
                            payload=validation,
                        ).to_sse()
                        self.checkpoints.save(
                            db,
                            workflow_run_id=workflow_row.id,
                            stage=stage,
                            checkpoint_data=validation,
                            workspace_path=workspace_path,
                        )
                        continue

                    build_command = str((ctx.architecture or {}).get("build_command") or "")
                    validation = await run_validation(workspace_path, build_command or None)
                    ctx.validation = validation
                    if validation.get("status") != "passed":
                        ctx.errors.append(str(validation.get("log") or "validation failed"))
                        yield StreamEvent(
                            type="command_failed",
                            stage=stage,
                            message="Validation failed",
                            payload=validation,
                        ).to_sse()
                        for attempt in range(max_fix):
                            ctx.retry_count = attempt + 1
                            yield StreamEvent(
                                type="fix_started",
                                stage="fix",
                                message=f"Fix attempt {attempt + 1}/{max_fix}",
                            ).to_sse()
                            try:
                                fix_output, fix_usage = None, None
                                async for item in self._run_agent_stage_with_heartbeats(
                                    db, ctx, stage="fix", role_key="fix"
                                ):
                                    if isinstance(item, StreamEvent):
                                        yield item.to_sse()
                                    else:
                                        fix_output, fix_usage = item
                                if fix_output is None or fix_usage is None:
                                    raise ValueError("Fix agent returned no output")
                                total_in += fix_usage["token_input"]
                                total_out += fix_usage["token_output"]
                                patches = list(fix_output.get("patches") or [])
                                if patches:
                                    tool_registry.execute(
                                        "patch_apply",
                                        workspace_path=workspace_path,
                                        patches=patches,
                                    )
                                    yield StreamEvent(
                                        type="command_log",
                                        stage="fix",
                                        message=f"Applied {len(patches)} patch(es)",
                                        payload={"patches": [p.get("path") for p in patches]},
                                    ).to_sse()
                                else:
                                    yield StreamEvent(
                                        type="command_log",
                                        stage="fix",
                                        message="Fix agent returned no patches",
                                    ).to_sse()
                            except Exception as fix_exc:
                                yield StreamEvent(
                                    type="command_log",
                                    stage="fix",
                                    message=f"Fix attempt skipped: {fix_exc}",
                                ).to_sse()
                                ctx.errors.append(str(fix_exc))
                            validation = await run_validation(
                                workspace_path, build_command or None
                            )
                            ctx.validation = validation
                            self.checkpoints.save(
                                db,
                                workflow_run_id=workflow_row.id,
                                stage="fix",
                                checkpoint_data={
                                    "attempt": attempt + 1,
                                    "validation": validation,
                                },
                                workspace_path=workspace_path,
                                retry_count=attempt + 1,
                            )
                            if validation.get("status") == "passed":
                                yield StreamEvent(
                                    type="command_log",
                                    stage="fix",
                                    message="Fix loop succeeded",
                                    payload=validation,
                                ).to_sse()
                                break
                            ctx.errors.append(str(validation.get("log") or ""))
                        if validation.get("status") != "passed":
                            yield StreamEvent(
                                type="command_log",
                                stage=stage,
                                message="Validation did not pass — continuing with generated project",
                                payload=validation,
                            ).to_sse()
                    else:
                        yield StreamEvent(
                            type="command_log",
                            stage=stage,
                            message="Validation passed",
                            payload=validation,
                        ).to_sse()
                    self.checkpoints.save(
                        db,
                        workflow_run_id=workflow_row.id,
                        stage=stage,
                        checkpoint_data=ctx.validation,
                        workspace_path=workspace_path,
                    )
                    continue

                if stage == "artifact":
                    if should_use_static_fast_path(ctx):
                        output = build_local_artifact(ctx)
                        usage = {"token_input": 0, "token_output": 0}
                        ctx.artifact = output
                        yield StreamEvent(
                            type="agent_completed",
                            stage=stage,
                            agent="Artifact Agent",
                            message="Artifact metadata prepared (static fast path)",
                            payload=output,
                        ).to_sse()
                        self.checkpoints.save(
                            db,
                            workflow_run_id=workflow_row.id,
                            stage=stage,
                            checkpoint_data=output,
                            workspace_path=workspace_path,
                        )
                        continue

                    output, usage = None, None
                    async for item in self._run_agent_stage_with_heartbeats(
                        db, ctx, stage=stage, role_key=role_key
                    ):
                        if isinstance(item, StreamEvent):
                            yield item.to_sse()
                        else:
                            output, usage = item
                    assert output is not None and usage is not None
                    total_in += usage["token_input"]
                    total_out += usage["token_output"]
                    ctx.artifact = output
                    self.checkpoints.save(
                        db,
                        workflow_run_id=workflow_row.id,
                        stage=stage,
                        checkpoint_data=output,
                        workspace_path=workspace_path,
                    )
                    continue

                if stage in {"requirements", "planning", "architecture"} and should_use_static_fast_path(ctx):
                    if stage == "requirements":
                        output = dict(ctx.requirements or {})
                    elif stage == "planning":
                        output = dict(ctx.plan or {})
                    else:
                        output = dict(ctx.architecture or {})
                        template_key = str(output.get("template_key") or resolve_template_key(ctx))
                        output["template_key"] = template_key
                        ctx.architecture = output
                        if not ctx.generated_files:
                            self.workspaces.seed_template(workspace_path, template_key)
                        yield StreamEvent(
                            type="command_log",
                            stage=stage,
                            message=f"Using template: {template_key}",
                            payload={"template_key": template_key},
                        ).to_sse()

                    self._apply_stage_output(ctx, stage, output)
                    yield StreamEvent(
                        type="agent_completed",
                        stage=stage,
                        agent=role_key.replace("_", " ").title(),
                        message=f"Completed {stage} (static fast path)",
                        payload=output,
                    ).to_sse()
                    self.checkpoints.save(
                        db,
                        workflow_run_id=workflow_row.id,
                        stage=stage,
                        checkpoint_data=output,
                        workspace_path=workspace_path,
                    )
                    continue

                if stage == "task_breakdown":
                    template_key = resolve_template_key(ctx)
                    if should_use_static_fast_path(ctx):
                        tasks = codegen_tasks(ctx)
                    else:
                        tasks = derive_tasks(ctx, template_key)
                    tasks_payload = {
                        "template_key": template_key,
                        "tasks": tasks,
                    }
                    ctx.tasks = list(tasks_payload["tasks"])
                    yield StreamEvent(
                        type="agent_completed",
                        stage=stage,
                        agent=role_key,
                        message=f"Planned {len(ctx.tasks)} file tasks",
                        payload=tasks_payload,
                    ).to_sse()
                    self.checkpoints.save(
                        db,
                        workflow_run_id=workflow_row.id,
                        stage=stage,
                        checkpoint_data=tasks_payload,
                        workspace_path=workspace_path,
                    )
                    continue

                if stage == "code_generation":
                    async for item in self._run_batched_code_generation(
                        db,
                        ctx,
                        workspace_path=workspace_path,
                        role_key=role_key,
                    ):
                        if isinstance(item, dict) and item.get("_internal"):
                            total_in += item["usage"]["token_input"]
                            total_out += item["usage"]["token_output"]
                            output = item["output"]
                            self._apply_stage_output(ctx, stage, output)
                            ctx.file_tree = list_file_tree(workspace_path)
                            yield StreamEvent(
                                type="agent_completed",
                                stage=stage,
                                agent=role_key,
                                message=f"Completed {stage} ({len(output.get('files') or [])} files)",
                                payload=output,
                            ).to_sse()
                            self.checkpoints.save(
                                db,
                                workflow_run_id=workflow_row.id,
                                stage=stage,
                                checkpoint_data=output,
                                workspace_path=workspace_path,
                            )
                            template_key = resolve_template_key(ctx)
                            if template_key == "static_html":
                                fixes = repair_static_project(workspace_path)
                                for fix in fixes:
                                    yield StreamEvent(
                                        type="command_log",
                                        stage="code_generation",
                                        message=fix,
                                    ).to_sse()
                        else:
                            yield item.to_sse()
                    continue

                if stage == "documentation" and should_use_static_fast_path(ctx):
                    output = build_local_documentation(ctx)
                    write_workspace_files(workspace_path, list(output.get("files") or []))
                    self._apply_stage_output(ctx, stage, output)
                    ctx.file_tree = list_file_tree(workspace_path)
                    yield StreamEvent(
                        type="agent_completed",
                        stage=stage,
                        agent=role_key,
                        message="Completed documentation (static fast path)",
                        payload=output,
                    ).to_sse()
                    self.checkpoints.save(
                        db,
                        workflow_run_id=workflow_row.id,
                        stage=stage,
                        checkpoint_data=output,
                        workspace_path=workspace_path,
                    )
                    continue

                yield StreamEvent(
                    type="agent_progress",
                    stage=stage,
                    agent=role_key.replace("_", " ").title(),
                    message="Waiting for model response (typically 30–120 seconds)…",
                ).to_sse()

                review_scan: dict[str, Any] | None = None
                if stage == "review":
                    review_scan = tool_registry.execute("security_scan", workspace_path=workspace_path)
                    if should_use_static_fast_path(ctx):
                        output = build_local_review(review_scan)
                        usage = {"token_input": 0, "token_output": 0}
                        output["security_scan"] = review_scan
                        total_in += usage["token_input"]
                        total_out += usage["token_output"]
                        self._apply_stage_output(ctx, stage, output)
                        ctx.file_tree = list_file_tree(workspace_path)
                        yield StreamEvent(
                            type="agent_completed",
                            stage=stage,
                            agent=role_key,
                            message="Completed review (static fast path)",
                            payload=output,
                        ).to_sse()
                        self.checkpoints.save(
                            db,
                            workflow_run_id=workflow_row.id,
                            stage=stage,
                            checkpoint_data=output,
                            workspace_path=workspace_path,
                        )
                        continue

                output, usage = None, None
                try:
                    async for item in self._run_agent_stage_with_heartbeats(
                        db, ctx, stage=stage, role_key=role_key
                    ):
                        if isinstance(item, StreamEvent):
                            yield item.to_sse()
                        else:
                            output, usage = item
                except (TimeoutError, ValueError) as exc:
                    if stage == "review" and review_scan is not None:
                        yield StreamEvent(
                            type="command_log",
                            stage=stage,
                            message=f"Review agent skipped LLM pass: {exc}",
                        ).to_sse()
                        findings = list(review_scan.get("findings") or [])
                        output = {
                            "passed": bool(review_scan.get("passed", True)),
                            "issues": ["Automated security scan used instead of full LLM review."],
                            "missing_files": [],
                            "security_warnings": findings,
                            "review_mode": "security_scan_fallback",
                        }
                        usage = {"token_input": 0, "token_output": 0}
                    else:
                        raise

                assert output is not None and usage is not None
                total_in += usage["token_input"]
                total_out += usage["token_output"]
                self._apply_stage_output(ctx, stage, output)
                ctx.file_tree = list_file_tree(workspace_path)

                if stage == "architecture":
                    template_key = resolve_template_key(ctx, output)
                    output["template_key"] = template_key
                    ctx.architecture = output
                    if not ctx.generated_files:
                        self.workspaces.seed_template(workspace_path, template_key)
                    yield StreamEvent(
                        type="command_log",
                        stage=stage,
                        message=f"Using template: {template_key}",
                        payload={"template_key": template_key},
                    ).to_sse()

                if stage == "documentation" and output.get("files"):
                    write_workspace_files(workspace_path, list(output["files"]))

                if stage == "review":
                    if review_scan is not None:
                        output["security_scan"] = review_scan
                    elif "security_scan" not in output:
                        output["security_scan"] = tool_registry.execute(
                            "security_scan", workspace_path=workspace_path
                        )

                yield StreamEvent(
                    type="agent_completed",
                    stage=stage,
                    agent=role_key,
                    message=f"Completed {stage}",
                    payload=output,
                ).to_sse()

                self.checkpoints.save(
                    db,
                    workflow_run_id=workflow_row.id,
                    stage=stage,
                    checkpoint_data=output,
                    workspace_path=workspace_path,
                )

            yield StreamEvent(
                type="agent_progress",
                stage="upload",
                message="Creating ZIP archive…",
            ).to_sse()
            artifact_name = str(
                (ctx.artifact or {}).get("artifact_name")
                or f"project-{workflow_row.id}.zip"
            )
            exclude = list((ctx.artifact or {}).get("exclude_paths") or [])
            zip_path = str(Path(workspace_path) / "artifacts" / artifact_name)
            zip_meta = create_workspace_zip(workspace_path, zip_path, exclude_paths=exclude)
            yield StreamEvent(type="zip_created", stage="artifact", message="ZIP created", payload=zip_meta).to_sse()

            yield StreamEvent(
                type="agent_progress",
                stage="upload",
                message="Uploading artifact…",
            ).to_sse()
            upload = self.blobs.upload_file(zip_meta["path"], blob_name=artifact_name)
            artifact_row = self.runs.save_artifact(
                db,
                workflow_run_id=workflow_row.id,
                file_name=artifact_name,
                blob_url=upload["blob_url"],
                size_bytes=int(upload["size_bytes"]),
            )

            tokens_charged = total_in + total_out
            if tokens_charged <= 0:
                tokens_charged = estimated_tokens
            try:
                usage_snapshot = record_usage(db, user, tokens_charged)
            except ValueError as exc:
                usage_snapshot = None
                yield StreamEvent(
                    type="agent_progress",
                    stage="upload",
                    message=f"Artifact saved; token billing skipped: {exc}",
                ).to_sse()

            summary = (
                f"Generated project with {len(ctx.generated_files)} files. "
                f"Download: {upload['blob_url']}"
            )
            self.runs.complete_run(
                db,
                workflow_row,
                status="completed",
                summary=summary,
                artifact_url=upload["blob_url"],
                token_input=total_in,
                token_output=total_out,
            )

            yield StreamEvent(
                type="completed",
                stage="upload",
                message=summary,
                payload={
                    "workflow_run_id": str(workflow_row.id),
                    "artifact_url": upload["blob_url"],
                    "artifact_id": str(artifact_row.id),
                    "token_input": total_in,
                    "token_output": total_out,
                    "tokens_charged": tokens_charged,
                    "usage": (
                        {
                            "tokens_used": usage_snapshot.tokens_used,
                            "tokens_limit": usage_snapshot.tokens_limit,
                            "tokens_remaining": usage_snapshot.tokens_remaining,
                            "usage_percent": usage_snapshot.usage_percent,
                            "limit_reached": usage_snapshot.limit_reached,
                        }
                        if usage_snapshot is not None
                        else None
                    ),
                },
            ).to_sse()

        except Exception as exc:
            self.runs.complete_run(
                db,
                workflow_row,
                status="failed",
                summary=str(exc),
                token_input=total_in,
                token_output=total_out,
            )
            yield StreamEvent(
                type="error",
                stage=ctx.stage,
                message=str(exc),
            ).to_sse()

    async def _run_agent_stage(
        self,
        db: Session,
        ctx: WorkflowContext,
        *,
        stage: str,
        role_key: str,
        prompt_override: str | None = None,
    ) -> tuple[dict[str, Any], dict[str, int]]:
        config_row = get_agent_config_by_role(db, role_key)
        if config_row is None:
            raise ValueError(f"No enabled agent config for role: {role_key}")

        agent = CommonAgentFactory.from_db_row(config_row)
        prompt = prompt_override or self.context_builder.build(ctx, stage=stage, role_key=role_key)
        agent_run = self.runs.start_agent_run(
            db,
            workflow_run_id=uuid.UUID(ctx.workflow_run_id),
            agent_name=agent.config.name,
            role_key=role_key,
            stage=stage,
            input_json={"prompt_chars": len(prompt)},
        )
        try:
            output, usage = await agent.run_json(prompt)
            self.runs.finish_agent_run(
                db,
                agent_run,
                output_json=output,
                token_input=usage["token_input"],
                token_output=usage["token_output"],
            )
            return output, usage
        except Exception as exc:
            self.runs.finish_agent_run(
                db,
                agent_run,
                output_json=None,
                token_input=0,
                token_output=0,
                status="failed",
                error=str(exc),
            )
            raise

    async def _run_agent_stage_with_heartbeats(
        self,
        db: Session,
        ctx: WorkflowContext,
        *,
        stage: str,
        role_key: str,
        prompt_override: str | None = None,
    ) -> AsyncIterator[StreamEvent | tuple[dict[str, Any], dict[str, int]]]:
        """Run an agent stage while emitting heartbeat events every 20s."""
        task = asyncio.create_task(
            self._run_agent_stage(
                db,
                ctx,
                stage=stage,
                role_key=role_key,
                prompt_override=prompt_override,
            )
        )
        elapsed = 0
        while True:
            done, _ = await asyncio.wait({task}, timeout=20)
            if task in done:
                yield await task
                return
            elapsed += 20
            yield StreamEvent(
                type="heartbeat",
                stage=stage,
                agent=role_key.replace("_", " ").title(),
                message=f"Still working… ({elapsed}s elapsed)",
            )

    async def _run_batched_code_generation(
        self,
        db: Session,
        ctx: WorkflowContext,
        *,
        workspace_path: str,
        role_key: str,
    ):
        """Generate files in small batches with progress events between LLM calls."""
        fast_path = should_use_static_fast_path(ctx)
        tasks = list(ctx.tasks[:12])
        batch_size = 1
        all_files: list[dict[str, Any]] = []
        total_usage = {"token_input": 0, "token_output": 0}

        batches: list[list[dict[str, Any]]]
        if tasks:
            batches = [tasks[i : i + batch_size] for i in range(0, len(tasks), batch_size)]
        else:
            batches = [[]]

        for batch_index, batch in enumerate(batches, start=1):
            label = (
                f"Customizing copy ({batch_index}/{len(batches)})"
                if fast_path and batch
                else (
                    f"Generating batch {batch_index}/{len(batches)}"
                    if batch
                    else "Generating customized files from template"
                )
            )
            yield StreamEvent(
                type="agent_progress",
                stage="code_generation",
                agent="Code Generation",
                message=f"{label}…",
                payload={"batch": batch_index, "total_batches": len(batches), "task_count": len(batch)},
            )

            batch_ctx = ctx.model_copy(update={"tasks": batch} if batch else {})
            prompt_override = (
                build_compact_codegen_prompt(ctx, task=batch[0]) if fast_path and batch else None
            )
            output, usage = None, None
            last_batch_error: Exception | None = None
            for batch_attempt in range(2):
                try:
                    async for item in self._run_agent_stage_with_heartbeats(
                        db,
                        batch_ctx,
                        stage="code_generation",
                        role_key=role_key,
                        prompt_override=prompt_override,
                    ):
                        if isinstance(item, StreamEvent):
                            yield item
                        else:
                            output, usage = item
                    last_batch_error = None
                    break
                except Exception as exc:
                    last_batch_error = exc
                    if batch_attempt == 0 and batch:
                        yield StreamEvent(
                            type="agent_progress",
                            stage="code_generation",
                            agent="Code Generation",
                            message="Retrying file generation with a shorter output target…",
                        ).to_sse()
                        compact_tasks = [
                            {
                                **batch[0],
                                "instruction": (
                                    f"{batch[0].get('instruction', '')} "
                                    "Keep the file under 150 lines with clean, minimal code."
                                ),
                            }
                        ]
                        batch_ctx = ctx.model_copy(update={"tasks": compact_tasks})
                        continue
                    raise
            if last_batch_error is not None:
                raise last_batch_error
            assert output is not None and usage is not None
            total_usage["token_input"] += usage["token_input"]
            total_usage["token_output"] += usage["token_output"]
            files = list(output.get("files") or [])
            if files:
                write_workspace_files(workspace_path, files)
                all_files.extend(files)
                yield StreamEvent(
                    type="file_created",
                    stage="code_generation",
                    message=f"Wrote {len(files)} files (batch {batch_index}/{len(batches)})",
                    payload={"count": len(files), "paths": [f.get("path") for f in files]},
                )

        combined = {"files": all_files}
        yield {
            "_internal": True,
            "output": combined,
            "usage": total_usage,
        }

    @staticmethod
    def _apply_stage_output(ctx: WorkflowContext, stage: str, output: dict[str, Any]) -> None:
        if stage == "requirements":
            ctx.requirements = output
        elif stage == "planning":
            ctx.plan = output
        elif stage == "architecture":
            ctx.architecture = output
        elif stage == "task_breakdown":
            ctx.tasks = list(output.get("tasks") or [])[:12]
        elif stage == "code_generation":
            files = list(output.get("files") or [])
            if files:
                ctx.generated_files = files
        elif stage == "review":
            ctx.review = output
        elif stage == "documentation":
            ctx.documentation = output
        elif stage == "artifact":
            ctx.artifact = output

    @staticmethod
    def _default_workflow(db: Session) -> PlatformWorkflowConfig:
        cfg = get_workflow_for_intent(db, "project_generation")
        if cfg is None:
            raise ValueError("No workflow configuration found for project_generation")
        return cfg
