const MERMAID_FENCE = /```(?:mermaid)?\s*\n([\s\S]*?)```/gi;
const MERMAID_START =
  /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|quadrantChart|timeline|mindmap|C4Context|C4Container|C4Component)/im;

export function looksLikeMermaid(source: string): boolean {
  const normalized = source.trim();
  if (!normalized) return false;
  if (MERMAID_START.test(normalized)) return true;
  return /^(subgraph|participant|actor)\b/im.test(normalized);
}

/** Strip markdown fences and prose so mermaid.render receives valid diagram syntax. */
export function normalizeMermaidSource(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return "";

  const fencedMatches = [...trimmed.matchAll(MERMAID_FENCE)];
  if (fencedMatches.length > 0) {
    const last = fencedMatches[fencedMatches.length - 1]?.[1];
    if (last?.trim()) return last.trim();
  }

  if (looksLikeMermaid(trimmed)) {
    return trimmed;
  }

  const lines = trimmed.split("\n");
  const startIndex = lines.findIndex((line) => looksLikeMermaid(line.trim()));
  if (startIndex >= 0) {
    return lines.slice(startIndex).join("\n").trim();
  }

  return trimmed;
}

export function extractMermaidFromDocument(text: string): string | null {
  const normalized = normalizeMermaidSource(text);
  if (!normalized || !looksLikeMermaid(normalized)) return null;
  return normalized;
}
