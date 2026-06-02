# App orchestration layer

| Path | Role |
|------|------|
| `runner.py` | Single-agent chat streaming (LangChain / Ollama / Azure) |
| `multi_agent/` | Factory wiring Orbit settings → `orbit_orchestration` package |

Business logic for multi-agent group chat lives in **`packages/orbit_orchestration/`**.

HTTP routes: `app/api/v1/public/multi_agent.py`
