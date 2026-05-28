"use client";

import { useMemo, useState } from "react";
import { MessagesSquare, Clock, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AdminConversation } from "@/types";
import { formatNumber, formatRelative, initials } from "@/lib/utils";

const PAGE_SIZE = 9;

export function ConversationsGrid({ conversations }: { conversations: AdminConversation[] }) {
  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState("__all__");
  const [sort, setSort] = useState<"recent" | "messages" | "tokens">("recent");
  const [page, setPage] = useState(1);

  const agents = useMemo(
    () => Array.from(new Set(conversations.map((c) => c.agent))),
    [conversations]
  );

  const filtered = useMemo(() => {
    let out = conversations;
    if (query) {
      const q = query.toLowerCase();
      out = out.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.userName.toLowerCase().includes(q) ||
          c.agent.toLowerCase().includes(q)
      );
    }
    if (agent !== "__all__") out = out.filter((c) => c.agent === agent);
    out = [...out].sort((a, b) => {
      if (sort === "recent") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sort === "messages") return b.messages - a.messages;
      return b.tokens - a.tokens;
    });
    return out;
  }, [conversations, query, agent, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  const clearAll = () => {
    setQuery("");
    setAgent("__all__");
    setPage(1);
  };
  const activeCount = (query ? 1 : 0) + (agent !== "__all__" ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
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
            placeholder="Search title, user or agent..."
            className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring/40"
          />
        </div>
        <select
          value={agent}
          onChange={(e) => {
            setAgent(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border bg-background px-2.5 py-1.5 text-xs cursor-pointer"
        >
          <option value="__all__">Agent: All</option>
          {agents.map((a) => (
            <option key={a} value={a}>
              Agent: {a}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-lg border bg-background px-2.5 py-1.5 text-xs cursor-pointer"
        >
          <option value="recent">Sort: Most recent</option>
          <option value="messages">Sort: Most messages</option>
          <option value="tokens">Sort: Most tokens</option>
        </select>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
        <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {filtered.length === conversations.length
            ? `${conversations.length} conversations`
            : `${filtered.length} of ${conversations.length}`}
        </div>
      </div>

      {/* Cards */}
      {pageRows.length === 0 ? (
        <div className="premium-card p-10 text-center text-xs text-muted-foreground">
          No conversations match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pageRows.map((c) => (
            <div
              key={c.id}
              className="premium-card p-5 hover:scale-[1.01] transition-transform"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/60">
                    <MessagesSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{c.title}</p>
                    <p className="text-[10.5px] text-muted-foreground truncate">via {c.agent}</p>
                  </div>
                </div>
                <Badge tone="violet">{formatNumber(c.messages)} msgs</Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/30 to-chart-4/30 flex items-center justify-center text-[9px] font-semibold text-primary ring-1 ring-border/60">
                    {initials(c.userName)}
                  </div>
                  <span className="truncate">{c.userName}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" /> {formatRelative(c.updatedAt)}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-[10.5px] text-muted-foreground">
                <span>{formatNumber(c.tokens)} tokens</span>
                <span className="font-mono">{c.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
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
