# orbit-orchestration

Multi-agent orchestration for Orbit API combining:

- **LangChain** — summarization chains and shared LLM factory
- **AutoGen AgentChat** — group chat team with a human proxy for human-in-the-loop (HITL)

## Agents

| Agent | Role |
|-------|------|
| `summarizer` | Condenses text via LangChain |
| `image_generator` | Builds image prompts and returns generation metadata |
| `human` | User proxy — pauses the team until the API supplies input |

## Layout

```
orbit_orchestration/
  config.py           # settings
  domain/             # types + session state
  langchain/          # LLM + summarization
  agents/             # agent factories
  autogen/            # group chat team + human proxy bridge
  orchestrator/       # high-level run / resume API
```

## LLM providers

| Provider | Env | Notes |
|----------|-----|--------|
| **Ollama** (default) | `ORCHESTRATION_LLM_PROVIDER=ollama`, `OLLAMA_BASE_URL`, `OLLAMA_DEFAULT_MODEL` | AutoGen + LangChain use OpenAI-compatible `http://localhost:11434/v1` |
| **OpenAI** | `ORCHESTRATION_LLM_PROVIDER=openai`, `OPENAI_API_KEY` | Cloud models for team + summarizer |

Orbit API maps `LLM_PROVIDER` from `.env` into these settings automatically.

```bash
ollama serve
ollama pull llama3.2
```

Use a model that supports **tool calling** (e.g. `llama3.2`, `qwen2.5`) for reliable AutoGen agent turns.

## Intent routing

Before the group chat runs, `langchain/intent_router.py` analyzes the user prompt and returns:

- `primary_agent` — who leads the workflow
- `selected_agents` — specialists included in the team
- `intent` — e.g. `content_summarization`, `image_generation`, `summarize_then_image`
- `topics` — subjects mentioned in the prompt

These fields are exposed on `POST /api/multi-agent/runs` as `routing` in the JSON response.

## Usage (Python)

```python
from orbit_orchestration.config import OrchestrationSettings
from orbit_orchestration.orchestrator import GroupChatOrchestrator

settings = OrchestrationSettings(
    llm_provider="ollama",
    orchestration_model="llama3.2",
)
orch = GroupChatOrchestrator(settings=settings)
run = await orch.start("Summarize this article, then propose an image for the cover.")
print(run.routing.intent, run.routing.selected_agents)
if run.status == "awaiting_human":
    run = await orch.resume(run.session_id, human_input="approve the image prompt")
```

## References

- [AutoGen Python](https://github.com/microsoft/autogen/tree/main/python)
- [LangChain](https://github.com/langchain-ai/langchain)
