from orbit_ollama.chat import build_messages, resolve_ollama_model, stream_chat
from orbit_ollama.client import OllamaClient, OllamaError
from orbit_ollama.config import OllamaSettings
from orbit_ollama.llm_provider import AgentChatInput, stream_ollama
from orbit_ollama.models import OllamaModel
from orbit_ollama.utils import (
    OllamaStatus,
    agent_chat_input,
    get_client,
    get_settings,
    get_status,
    list_installed_models,
    stream_agent_chat,
)

__all__ = [
    "AgentChatInput",
    "OllamaClient",
    "OllamaError",
    "OllamaModel",
    "OllamaSettings",
    "OllamaStatus",
    "agent_chat_input",
    "build_messages",
    "get_client",
    "get_settings",
    "get_status",
    "list_installed_models",
    "resolve_ollama_model",
    "stream_agent_chat",
    "stream_chat",
    "stream_ollama",
]

__version__ = "0.1.0"
