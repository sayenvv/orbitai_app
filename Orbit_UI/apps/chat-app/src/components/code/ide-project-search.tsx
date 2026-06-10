"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaseSensitive, FileCode2, Loader2, Search } from "lucide-react";
import {
  previewSearchLine,
  searchProjectFiles,
  type ProjectSearchMatch,
} from "@/lib/code-workspace-search";
import type { CodeWorkspaceFileContents, CodeWorkspaceNode } from "@/lib/code-workspace-types";
import { codeWorkspaceApi } from "@/lib/orbit-api";
import { cn } from "@/lib/utils";

export type PrepareProjectSearch = () => Promise<CodeWorkspaceFileContents>;

type IdeProjectSearchProps = {
  nodes: CodeWorkspaceNode[];
  projectId?: string | null;
  onPrepareSearch: PrepareProjectSearch;
  onOpenResult: (fileId: string, line: number) => void;
};

function groupMatchesByFile(matches: ProjectSearchMatch[]) {
  const groups = new Map<string, ProjectSearchMatch[]>();

  for (const match of matches) {
    const existing = groups.get(match.fileId);
    if (existing) {
      existing.push(match);
    } else {
      groups.set(match.fileId, [match]);
    }
  }

  return Array.from(groups.entries()).map(([fileId, items]) => ({
    fileId,
    filePath: items[0]?.filePath ?? "",
    matches: items,
  }));
}

export function IdeProjectSearch({
  nodes,
  projectId,
  onPrepareSearch,
  onOpenResult,
}: IdeProjectSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProjectSearchMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = useCallback(
    async (nextQuery: string, nextCaseSensitive: boolean) => {
      const trimmed = nextQuery.trim();
      if (!trimmed) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setSearching(true);
      setHasSearched(true);

      try {
        if (projectId) {
          const response = await codeWorkspaceApi.searchProject(projectId, {
            query: trimmed,
            caseSensitive: nextCaseSensitive,
            maxResults: 200,
            mode: "all",
          });
          setResults(response.results);
          return;
        }

        const contents = await onPrepareSearch();
        const matches = searchProjectFiles(nodes, contents, trimmed, {
          caseSensitive: nextCaseSensitive,
        });
        setResults(matches);
      } finally {
        setSearching(false);
      }
    },
    [nodes, onPrepareSearch, projectId],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(query, caseSensitive);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [caseSensitive, query, runSearch]);

  const groupedResults = useMemo(() => groupMatchesByFile(results), [results]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-border/50 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void runSearch(query, caseSensitive);
              }
            }}
            placeholder="Search in project..."
            className="glass-input w-full rounded-lg py-2 pr-3 pl-8 text-[13px] outline-none"
            spellCheck={false}
          />
        </div>

        <div className="flex items-center justify-between gap-2 px-0.5">
          <button
            type="button"
            onClick={() => setCaseSensitive((current) => !current)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-colors",
              caseSensitive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground",
            )}
            aria-pressed={caseSensitive}
            title="Match case"
          >
            <CaseSensitive className="h-3.5 w-3.5" />
            Match case
          </button>

          {searching ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Searching…
            </span>
          ) : hasSearched && query.trim() ? (
            <span className="text-[11px] text-muted-foreground">
              {results.length} {results.length === 1 ? "result" : "results"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
        {!query.trim() && (
          <p className="px-1 py-2 text-[12px] leading-relaxed text-muted-foreground">
            Search file names, paths, and contents. Use <span className="font-mono">.py</span>,{" "}
            <span className="font-mono">*.ts</span>, or <span className="font-mono">client.ts</span>{" "}
            to find files by extension or name.
          </p>
        )}

        {hasSearched && !searching && query.trim() && results.length === 0 && (
          <p className="px-1 py-2 text-[12px] text-muted-foreground">
            No results for <span className="font-mono text-foreground/80">{query.trim()}</span>.
          </p>
        )}

        {groupedResults.map((group) => (
          <div key={group.fileId} className="mb-3">
            <div className="sticky top-0 z-[1] flex items-center gap-1.5 bg-[var(--ide-surface)]/95 px-1.5 py-1 text-[11px] font-medium text-foreground/80 backdrop-blur-sm">
              <FileCode2 className="h-3 w-3 shrink-0 text-primary/70" />
              <span className="truncate font-mono">{group.filePath}</span>
              <span className="shrink-0 text-muted-foreground">({group.matches.length})</span>
            </div>

            <div className="space-y-0.5">
              {group.matches.map((match) => {
                const preview = previewSearchLine(match.lineText, match.matchStart, match.matchEnd);
                return (
                  <button
                    key={`${match.fileId}:${match.line}:${match.column}:${match.matchStart}`}
                    type="button"
                    onClick={() => onOpenResult(match.fileId, match.line)}
                    className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)]"
                  >
                    <span className="text-[10px] text-muted-foreground">
                      {match.kind === "filename" ? "file" : `${match.line}:${match.column}`}
                    </span>
                    <span className="truncate font-mono text-[12px] text-foreground/85">
                      {preview.before}
                      <mark className="rounded-sm bg-primary/20 px-0.5 text-primary">{preview.match}</mark>
                      {preview.after}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
