"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Terminal } from "lucide-react";
import type { ApiCodeWorkspaceTerminalEntry } from "@/lib/orbit-api";
import { cn } from "@/lib/utils";

type ClovopsChatTerminalProps = {
  entries: ApiCodeWorkspaceTerminalEntry[];
  className?: string;
  live?: boolean;
};

function exitLabel(exitCode?: number | null): string | null {
  if (exitCode === null || exitCode === undefined) return null;
  if (exitCode === 0) return "exit 0";
  return `exit ${exitCode}`;
}

function TerminalBlock({ entry }: { entry: ApiCodeWorkspaceTerminalEntry }) {
  const exit = exitLabel(entry.exitCode);
  const isRunning = entry.status === "running";

  return (
    <div className="border-t border-border/20 first:border-t-0">
      <div className="flex items-start gap-2 px-2.5 py-2">
        {isRunning ? (
          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        )}
        <div className="min-w-0 flex-1">
          {entry.purpose ? (
            <p className="mb-1 text-[11px] leading-snug text-muted-foreground/85">{entry.purpose}</p>
          ) : null}
          <pre className="overflow-x-auto font-mono text-[10.5px] leading-relaxed text-foreground/80 [scrollbar-width:thin]">
            <span className="text-emerald-600/90 dark:text-emerald-400/90">$ </span>
            {entry.command || "(command)"}
          </pre>
          {entry.output?.trim() ? (
            <pre className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border/30 bg-muted/25 p-2.5 font-mono text-[10.5px] leading-relaxed text-foreground/75 [scrollbar-width:thin]">
              {entry.output.trim()}
            </pre>
          ) : isRunning ? (
            <p className="mt-1 text-[11px] text-muted-foreground/70">Running…</p>
          ) : null}
          {exit ? (
            <p
              className={cn(
                "mt-1.5 font-mono text-[10px]",
                entry.exitCode === 0
                  ? "text-muted-foreground/70"
                  : "text-destructive/85",
              )}
            >
              {exit}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ClovopsChatTerminal({ entries, className, live = false }: ClovopsChatTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);

  const stats = useMemo(() => {
    const running = entries.some((entry) => entry.status === "running");
    const failed = entries.some(
      (entry) => entry.status === "error" || (entry.exitCode != null && entry.exitCode !== 0),
    );
    return { running, failed, count: entries.length };
  }, [entries]);

  useEffect(() => {
    if (live) setOpen(true);
  }, [live]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !live) return;
    container.scrollTop = container.scrollHeight;
  }, [entries, live]);

  if (!entries.length) return null;

  const headerLabel = stats.running
    ? "Running commands…"
    : stats.failed
      ? "Commands finished with errors"
      : `${stats.count} command${stats.count === 1 ? "" : "s"}`;

  return (
    <section className={cn("mt-1 w-full", className)} aria-label="Terminal output">
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-border/35 bg-muted/10",
          live && stats.running && "border-border/50",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-muted/20"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          )}
          {live && stats.running ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Terminal className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          )}
          <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">{headerLabel}</span>
        </button>

        {open ? (
          <div ref={scrollRef} className="max-h-72 overflow-y-auto [scrollbar-width:thin]">
            {entries.map((entry) => (
              <TerminalBlock key={entry.id} entry={entry} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
