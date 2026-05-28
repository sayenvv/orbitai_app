"use client";

import { useMemo, useState } from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ActivityEvent } from "@/types";
import { formatRelative } from "@/lib/utils";

const PAGE_SIZE = 15;

const TONE = {
  signup: "info",
  login: "neutral",
  payment: "success",
  subscription: "violet",
  support: "warning",
  security: "danger",
} as const;

const TYPES: ActivityEvent["type"][] = [
  "signup",
  "login",
  "payment",
  "subscription",
  "support",
  "security",
];

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("__all__");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let out = events;
    if (query) {
      const q = query.toLowerCase();
      out = out.filter(
        (e) => e.actor.toLowerCase().includes(q) || e.message.toLowerCase().includes(q)
      );
    }
    if (type !== "__all__") out = out.filter((e) => e.type === type);
    out = [...out].sort((a, b) => {
      const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      return sort === "newest" ? diff : -diff;
    });
    return out;
  }, [events, query, type, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  const activeCount = (query ? 1 : 0) + (type !== "__all__" ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="premium-card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search activity..."
            className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring/40"
          />
        </div>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border bg-background px-2.5 py-1.5 text-xs cursor-pointer"
        >
          <option value="__all__">Type: All</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              Type: {t}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-lg border bg-background px-2.5 py-1.5 text-xs cursor-pointer"
        >
          <option value="newest">Sort: Newest first</option>
          <option value="oldest">Sort: Oldest first</option>
        </select>
        {activeCount > 0 && (
          <button
            onClick={() => {
              setQuery("");
              setType("__all__");
              setPage(1);
            }}
            className="inline-flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
        <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {filtered.length === events.length
            ? `${events.length} events`
            : `${filtered.length} of ${events.length}`}
        </div>
      </div>

      <div className="premium-card p-6">
        {pageRows.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">
            No events match your filters.
          </p>
        ) : (
          <ol className="relative border-l border-border/70 ml-3 space-y-6">
            {pageRows.map((e) => (
              <li key={e.id} className="pl-6">
                <span className="absolute -left-[7px] mt-1 h-3.5 w-3.5 rounded-full bg-background border-2 border-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_15%,transparent)]" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{e.actor}</span>
                  <Badge tone={TONE[e.type]}>{e.type}</Badge>
                  <span className="text-[10.5px] text-muted-foreground">
                    {formatRelative(e.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{e.message}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span className="tabular-nums">
            {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md border bg-background hover:bg-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="tabular-nums">
              Page <span className="font-semibold text-foreground">{safePage}</span> / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md border bg-background hover:bg-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
