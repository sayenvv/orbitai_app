# App orchestration wiring

| Path | Role |
|------|------|
| `multi_agent/factory.py` | Maps app `.env` → `OrchestrationSettings`; singleton `LangGraphOrchestrator` |
| `runner.py` | Legacy single-agent streaming for library insights |

Business logic lives in `packages/orbit_orchestration/`.

**Streaming endpoint:** `POST /api/chat/message/stream` (SSE).

Specialist agents: `web_search_agent`, `research_agent`, `job_search_agent`, `math_agent`.
