# orbit-ollama

Shared Ollama client and high-level helpers for Orbit API.

## Install (local dev)

From `Orbit_API/`:

```bash
pip install -r requirements-local.txt
```

## API helpers

```python
from orbit_ollama import (
    agent_chat_input,
    get_settings,
    get_status,
    list_installed_models,
    stream_agent_chat,
)

status = await get_status()
models = await list_installed_models()

chat = agent_chat_input(
    system_prompt="You are helpful.",
    model="llama3.2",
    temperature=0.7,
    max_tokens=1024,
    history=[("user", "Hi"), ("assistant", "Hello!")],
    user_message="What's 2+2?",
)
async for token in stream_agent_chat(chat):
    print(token, end="")
```

## Environment

| Variable | Default |
|----------|---------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` |
| `OLLAMA_DEFAULT_MODEL` | `llama3.2` |
| `OLLAMA_TIMEOUT` | `120` |
