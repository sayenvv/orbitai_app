from __future__ import annotations

from dataclasses import dataclass

from app.core.config import settings


@dataclass
class TextChunk:
    content: str
    page_start: int | None
    page_end: int | None


def chunk_pages(
    pages: list[tuple[int, str]],
    *,
    chunk_size: int | None = None,
    overlap: int | None = None,
) -> list[TextChunk]:
    size = chunk_size or settings.rag_chunk_size
    step = max(1, size - (overlap or settings.rag_chunk_overlap))

    chunks: list[TextChunk] = []
    for page_number, page_text in pages:
        text = page_text.strip()
        if not text:
            continue

        start = 0
        while start < len(text):
            piece = text[start : start + size].strip()
            if piece:
                chunks.append(
                    TextChunk(content=piece, page_start=page_number, page_end=page_number)
                )
            start += step

    if not chunks and pages:
        joined = "\n\n".join(text for _, text in pages if text.strip())
        if joined.strip():
            page_numbers = [num for num, text in pages if text.strip()]
            chunks.append(
                TextChunk(
                    content=joined.strip(),
                    page_start=min(page_numbers) if page_numbers else None,
                    page_end=max(page_numbers) if page_numbers else None,
                )
            )

    return chunks
