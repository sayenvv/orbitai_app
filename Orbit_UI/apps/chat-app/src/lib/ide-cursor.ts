export type IdeCursorPosition = {
  line: number;
  column: number;
};

export function cursorPositionAtOffset(text: string, offset: number): IdeCursorPosition {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, safeOffset);
  const lines = before.split("\n");
  const line = lines.length;
  const column = (lines.at(-1)?.length ?? 0) + 1;
  return { line, column };
}

export function selectionLength(start: number, end: number): number {
  return Math.max(0, end - start);
}
