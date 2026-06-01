"use client";

import { Util, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";

export type PdfSearchRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfSearchMatch = {
  id: number;
  page: number;
  snippet: string;
  rects: PdfSearchRect[];
};

type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height?: number;
  hasEOL?: boolean;
};

type TextSegment = {
  start: number;
  end: number;
  item: PdfTextItem;
  localStart: number;
  localEnd: number;
};

type ItemBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function getItemBounds(
  item: PdfTextItem,
  viewport: ReturnType<PDFPageProxy["getViewport"]>,
): ItemBounds {
  const tx = Util.transform(viewport.transform, item.transform);
  const fontHeight = Math.hypot(tx[2], tx[3]);
  const width = item.width * viewport.scale;

  return {
    x: tx[4],
    y: tx[5] - fontHeight,
    width,
    height: fontHeight,
  };
}

function getPartialItemBounds(
  item: PdfTextItem,
  viewport: ReturnType<PDFPageProxy["getViewport"]>,
  charStart: number,
  charEnd: number,
): PdfSearchRect {
  const full = getItemBounds(item, viewport);
  const strLen = Math.max(item.str.length, 1);
  const startRatio = Math.max(0, Math.min(1, charStart / strLen));
  const endRatio = Math.max(startRatio, Math.min(1, charEnd / strLen));

  return {
    x: full.x + full.width * startRatio,
    y: full.y,
    width: Math.max(full.width * (endRatio - startRatio), 2),
    height: full.height,
  };
}

function shouldInsertSpace(previous: ItemBounds | null, item: PdfTextItem, viewport: ReturnType<PDFPageProxy["getViewport"]>): boolean {
  if (!previous) return false;

  const current = getItemBounds(item, viewport);
  const verticalDelta = Math.abs(current.y - previous.y);
  if (verticalDelta > previous.height * 0.5) return false;

  const gap = current.x - (previous.x + previous.width);
  return gap > previous.height * 0.15;
}

function buildPageText(
  items: unknown[],
  viewport: ReturnType<PDFPageProxy["getViewport"]>,
): { text: string; segments: TextSegment[] } {
  let text = "";
  const segments: TextSegment[] = [];
  let previousBounds: ItemBounds | null = null;

  for (const raw of items) {
    if (!raw || typeof raw !== "object" || !("str" in raw)) continue;

    const item = raw as PdfTextItem;
    if (!item.str) continue;

    if (shouldInsertSpace(previousBounds, item, viewport)) {
      text += " ";
    }

    const start = text.length;
    text += item.str;
    segments.push({
      start,
      end: text.length,
      item,
      localStart: 0,
      localEnd: item.str.length,
    });

    previousBounds = getItemBounds(item, viewport);
  }

  return { text, segments };
}

function rectsForRange(
  segments: TextSegment[],
  viewport: ReturnType<PDFPageProxy["getViewport"]>,
  start: number,
  end: number,
): PdfSearchRect[] {
  const rects: PdfSearchRect[] = [];

  for (const segment of segments) {
    if (segment.end <= start || segment.start >= end) continue;

    const overlapStart = Math.max(start, segment.start);
    const overlapEnd = Math.min(end, segment.end);
    const localStart = segment.localStart + (overlapStart - segment.start);
    const localEnd = segment.localStart + (overlapEnd - segment.start);

    rects.push(getPartialItemBounds(segment.item, viewport, localStart, localEnd));
  }

  return mergeAdjacentRects(rects);
}

function mergeAdjacentRects(rects: PdfSearchRect[]): PdfSearchRect[] {
  if (rects.length <= 1) return rects;

  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: PdfSearchRect[] = [sorted[0]];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const last = merged[merged.length - 1];
    const sameLine = Math.abs(current.y - last.y) <= Math.max(last.height, current.height) * 0.25;
    const adjacent = current.x <= last.x + last.width + Math.max(last.height, 4);

    if (sameLine && adjacent) {
      const nextRight = Math.max(last.x + last.width, current.x + current.width);
      last.x = Math.min(last.x, current.x);
      last.width = nextRight - last.x;
      last.y = Math.min(last.y, current.y);
      last.height = Math.max(last.height, current.height);
      continue;
    }

    merged.push(current);
  }

  return merged;
}

export async function searchPdfDocument(
  document: PDFDocumentProxy,
  query: string,
): Promise<PdfSearchMatch[]> {
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalizedQuery) return [];

  const matches: PdfSearchMatch[] = [];
  let matchId = 0;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const { text, segments } = buildPageText(textContent.items, viewport);
    const lowerText = text.toLowerCase();

    let index = 0;
    while (index < lowerText.length) {
      const foundAt = lowerText.indexOf(normalizedQuery, index);
      if (foundAt === -1) break;

      const foundEnd = foundAt + normalizedQuery.length;
      const snippetStart = Math.max(0, foundAt - 24);
      const snippetEnd = Math.min(text.length, foundEnd + 24);
      const snippet = text.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim();

      matches.push({
        id: matchId,
        page: pageNumber,
        snippet,
        rects: rectsForRange(segments, viewport, foundAt, foundEnd),
      });

      matchId += 1;
      index = foundEnd;
    }
  }

  return matches;
}
