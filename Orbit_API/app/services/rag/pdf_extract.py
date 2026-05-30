from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from pypdf import PdfReader


@dataclass
class PageText:
    page_number: int
    text: str


@dataclass
class PdfExtractResult:
    pages: list[PageText]
    total_pages: int
    pages_processed: int


def count_pdf_pages(data: bytes) -> int:
    reader = PdfReader(BytesIO(data))
    return len(reader.pages)


def count_pdf_pages_from_path(path: str) -> int:
    reader = PdfReader(path)
    return len(reader.pages)


def extract_pdf_pages(path: str, max_pages: int | None) -> PdfExtractResult:
    reader = PdfReader(path)
    total_pages = len(reader.pages)
    limit = total_pages if max_pages is None else min(total_pages, max_pages)

    pages: list[PageText] = []
    for index in range(limit):
        page = reader.pages[index]
        text = (page.extract_text() or "").strip()
        if text:
            pages.append(PageText(page_number=index + 1, text=text))

    return PdfExtractResult(pages=pages, total_pages=total_pages, pages_processed=limit)
