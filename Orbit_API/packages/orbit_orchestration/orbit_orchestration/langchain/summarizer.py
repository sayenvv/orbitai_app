from langchain_core.prompts import ChatPromptTemplate

from orbit_orchestration.config import OrchestrationSettings
from orbit_orchestration.langchain.llm_factory import create_chat_model

_SUMMARY_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a summarization specialist. Produce clear, structured summaries "
            "with key points and a one-line takeaway. Keep the original meaning.",
        ),
        ("human", "Summarize the following content:\n\n{text}"),
    ]
)


async def summarize_text(
    text: str,
    *,
    settings: OrchestrationSettings | None = None,
    max_input_chars: int = 24_000,
) -> str:
    trimmed = text.strip()
    if not trimmed:
        return "No content provided to summarize."
    if len(trimmed) > max_input_chars:
        trimmed = trimmed[:max_input_chars] + "\n\n[truncated for summarization]"

    chain = _SUMMARY_PROMPT | create_chat_model(settings)
    response = await chain.ainvoke({"text": trimmed})
    content = response.content
    return content if isinstance(content, str) else str(content)
