import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

/** Inline link syntax: [label](url) */
export function wrapSelectionWithLink(
  text: string,
  start: number,
  end: number,
  url: string,
): string {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));
  const selected = text.slice(safeStart, safeEnd);
  const label = selected.trim() || url;
  const link = `[${label}](${url.trim()})`;
  return text.slice(0, safeStart) + link + text.slice(safeEnd);
}

/** Inline color syntax: <c:#hex>text</c> */
export function wrapSelectionWithColor(
  text: string,
  start: number,
  end: number,
  color: string,
): string {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));
  const selected = text.slice(safeStart, safeEnd);
  if (!selected) return text;
  const wrapped = `<c:${color}>${selected}</c>`;
  return text.slice(0, safeStart) + wrapped + text.slice(safeEnd);
}

type RichSegment =
  | { kind: "plain"; text: string }
  | { kind: "link"; label: string; url: string }
  | { kind: "color"; color: string; text: string };

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/;
const COLOR_PATTERN = /<c:(#[0-9a-fA-F]{3,8})>([\s\S]*?)<\/c>/;

function nextMatch(text: string, from: number): { index: number; length: number; segment: RichSegment } | null {
  const slice = text.slice(from);
  const linkMatch = slice.match(LINK_PATTERN);
  const colorMatch = slice.match(COLOR_PATTERN);
  if (!linkMatch && !colorMatch) return null;

  const linkIndex = linkMatch ? slice.indexOf(linkMatch[0]) : Number.POSITIVE_INFINITY;
  const colorIndex = colorMatch ? slice.indexOf(colorMatch[0]) : Number.POSITIVE_INFINITY;

  if (linkIndex <= colorIndex && linkMatch) {
    return {
      index: from + linkIndex,
      length: linkMatch[0].length,
      segment: { kind: "link", label: linkMatch[1] ?? "", url: linkMatch[2] ?? "" },
    };
  }
  if (colorMatch) {
    return {
      index: from + colorIndex,
      length: colorMatch[0].length,
      segment: { kind: "color", color: colorMatch[1] ?? "#000000", text: colorMatch[2] ?? "" },
    };
  }
  return null;
}

export function splitRichText(text: string): RichSegment[] {
  const segments: RichSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const match = nextMatch(text, cursor);
    if (!match) {
      segments.push({ kind: "plain", text: text.slice(cursor) });
      break;
    }
    if (match.index > cursor) {
      segments.push({ kind: "plain", text: text.slice(cursor, match.index) });
    }
    segments.push(match.segment);
    cursor = match.index + match.length;
  }

  return segments;
}

export function renderRichText(text: string, keyPrefix: string): ReactNode {
  const segments = splitRichText(text);
  return createElement(
    Fragment,
    null,
    segments.map((segment, index) => {
      const key = `${keyPrefix}-${index}`;
      if (segment.kind === "plain") {
        return createElement(Fragment, { key }, segment.text);
      }
      if (segment.kind === "link") {
        return createElement(
          "a",
          {
            key,
            href: segment.url,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "font-medium text-foreground underline underline-offset-2",
            onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(),
          },
          segment.label,
        );
      }
      return createElement(
        "span",
        { key, style: { color: segment.color } },
        renderRichText(segment.text, `${key}-nested`),
      );
    }),
  );
}
