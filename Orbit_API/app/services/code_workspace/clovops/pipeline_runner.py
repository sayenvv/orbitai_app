from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

from app.services.code_workspace.clovops.orchestrator import (
    STEP_RUNNERS,
    _adapt_pipeline,
    _gateway_node,
)
from app.services.code_workspace.clovops.types import ClovopsGraphState, ClovopsPipelineStep

_TICK_SECONDS = 0.05


async def _await_with_ticks(
    coro,
    merged: ClovopsGraphState,
) -> AsyncIterator[tuple[str, dict[str, Any], ClovopsGraphState]]:
    """Run a coroutine while yielding tick events so progress can stream live."""
    task = asyncio.create_task(coro)
    try:
        while not task.done():
            yield "tick", {}, dict(merged)
            await asyncio.sleep(_TICK_SECONDS)
        await task
    except Exception:
        if not task.done():
            task.cancel()
        raise


async def run_clovops_pipeline(
    state: ClovopsGraphState,
    *,
    start_after_gateway: bool = False,
) -> AsyncIterator[tuple[str, dict[str, Any], ClovopsGraphState]]:
    """Run the Clovops pipeline without LangGraph.

    Yields ``(step_name, step_result, merged_state)`` after each completed step.
    Emits ``tick`` events while long-running steps execute so SSE can stream progress.
    Emits ``step_start`` before each agent step so the UI can show running state immediately.
    """
    merged: ClovopsGraphState = dict(state)

    if not start_after_gateway:
        yield "step_start", {"agent_id": "gateway"}, dict(merged)
        gateway_result: dict[str, Any] | None = None
        task = asyncio.create_task(_gateway_node(merged))
        while not task.done():
            yield "tick", {}, dict(merged)
            await asyncio.sleep(_TICK_SECONDS)
        gateway_result = await task
        merged.update(gateway_result)
        yield "gateway", gateway_result, dict(merged)

    pipeline = list(merged.get("pipeline") or [])
    completed = int(merged.get("pipeline_completed") or 0)

    while completed < len(pipeline):
        step: ClovopsPipelineStep = pipeline[completed]
        runner = STEP_RUNNERS.get(step)
        if runner is None:
            error = {"error": f"Unknown pipeline step: {step}", "last_pipeline_step": step}
            merged.update(error)
            yield "pipeline_runner", error, dict(merged)
            break

        yield "step_start", {"agent_id": step, "last_pipeline_step": step}, dict(merged)

        result: dict[str, Any] | None = None
        task = asyncio.create_task(runner(merged))
        while not task.done():
            yield "tick", {}, dict(merged)
            await asyncio.sleep(_TICK_SECONDS)
        result = await task

        merged.update(result)
        merged["pipeline_completed"] = completed + 1
        merged["last_pipeline_step"] = step

        adapted = _adapt_pipeline(merged, step, result, completed=completed)
        if adapted is not None:
            merged["pipeline"] = adapted
            pipeline = adapted

        yield "pipeline_runner", {**result, "last_pipeline_step": step}, dict(merged)
        completed = int(merged["pipeline_completed"] or 0)
