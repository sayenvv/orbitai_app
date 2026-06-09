import { nodePath } from "@/lib/code-workspace-model";
import type { CodeWorkspaceFileContents, CodeWorkspaceNode } from "@/lib/code-workspace-types";

export type ProjectSearchMatchKind = "content" | "filename";

export type ProjectSearchMatch = {
  fileId: string;
  filePath: string;
  line: number;
  column: number;
  lineText: string;
  matchStart: number;
  matchEnd: number;
  kind: ProjectSearchMatchKind;
};

export type ProjectSearchOptions = {
  caseSensitive?: boolean;
  maxResults?: number;
};

const DEFAULT_MAX_RESULTS = 200;

function parseExtensionFilter(query: string): string | null {
  const trimmed = query.trim();
  if (/^\*?\.[a-z0-9]+$/i.test(trimmed)) {
    return trimmed.replace(/^\*?\./, "").toLowerCase();
  }
  return null;
}

function fileExtension(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return "";
  return name.slice(dotIndex + 1).toLowerCase();
}

function findMatchPositions(
  text: string,
  query: string,
  caseSensitive: boolean,
): Array<{ start: number; end: number }> {
  if (!query) return [];

  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const matches: Array<{ start: number; end: number }> = [];
  let from = 0;

  while (from < haystack.length) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) break;
    matches.push({ start: index, end: index + needle.length });
    from = index + Math.max(needle.length, 1);
  }

  return matches;
}

function pushMatch(
  results: ProjectSearchMatch[],
  match: ProjectSearchMatch,
  maxResults: number,
): boolean {
  results.push(match);
  return results.length >= maxResults;
}

function addFilenameMatches(
  results: ProjectSearchMatch[],
  node: CodeWorkspaceNode,
  filePath: string,
  query: string,
  caseSensitive: boolean,
  maxResults: number,
): boolean {
  for (const position of findMatchPositions(node.name, query, caseSensitive)) {
    if (
      pushMatch(
        results,
        {
          fileId: node.id,
          filePath,
          line: 1,
          column: position.start + 1,
          lineText: node.name,
          matchStart: position.start,
          matchEnd: position.end,
          kind: "filename",
        },
        maxResults,
      )
    ) {
      return true;
    }
  }

  if (filePath !== node.name) {
    for (const position of findMatchPositions(filePath, query, caseSensitive)) {
      if (
        pushMatch(
          results,
          {
            fileId: node.id,
            filePath,
            line: 1,
            column: position.start + 1,
            lineText: filePath,
            matchStart: position.start,
            matchEnd: position.end,
            kind: "filename",
          },
          maxResults,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export function searchProjectFiles(
  nodes: CodeWorkspaceNode[],
  fileContents: CodeWorkspaceFileContents,
  query: string,
  options: ProjectSearchOptions = {},
): ProjectSearchMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const caseSensitive = options.caseSensitive ?? false;
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
  const extensionFilter = parseExtensionFilter(trimmed);
  const isExtensionOnlyQuery = extensionFilter !== null;
  const results: ProjectSearchMatch[] = [];
  const seenFilenameMatches = new Set<string>();

  const fileNodes = nodes.filter((node) => node.kind === "file");
  const scopedFiles = extensionFilter
    ? fileNodes.filter((node) => fileExtension(node.name) === extensionFilter)
    : fileNodes;

  for (const node of scopedFiles) {
    const filePath = nodePath(node.id, nodes);

    if (isExtensionOnlyQuery) {
      const ext = `.${extensionFilter}`;
      const matchStart = Math.max(filePath.lastIndexOf(ext), node.name.lastIndexOf(ext));
      const matchEnd = matchStart >= 0 ? matchStart + ext.length : filePath.length;
      const dedupeKey = `${node.id}:ext`;
      if (!seenFilenameMatches.has(dedupeKey)) {
        seenFilenameMatches.add(dedupeKey);
        if (
          pushMatch(
            results,
            {
              fileId: node.id,
              filePath,
              line: 1,
              column: matchStart >= 0 ? matchStart + 1 : 1,
              lineText: filePath,
              matchStart: Math.max(0, matchStart),
              matchEnd,
              kind: "filename",
            },
            maxResults,
          )
        ) {
          return results;
        }
      }
      continue;
    }

    if (addFilenameMatches(results, node, filePath, trimmed, caseSensitive, maxResults)) {
      return results;
    }
  }

  for (const node of scopedFiles) {
    const content = fileContents[node.id] ?? "";
    const lines = content.split("\n");
    const filePath = nodePath(node.id, nodes);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const lineText = lines[lineIndex];
      const positions = findMatchPositions(lineText, trimmed, caseSensitive);

      for (const position of positions) {
        if (
          pushMatch(
            results,
            {
              fileId: node.id,
              filePath,
              line: lineIndex + 1,
              column: position.start + 1,
              lineText,
              matchStart: position.start,
              matchEnd: position.end,
              kind: "content",
            },
            maxResults,
          )
        ) {
          return results;
        }
      }
    }
  }

  return results;
}

export function previewSearchLine(
  lineText: string,
  matchStart: number,
  matchEnd: number,
  radius = 42,
): { before: string; match: string; after: string } {
  const start = Math.max(0, matchStart - radius);
  const end = Math.min(lineText.length, matchEnd + radius);

  return {
    before: `${start > 0 ? "…" : ""}${lineText.slice(start, matchStart)}`,
    match: lineText.slice(matchStart, matchEnd),
    after: `${lineText.slice(matchEnd, end)}${end < lineText.length ? "…" : ""}`,
  };
}
