import { detectCodeLanguage } from "@/lib/code-language";

const FENCE_ALIAS: Record<string, string> = {
  css: "css",
  stylesheet: "css",
  style: "css",
  styles: "css",
  scss: "scss",
  sass: "scss",
  html: "html",
  xml: "html",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  python: "python",
  py: "python",
  json: "json",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  sql: "sql",
};

const FENCE_PATTERN = /```[\s\S]*?```/g;

const CODE_LINE_START =
  /^(import |from |class |def |async def |if |elif |else:|try:|except |finally:|for |while |with |return |raise |yield |@|"""|''')/;

function normalizeFenceLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  return FENCE_ALIAS[key] ?? key;
}

function looksLikeMarkdownHeading(line: string): boolean {
  // Only filename-style `# file.py` headings break bare-code detection; `# comments` stay in the block.
  return isFilenameHeading(line);
}

function looksLikeCodeLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed === "") return true;

  if (looksLikeMarkdownHeading(line)) return false;
  if (/^[-*+]\s/.test(trimmed)) return false;
  if (/^\d+\.\s/.test(trimmed)) return false;

  if (/^\s{1,}\S/.test(line)) return true;
  if (CODE_LINE_START.test(trimmed)) return true;
  if (/^[a-zA-Z_][\w.]*\s*[=:]/.test(trimmed)) return true;
  if (/^(self\.|print\(|raise |yield |pass\b|break\b|continue\b)/.test(trimmed)) return true;
  if (/^#/.test(trimmed)) {
    return true;
  }

  if (/[();{}\[\]"'`]/.test(trimmed) && /[=]|def |class |import |return |raise |except /.test(trimmed)) {
    return true;
  }

  return false;
}

function isFilenameHeading(line: string): boolean {
  const trimmed = line.trim();
  return /^#{1,6}\s+[\w./-]+\.(py|js|ts|tsx|jsx|java|go|rs|rb|php|cs|cpp|c|h|sql|sh|bash|yaml|yml|json|toml|md)\s*$/i.test(
    trimmed,
  );
}

function findCodeBlockStart(lines: string[], from: number): number {
  let i = from;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return -1;

  if (isFilenameHeading(lines[i])) {
    i++;
    while (i < lines.length && lines[i].trim() === "") i++;
  }

  if (i < lines.length && looksLikeCodeLine(lines[i])) {
    return i;
  }
  return -1;
}

function findCodeBlockEnd(lines: string[], start: number): number {
  let end = start;
  while (end < lines.length) {
    const line = lines[end];
    if (line.trim() === "") {
      let j = end + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j < lines.length && looksLikeCodeLine(lines[j])) {
        end = j;
        continue;
      }
      return end;
    }
    if (!looksLikeCodeLine(line)) {
      return end;
    }
    end++;
  }
  return end;
}

function wrapBareCodeInSegment(segment: string): string {
  if (!segment.trim()) return segment;

  const lines = segment.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const start = findCodeBlockStart(lines, i);
    if (start === -1) {
      result.push(lines[i]);
      i++;
      continue;
    }

    for (let k = i; k < start; k++) {
      result.push(lines[k]);
    }

    const end = findCodeBlockEnd(lines, start);
    const blockLines = lines.slice(start, end);
    const nonEmpty = blockLines.filter((line) => line.trim() !== "").length;

    if (nonEmpty >= 3) {
      const body = collapseExcessiveCodeSpacing(blockLines.join("\n"));
      const lang = detectCodeLanguage(body);
      const tag = lang === "text" ? "" : lang;
      result.push(tag ? `\`\`\`${tag}` : "```");
      result.push(...blockLines);
      result.push("```");
    } else {
      result.push(...blockLines);
    }

    i = end;
  }

  return result.join("\n");
}

function splitByExistingFences(content: string): Array<{ fenced: boolean; text: string }> {
  const parts: Array<{ fenced: boolean; text: string }> = [];
  let lastIndex = 0;

  for (const match of content.matchAll(FENCE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ fenced: false, text: content.slice(lastIndex, index) });
    }
    parts.push({ fenced: true, text: match[0] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ fenced: false, text: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ fenced: false, text: content });
  }

  return parts;
}

/** Wrap bare source listings in fenced blocks so indentation is preserved in `<pre><code>`. */
export function wrapBareCodeFences(content: string): string {
  return splitByExistingFences(content)
    .map((part) => (part.fenced ? part.text : wrapBareCodeInSegment(part.text)))
    .join("");
}

function normalizeExistingFences(content: string): string {
  return content.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (_full, info: string, body: string) => {
    const trimmed = info.trim();
    const lang = trimmed ? normalizeFenceLabel(trimmed) : detectCodeLanguage(body);
    const safeLang = lang === "text" ? "" : lang;
    const normalizedBody =
      safeLang === "python" ? repairFlatPythonLayout(collapseExcessiveCodeSpacing(body)) : collapseExcessiveCodeSpacing(body);
    return safeLang
      ? `\`\`\`${safeLang}\n${normalizedBody}\`\`\``
      : `\`\`\`\n${normalizedBody}\`\`\``;
  });
}

/**
 * Normalize assistant markdown for chat rendering:
 * 1) wrap bare code in fences (fixes lost indentation when models omit ```)
 * 2) ensure fenced blocks have a language tag for highlighting
 */
export function normalizeAssistantMarkdown(content: string): string {
  const wrapped = wrapBareCodeFences(content);
  if (!wrapped.includes("```")) {
    return wrapped;
  }
  return normalizeExistingFences(wrapped);
}

/** Collapse double-spaced model output (`\n\n` between every line) inside code listings. */
export function collapseExcessiveCodeSpacing(source: string): string {
  return source
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(\S)\n\n+(?=\S)/g, "$1\n");
}

function isModuleLevelDef(line: string): boolean {
  return /^def client_|^def client_from/.test(line);
}

function isModuleLevelAnchor(line: string): boolean {
  return (
    /^if __name__/.test(line) ||
    /^# Factory|^# Example usage|^# Option [AB]:/i.test(line)
  );
}

/**
 * Re-indent Python when the model omits leading spaces (flat `def` under `class`, etc.).
 * Skips source that already has meaningful indentation.
 */
export function repairFlatPythonLayout(source: string): string {
  const normalized = collapseExcessiveCodeSpacing(source);
  if (/^ {2,}\S/m.test(normalized)) return normalized;

  const lines = normalized.split("\n");
  const out: string[] = [];
  let stack = [0];
  let seenClass = false;

  for (const line of lines) {
    const t = line.trim();
    if (t === "") {
      out.push("");
      continue;
    }

    if (/^(elif |else:|except |finally:)/.test(t) && stack.length > 1) {
      stack = stack.slice(0, -1);
    }

    if (/^class /.test(t)) {
      seenClass = true;
      stack = [0];
    } else if (/^def |^async def /.test(t)) {
      if (isModuleLevelDef(t)) {
        stack = [0];
      } else if (seenClass) {
        if (stack.length > 2) {
          stack = [0, 1];
        } else if (stack.length === 1) {
          stack = [0, 1];
        }
      } else {
        stack = [0];
      }
    } else if (isModuleLevelAnchor(t)) {
      stack = [0];
    }

    const indent = stack[stack.length - 1] ?? 0;
    out.push(" ".repeat(indent * 4) + t);

    if (t.endsWith(":") && !/^#/.test(t)) {
      stack = [...stack, indent + 1];
    }
  }

  return out.join("\n");
}
