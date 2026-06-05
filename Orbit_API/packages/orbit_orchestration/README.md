# orbit-orchestration

LangGraph + LangChain multi-agent orchestration for Orbit API.

## Specialist agents

| Agent | Tools |
|-------|-------|
| `web_search_agent` | `web_search` (web + image results), `fetch_webpage` (text + page images) |
| `research_agent` | `search_knowledge_base`, `summarize_text` |
| `job_search_agent` | `search_job_listings`, `search_indeed_jobs`, `search_linkedin_jobs` |
| `math_agent` | `calculator`, `convert_units` |

General chat bypasses the graph and streams directly from the LLM.

## Layout

```
orbit_orchestration/
├── agents/       # LangGraph ReAct agent registry
├── tools/        # Tool implementations
├── graph/        # (reserved)
├── langchain/    # LLM factory, intent router, direct chat
├── domain/       # routing, sessions, SSE helpers
└── orchestrator/ # LangGraphOrchestrator
```

## Streaming

`LangGraphOrchestrator.stream_chat_turn()` emits SSE events: `start`, `meta`, `token`, `done`.

Consumed by `POST /api/chat/message/stream`.
