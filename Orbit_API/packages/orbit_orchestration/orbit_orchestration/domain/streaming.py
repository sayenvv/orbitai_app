from __future__ import annotations

from typing import AsyncIterator


async def stream_text_chunks(text: str, *, chunk_words: int = 3) -> AsyncIterator[str]:
    """Yield word chunks for SSE playback (after the full reply is known)."""
    words = text.split()
    if not words:
        yield ""
        return
    for i in range(0, len(words), chunk_words):
        chunk = " ".join(words[i : i + chunk_words])
        suffix = " " if i + chunk_words < len(words) else ""
        yield chunk + suffix
