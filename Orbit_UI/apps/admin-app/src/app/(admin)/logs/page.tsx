"use client";

import { useMemo, useState } from "react";
import {
  ScrollText,
  Search,
  Download,
  Pause,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Bug,
  Lock,
  Globe,
  CreditCard,
  Cpu,
  Rocket,
  ShieldCheck,
  Webhook,
  Bot,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { RequirePermission } from "@/components/auth-guard";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { Badge } from "@/components/ui/badge";
import { generateLogs, formatClock, formatDateTime, type LogEntry, type LogLevel, type LogSource } from "@/lib/ops-data";

type Tone = "info" | "success" | "warning" | "danger" | "violet" | "neutral";

const LEVEL_META: Record<LogLevel, { tone: Tone; icon: typeof Info; label: string }> = {
  debug: { tone: "neutral", icon: Bug, label: "DEBUG" },
  info: { tone: "info", icon: Info, label: "INFO" },
  warn: { tone: "warning", icon: AlertTriangle, label: "WARN" },
  error: { tone: "danger", icon: XCircle, label: "ERROR" },
  critical: { tone: "danger", icon: XCircle, label: "CRIT" },
};

const SOURCE_META: Record<LogSource, { label: string; icon: typeof Info; tone: Tone }> = {
  auth: { label: "Auth", icon: Lock, tone: "danger" },
  api: { label: "API", icon: Globe, tone: "info" },
  billing: { label: "Billing", icon: CreditCard, tone: "violet" },
  worker: { label: "Workers", icon: Cpu, tone: "warning" },
  deploy: { label: "Deploy", icon: Rocket, tone: "success" },
  access: { label: "Access", icon: ShieldCheck, tone: "violet" },
  webhook: { label: "Webhooks", icon: Webhook, tone: "info" },
  agent: { label: "Agents", icon: Bot, tone: "warning" },
};

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error", "critical"];

export default function LogsPage() {
  return (
    <RequirePermission permission="logs.view">
      <LogsInner />
    </RequirePermission>
  );
}

function LogsInner() {
  const [logs] = useState<LogEntry[]>(() => generateLogs(120));
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<LogSource | "all">("all");
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [live, setLive] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (source !== "all" && l.source !== source) return false;
      if (level !== "all" && l.level !== level) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.message.toLowerCase().includes(q) ||
          (l.actor ?? "").toLowerCase().includes(q) ||
          (l.requestId ?? "").toLowerCase().includes(q) ||
          (l.ip ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, source, level, search]);

  const { visible: visibleLogs, sentinelRef: logsSentinelRef, hasMore: hasMoreLogs } = useInfiniteScroll(filtered, { step: 30 });

  const stats = useMemo(() => {
    const errors = filtered.filter((l) => l.level === "error" || l.level === "critical").length;
    const warnings = filtered.filter((l) => l.level === "warn").length;
    const ok = filtered.filter((l) => l.level === "info" || l.level === "debug").length;
    const avgLatency = (() => {
      const withDuration = filtered.filter((l) => typeof l.durationMs === "number");
      if (withDuration.length === 0) return 0;
      return Math.round(withDuration.reduce((s, l) => s + (l.durationMs ?? 0), 0) / withDuration.length);
    })();
    return { errors, warnings, ok, avgLatency };
  }, [filtered]);

  const handleExport = () => {
    const headers = ["id", "timestamp", "level", "source", "actor", "ip", "request_id", "status", "duration_ms", "message"];
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const csv = [
      headers.join(","),
      ...filtered.map((l) => [l.id, l.at, l.level, l.source, l.actor ?? "", l.ip ?? "", l.requestId ?? "", l.statusCode ?? "", l.durationMs ?? "", l.message].map(esc).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="System logs"
        description="Unified, real-time log stream across auth, API, billing, workers, deploys and webhooks."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLive((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                live ? "border-success/40 bg-success/10 text-[color:var(--success)]" : "bg-background hover:bg-accent"
              }`}
            >
              {live ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {live ? "Live" : "Paused"}
            </button>
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        }
      />
      <PageBody className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile icon={ScrollText} label="In view" value={filtered.length} tone="info" />
          <Tile icon={XCircle} label="Errors" value={stats.errors} tone="danger" />
          <Tile icon={AlertTriangle} label="Warnings" value={stats.warnings} tone="warning" />
          <Tile icon={CheckCircle2} label="Avg latency" value={stats.avgLatency ? `${stats.avgLatency}ms` : "—"} tone="success" />
        </div>

        {/* Filter bar */}
        <div className="premium-card p-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search message, actor, IP, request ID…"
              className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <select value={source} onChange={(e) => setSource(e.target.value as LogSource | "all")} className="rounded-lg border bg-background px-2.5 py-1.5 text-xs">
            <option value="all">All sources</option>
            {Object.entries(SOURCE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value as LogLevel | "all")} className="rounded-lg border bg-background px-2.5 py-1.5 text-xs">
            <option value="all">All levels</option>
            {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_META[l].label}</option>)}
          </select>
          {/* Level chips */}
          <div className="ml-auto flex items-center gap-1">
            {LEVELS.map((l) => {
              const active = level === l;
              return (
                <button
                  key={l}
                  onClick={() => setLevel(active ? "all" : l)}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${active ? "ring-1 ring-current" : "opacity-70 hover:opacity-100"}`}
                >
                  <Badge tone={LEVEL_META[l].tone}>{LEVEL_META[l].label}</Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Log table */}
        {filtered.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <ScrollText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium">No logs match your filters</p>
          </div>
        ) : (
          <div className="premium-card overflow-hidden">
            <div className="bg-muted/30 px-4 py-2 grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <div className="col-span-2">Time</div>
              <div className="col-span-1">Level</div>
              <div className="col-span-1">Source</div>
              <div className="col-span-6">Message</div>
              <div className="col-span-2 text-right">Meta</div>
            </div>
            <ul className="divide-y divide-border/60 max-h-[640px] overflow-y-auto font-mono text-[12px]">
              {visibleLogs.map((l) => (
                <LogRow key={l.id} entry={l} expanded={!!expanded[l.id]} onToggle={() => setExpanded((s) => ({ ...s, [l.id]: !s[l.id] }))} />
              ))}
              {hasMoreLogs ? (
                <li ref={logsSentinelRef} className="flex items-center justify-center gap-2 py-3 text-[11px] text-muted-foreground font-sans">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
                </li>
              ) : (
                filtered.length > 0 && (
                  <li className="py-3 text-center text-[11px] text-muted-foreground font-sans">
                    All {filtered.length} entries shown
                  </li>
                )
              )}
            </ul>
          </div>
        )}
      </PageBody>
    </>
  );
}

function Tile({ icon: Icon, label, value, tone }: { icon: typeof ScrollText; label: string; value: number | string; tone: Tone }) {
  const t: Record<Tone, string> = {
    info: "from-info/15 to-info/5 text-info",
    success: "from-success/15 to-success/5 text-[color:var(--success)]",
    warning: "from-warning/15 to-warning/5 text-[color:var(--warning)]",
    danger: "from-destructive/15 to-destructive/5 text-destructive",
    violet: "from-chart-4/15 to-chart-4/5 text-chart-4",
    neutral: "from-muted/40 to-muted/10 text-muted-foreground",
  };
  return (
    <div className="premium-card p-3 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${t[tone]} flex items-center justify-center ring-1 ring-border/40`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
}

function LogRow({ entry, expanded, onToggle }: { entry: LogEntry; expanded: boolean; onToggle: () => void }) {
  const lvl = LEVEL_META[entry.level];
  const src = SOURCE_META[entry.source];
  const SrcIcon = src.icon;
  const LvlIcon = lvl.icon;
  const isErr = entry.level === "error" || entry.level === "critical";

  return (
    <li className={`px-4 py-2 hover:bg-accent/30 transition-colors ${isErr ? "bg-destructive/5" : ""}`}>
      <button onClick={onToggle} className="w-full grid grid-cols-12 gap-2 items-center text-left">
        <div className="col-span-2 text-muted-foreground tabular-nums text-[11px]" title={formatDateTime(entry.at)}>
          {expanded ? <ChevronDown className="inline h-3 w-3 mr-1" /> : <ChevronRight className="inline h-3 w-3 mr-1" />}
          {formatClock(entry.at)}
        </div>
        <div className="col-span-1">
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
            lvl.tone === "danger" ? "bg-destructive/15 text-destructive" :
            lvl.tone === "warning" ? "bg-warning/15 text-[color:var(--warning)]" :
            lvl.tone === "info" ? "bg-info/15 text-info" :
            lvl.tone === "success" ? "bg-success/15 text-[color:var(--success)]" :
            "bg-muted/50 text-muted-foreground"
          }`}>
            <LvlIcon className="h-2.5 w-2.5" />
            {lvl.label}
          </span>
        </div>
        <div className="col-span-1 text-[11px]">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <SrcIcon className="h-3 w-3" />
            {src.label}
          </span>
        </div>
        <div className="col-span-6 truncate">
          <span className={isErr ? "text-destructive" : ""}>{entry.message}</span>
        </div>
        <div className="col-span-2 text-right text-[10.5px] text-muted-foreground tabular-nums">
          {entry.statusCode && <span className="mr-2">{entry.statusCode}</span>}
          {typeof entry.durationMs === "number" && <span>{entry.durationMs}ms</span>}
        </div>
      </button>
      {expanded && (
        <div className="ml-8 mt-2 rounded-lg border bg-muted/30 p-2.5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
          <Detail label="Event ID" value={entry.id} />
          <Detail label="Timestamp" value={formatDateTime(entry.at)} />
          <Detail label="Request ID" value={entry.requestId ?? "—"} />
          <Detail label="Actor" value={entry.actor ?? "—"} />
          <Detail label="Source IP" value={entry.ip ?? "—"} />
          <Detail label="Status" value={entry.statusCode ? String(entry.statusCode) : "—"} />
          {typeof entry.durationMs === "number" && <Detail label="Duration" value={`${entry.durationMs}ms`} />}
          <div className="md:col-span-2">
            <Detail label="Message" value={entry.message} />
          </div>
        </div>
      )}
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground w-20 shrink-0 mt-0.5">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
