from autogen_core.tools import FunctionTool

from orbit_orchestration.config import OrchestrationSettings
from orbit_orchestration.langchain.summarizer import summarize_text


def build_summarization_tool(settings: OrchestrationSettings | None = None) -> FunctionTool:
    async def _summarize_tool(text: str) -> str:
        return await summarize_text(text, settings=settings)

    return FunctionTool(
        _summarize_tool,
        description="Summarize long text into concise bullet points and a takeaway.",
        name="summarize_text",
    )
