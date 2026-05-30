export type InsightSection = {
  id: string;
  label: string;
  content: string;
};

const SECTION_DEFS = [
  { id: "summary", label: "Summary", match: /^summary$/i },
  { id: "themes", label: "Key themes", match: /^key themes?$|^themes$/i },
  { id: "details", label: "Important details", match: /^important details?$|^notable details?$/i },
  { id: "questions", label: "Suggested questions", match: /^suggested questions?$|^follow-up questions?$/i },
] as const;

function normalizeHeader(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/[_*`]/g, "")
    .replace(/\s*[—\-:.]+\s*$/, "")
    .trim();
}

function matchSection(line: string): (typeof SECTION_DEFS)[number] | null {
  const normalized = normalizeHeader(line);
  if (!normalized) return null;
  return SECTION_DEFS.find((section) => section.match.test(normalized)) ?? null;
}

function isLikelyHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^#{1,6}\s/.test(trimmed)) return true;
  if (/^\d+\.\s+\*\*/.test(trimmed)) return true;
  if (/^\*\*[^*]+\*\*\s*[—\-:]/.test(trimmed)) return true;
  return matchSection(trimmed) !== null;
}

export function parseInsightSections(content: string): InsightSection[] {
  const text = content.trim();
  if (!text) return [];

  const lines = text.split("\n");
  const sections: InsightSection[] = [];
  let current: InsightSection | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!current) return;
    current.content = buffer.join("\n").trim();
    if (current.content) sections.push(current);
    buffer = [];
  };

  for (const line of lines) {
    if (isLikelyHeader(line)) {
      const def = matchSection(line);
      if (def) {
        flush();
        current = { id: def.id, label: def.label, content: "" };
        continue;
      }
    }
    if (current) buffer.push(line);
  }

  flush();

  if (sections.length > 0) return sections;

  return [{ id: "overview", label: "Overview", content: text }];
}

export function insightPlainExcerpt(content: string, maxLength = 220): string {
  return content
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function groupInsightsBySource<T extends { id: string }>(
  items: T[],
  getSourceKey: (item: T) => string | null,
): { key: string; label: string; items: T[] }[] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = getSourceKey(item) ?? "ungrouped";
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  return Array.from(groups.entries())
    .map(([key, groupItems]) => ({
      key,
      label: key === "ungrouped" ? "Other" : key,
      items: groupItems,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
