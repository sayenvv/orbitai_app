function lcsTable(a: string[], b: string[]): number[][] {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }
  return table;
}

/** Match Python `str.splitlines()` semantics for stable diffs. */
export function splitLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n");
  if (normalized.length === 0) return [];
  const lines = normalized.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

export type DiffLine =
  | { type: "same"; text: string }
  | { type: "add"; text: string; newLine: number }
  | { type: "remove"; text: string; oldLine: number };

export function buildLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const table = lcsTable(oldLines, newLines);
  const diff: DiffLine[] = [];
  let i = oldLines.length;
  let j = newLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.unshift({ type: "same", text: oldLines[i - 1] });
      i -= 1;
      j -= 1;
      continue;
    }
    if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      diff.unshift({ type: "add", text: newLines[j - 1], newLine: j });
      j -= 1;
      continue;
    }
    if (i > 0) {
      diff.unshift({ type: "remove", text: oldLines[i - 1], oldLine: i });
      i -= 1;
    }
  }

  return diff;
}

export function getHighlightedNewLines(diff: DiffLine[]): number[] {
  return diff
    .filter((line): line is Extract<DiffLine, { type: "add" }> => line.type === "add")
    .map((line) => line.newLine);
}

export function getAddedLineNumbers(previousContent: string, newContent: string): number[] {
  return getHighlightedNewLines(buildLineDiff(previousContent, newContent));
}

export function groupLineNumbers(lines: number[]): Array<{ start: number; end: number }> {
  if (lines.length === 0) return [];
  const sorted = [...lines].sort((a, b) => a - b);
  const ranges: Array<{ start: number; end: number }> = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] === end + 1) {
      end = sorted[index];
      continue;
    }
    ranges.push({ start, end });
    start = sorted[index];
    end = sorted[index];
  }

  ranges.push({ start, end });
  return ranges;
}

export function formatLineRange(start: number, end: number): string {
  return start === end ? `L${start}` : `L${start}–L${end}`;
}

export type RemovedBlock = {
  /** 1-based line in the new document where removed lines should appear above. */
  beforeLine: number;
  lines: string[];
};

/** Groups consecutive removed lines for inline ghost rows (VS Code / GitHub style). */
export function computeRemovedBlocks(diff: DiffLine[]): RemovedBlock[] {
  const blocks: RemovedBlock[] = [];
  let pendingRemoves: string[] = [];
  let newLine = 1;

  const flushAt = (beforeLine: number) => {
    if (pendingRemoves.length === 0) return;
    blocks.push({ beforeLine, lines: [...pendingRemoves] });
    pendingRemoves = [];
  };

  for (const entry of diff) {
    if (entry.type === "same") {
      flushAt(newLine);
      newLine += 1;
    } else if (entry.type === "remove") {
      pendingRemoves.push(entry.text);
    } else if (entry.type === "add") {
      if (pendingRemoves.length > 0) {
        blocks.push({ beforeLine: entry.newLine, lines: [...pendingRemoves] });
        pendingRemoves = [];
      }
    }
  }

  flushAt(newLine);
  return blocks;
}

export function countDiffStats(oldText: string, newText: string): { added: number; removed: number } {
  const diff = buildLineDiff(oldText, newText);
  return {
    added: diff.filter((line) => line.type === "add").length,
    removed: diff.filter((line) => line.type === "remove").length,
  };
}

export function formatUnifiedDiff(filePath: string, oldText: string, newText: string): string {
  const diff = buildLineDiff(oldText, newText);
  const lines: string[] = [`--- ${filePath}`, `+++ ${filePath}`];
  for (const entry of diff) {
    if (entry.type === "same") {
      lines.push(` ${entry.text}`);
    } else if (entry.type === "add") {
      lines.push(`+${entry.text}`);
    } else {
      lines.push(`-${entry.text}`);
    }
  }
  return lines.join("\n");
}

export function formatDiffStats(added: number, removed: number): string {
  if (added === 0 && removed === 0) return "No line changes";
  const parts: string[] = [];
  if (added > 0) parts.push(`+${added}`);
  if (removed > 0) parts.push(`-${removed}`);
  return parts.join(" ");
}
