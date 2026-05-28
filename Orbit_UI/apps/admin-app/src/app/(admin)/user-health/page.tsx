"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  HeartPulse,
  AlertTriangle,
  Activity,
  Clock,
  Zap,
  Search,
  Send,
  MessageSquare,
  TrendingUp,
  ExternalLink,
  MapPin,
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
  Lock,
  Ban,
  Bot,
  RefreshCcw,
  Loader2,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { RequirePermission, useCanPerform } from "@/components/auth-guard";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { Badge } from "@/components/ui/badge";
import {
  SEED_USER_HEALTH,
  ISSUE_LABELS,
  type UserHealth,
  type UserHealthStatus,
  type IssueKind,
  type UserIssue,
} from "@/lib/ops-data";
import { formatRelative, initials } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger" | "violet" | "neutral";

const STATUS_META: Record<UserHealthStatus, { label: string; tone: Tone; dot: string }> = {
  healthy: { label: "Healthy", tone: "success", dot: "bg-[color:var(--success)]" },
  degraded: { label: "Degraded", tone: "warning", dot: "bg-[color:var(--warning)]" },
  blocked: { label: "Blocked", tone: "danger", dot: "bg-destructive" },
};

const ISSUE_ICON: Record<IssueKind, typeof Clock> = {
  slow_response: Clock,
  error_rate: XCircle,
  auth_failure: Lock,
  rate_limited: Ban,
  agent_failure: Bot,
  complaint: MessageSquare,
};

const ISSUE_TONE: Record<IssueKind, Tone> = {
  slow_response: "warning",
  error_rate: "danger",
  auth_failure: "danger",
  rate_limited: "warning",
  agent_failure: "danger",
  complaint: "violet",
};

const SEVERITY_TONE: Record<UserIssue["severity"], Tone> = {
  low: "info",
  medium: "warning",
  high: "danger",
};

export default function UserHealthPage() {
  return (
    <RequirePermission permission="health.view">
      <UserHealthInner />
    </RequirePermission>
  );
}

function UserHealthInner() {
  const canSend = useCanPerform("notifications.send");
  const [data, setData] = useState<UserHealth[]>(SEED_USER_HEALTH);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserHealthStatus | "all">("all");
  const [issueFilter, setIssueFilter] = useState<IssueKind | "all">("all");
  const [contactTarget, setContactTarget] = useState<UserHealth | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = data.length;
    const blocked = data.filter((u) => u.status === "blocked").length;
    const degraded = data.filter((u) => u.status === "degraded").length;
    const healthy = data.filter((u) => u.status === "healthy").length;
    const openIssues = data.reduce((s, u) => s + u.issues.filter((i) => !resolved.has(i.id)).length, 0);
    const slowest = [...data].sort((a, b) => b.p95ResponseMs - a.p95ResponseMs)[0];
    const highestErr = [...data].sort((a, b) => b.errorRate - a.errorRate)[0];
    return { total, blocked, degraded, healthy, openIssues, slowest, highestErr };
  }, [data, resolved]);

  const filtered = useMemo(() => {
    return data.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (issueFilter !== "all" && !u.issues.some((i) => i.kind === issueFilter && !resolved.has(i.id))) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.workspace.toLowerCase().includes(q) ||
          u.region.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      // Most-impacted first: blocked > degraded > healthy, then by open issues
      const rank = (s: UserHealthStatus) => (s === "blocked" ? 0 : s === "degraded" ? 1 : 2);
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      const ai = a.issues.filter((i) => !resolved.has(i.id)).length;
      const bi = b.issues.filter((i) => !resolved.has(i.id)).length;
      return bi - ai;
    });
  }, [data, search, statusFilter, issueFilter, resolved]);

  const { visible: visibleUsers, sentinelRef: usersSentinelRef, hasMore: hasMoreUsers } = useInfiniteScroll(filtered, { step: 15 });

  const resolveIssue = (issueId: string) => {
    setResolved((s) => new Set(s).add(issueId));
    flash("Issue marked resolved.");
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleSend = (payload: { subject: string; message: string; channel: string }) => {
    if (!contactTarget) return;
    flash(`Notification sent to ${contactTarget.name} via ${payload.channel}.`);
    setContactTarget(null);
  };

  return (
    <>
      <PageHeader
        title="User health"
        description="Spot end-users hitting slow responses, errors, or other issues — and reach out before they churn."
        actions={
          <button
            onClick={() => flash("Refreshed live signals.")}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />
      <PageBody className="space-y-4">
        {toast && (
          <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-[12px] text-[color:var(--success)] inline-flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {toast}
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={UsersIcon} label="Users monitored" value={String(stats.total)} sub={`${stats.healthy} healthy`} tone="info" />
          <Kpi icon={XCircle} label="Blocked" value={String(stats.blocked)} sub="Service unusable" tone="danger" />
          <Kpi icon={AlertTriangle} label="Degraded" value={String(stats.degraded)} sub={`${stats.openIssues} open issues`} tone="warning" />
          <Kpi
            icon={TrendingUp}
            label="Slowest p95"
            value={stats.slowest ? `${(stats.slowest.p95ResponseMs / 1000).toFixed(1)}s` : "—"}
            sub={stats.slowest ? stats.slowest.name : ""}
            tone="violet"
          />
        </div>

        {/* Filter bar */}
        <div className="premium-card p-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, email, workspace…"
              className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as UserHealthStatus | "all")} className="rounded-lg border bg-background px-2.5 py-1.5 text-xs">
            <option value="all">All statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={issueFilter} onChange={(e) => setIssueFilter(e.target.value as IssueKind | "all")} className="rounded-lg border bg-background px-2.5 py-1.5 text-xs">
            <option value="all">All issue types</option>
            {(Object.keys(ISSUE_LABELS) as IssueKind[]).map((k) => <option key={k} value={k}>{ISSUE_LABELS[k]}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            {Object.entries(STATUS_META).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${v.dot}`} />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {/* User rows */}
        {filtered.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <HeartPulse className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium">No users match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Everyone you're watching is in good shape — try widening filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleUsers.map((u) => (
              <UserHealthCard
                key={u.userId}
                user={u}
                resolved={resolved}
                onResolve={resolveIssue}
                onContact={() => setContactTarget(u)}
                canSend={canSend}
              />
            ))}
            {hasMoreUsers ? (
              <div ref={usersSentinelRef} className="flex items-center justify-center gap-2 py-4 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
              </div>
            ) : (
              filtered.length > 5 && (
                <div className="py-2 text-center text-[11px] text-muted-foreground">
                  All {filtered.length} users shown
                </div>
              )
            )}
          </div>
        )}
      </PageBody>

      {contactTarget && (
        <ContactModal user={contactTarget} onCancel={() => setContactTarget(null)} onSend={handleSend} />
      )}
    </>
  );
}

/* ------------- subcomponents ------------- */

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: typeof Activity; label: string; value: string; sub?: string; tone: Tone }) {
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
        <p className="text-base font-semibold tabular-nums leading-tight truncate">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  );
}

function UserHealthCard({
  user, resolved, onResolve, onContact, canSend,
}: {
  user: UserHealth;
  resolved: Set<string>;
  onResolve: (id: string) => void;
  onContact: () => void;
  canSend: boolean;
}) {
  const meta = STATUS_META[user.status];
  const openIssues = user.issues.filter((i) => !resolved.has(i.id));
  const slowdown = user.avgResponseMs / user.baselineMs;
  const slowdownPct = Math.round((slowdown - 1) * 100);
  const isSlow = slowdown >= 1.5;
  const errPct = (user.errorRate * 100).toFixed(1);

  return (
    <div
      className={`premium-card p-4 border-l-4 ${
        user.status === "blocked" ? "border-l-destructive" :
        user.status === "degraded" ? "border-l-[color:var(--warning)]" :
        "border-l-[color:var(--success)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative shrink-0">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-4 text-[11px] font-bold text-white">
              {initials(user.name)}
            </span>
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background ${meta.dot}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-semibold">{user.name}</h3>
              <Badge tone={meta.tone}>{meta.label}</Badge>
              <Badge tone="neutral">{user.plan}</Badge>
              {openIssues.length > 0 && <Badge tone="danger">{openIssues.length} open</Badge>}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            <p className="text-[10.5px] text-muted-foreground mt-0.5 inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1"><UsersIcon className="h-2.5 w-2.5" />{user.workspace}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{user.region}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />active {formatRelative(user.lastActiveAt)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canSend && (
            <button
              onClick={onContact}
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent"
            >
              <Send className="h-3 w-3" />
              Contact user
            </button>
          )}
          <Link href={`/users/${user.userId}`} className="inline-flex items-center gap-1 text-[11px] text-primary font-medium hover:underline">
            Profile <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
        <Metric
          icon={Clock}
          label="Avg response"
          value={`${(user.avgResponseMs / 1000).toFixed(2)}s`}
          sub={`baseline ${(user.baselineMs / 1000).toFixed(1)}s`}
          warn={isSlow}
          warnSub={isSlow ? `+${slowdownPct}% vs baseline` : undefined}
        />
        <Metric icon={Zap} label="p95 response" value={`${(user.p95ResponseMs / 1000).toFixed(2)}s`} warn={user.p95ResponseMs > user.baselineMs * 2} />
        <Metric icon={XCircle} label="Error rate" value={`${errPct}%`} warn={user.errorRate >= 0.05} />
        <Metric icon={Activity} label="Sessions (24h)" value={String(user.sessions24h)} />
      </div>

      {/* Open issues */}
      {openIssues.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {openIssues.map((iss) => {
            const Icon = ISSUE_ICON[iss.kind];
            return (
              <li key={iss.id} className="rounded-lg border bg-background/60 p-2.5 flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge tone={ISSUE_TONE[iss.kind]}>{ISSUE_LABELS[iss.kind]}</Badge>
                    <Badge tone={SEVERITY_TONE[iss.severity]}>{iss.severity}</Badge>
                    <span className="text-[10px] text-muted-foreground">detected {formatRelative(iss.detectedAt)}</span>
                  </div>
                  <p className="text-[11.5px] mt-0.5 text-foreground/90">{iss.detail}</p>
                </div>
                <button
                  onClick={() => onResolve(iss.id)}
                  className="text-[10.5px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent shrink-0"
                >
                  Mark resolved
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub, warn, warnSub }: { icon: typeof Clock; label: string; value: string; sub?: string; warn?: boolean; warnSub?: string }) {
  return (
    <div className={`rounded-lg border bg-background/60 p-2.5 ${warn ? "ring-1 ring-warning/40" : ""}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </p>
      <p className={`text-sm font-semibold tabular-nums mt-0.5 ${warn ? "text-[color:var(--warning)]" : ""}`}>{value}</p>
      {warnSub ? (
        <p className="text-[10px] text-[color:var(--warning)] mt-0.5 font-medium">{warnSub}</p>
      ) : sub ? (
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
      ) : null}
    </div>
  );
}

/* ------------- contact modal ------------- */

const TEMPLATES = [
  { id: "outage", subject: "We're investigating slow responses", body: "Hi {{name}},\n\nWe've noticed unusually slow responses on your workspace. Our team is actively investigating and we'll keep you posted. Apologies for the disruption." },
  { id: "checkin", subject: "Checking in on your experience", body: "Hi {{name}},\n\nNoticed your last few sessions ran into some friction. If anything's blocking you, reply to this message and we'll jump in." },
  { id: "resolved", subject: "Issue resolved", body: "Hi {{name}},\n\nThe issue impacting your workspace has been resolved. Things should be back to normal — let us know if you see anything else." },
  { id: "custom", subject: "", body: "" },
];

function ContactModal({
  user, onCancel, onSend,
}: {
  user: UserHealth;
  onCancel: () => void;
  onSend: (p: { subject: string; message: string; channel: string }) => void;
}) {
  const [template, setTemplate] = useState("outage");
  const initialTpl = TEMPLATES[0];
  const [subject, setSubject] = useState(initialTpl.subject);
  const [message, setMessage] = useState(initialTpl.body.replace("{{name}}", user.name.split(" ")[0]));
  const [channel, setChannel] = useState<"In-app" | "Email" | "Both">("Both");
  const [priority, setPriority] = useState<"normal" | "important" | "critical">("important");

  const applyTemplate = (id: string) => {
    setTemplate(id);
    const t = TEMPLATES.find((x) => x.id === id);
    if (t && id !== "custom") {
      setSubject(t.subject);
      setMessage(t.body.replace("{{name}}", user.name.split(" ")[0]));
    } else if (id === "custom") {
      setSubject(""); setMessage("");
    }
  };

  const submit = () => {
    if (!subject.trim() || !message.trim()) return;
    onSend({ subject, message, channel });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-lg premium-card p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/40">
            <Send className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Send notification</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              To <span className="font-medium">{user.name}</span> · {user.email}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium">Template</label>
          <div className="grid grid-cols-2 gap-1.5">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t.id)}
                className={`text-left rounded-md border px-2.5 py-1.5 text-[11px] ${
                  template === t.id ? "bg-accent ring-1 ring-primary/40" : "bg-background hover:bg-accent/50"
                }`}
              >
                {t.id === "outage" && "Investigating outage"}
                {t.id === "checkin" && "Check in"}
                {t.id === "resolved" && "Issue resolved"}
                {t.id === "custom" && "Custom message"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
            placeholder="Short, clear summary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-lg border bg-background px-3 py-2 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/40"
            placeholder="What do you want to tell this user?"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as "In-app" | "Email" | "Both")} className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs">
              <option value="In-app">In-app only</option>
              <option value="Email">Email only</option>
              <option value="Both">In-app + Email</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as "normal" | "important" | "critical")} className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs">
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <button onClick={onCancel} className="rounded-lg border bg-background px-3 py-1.5 text-xs hover:bg-accent">Cancel</button>
          <button
            onClick={submit}
            disabled={!subject.trim() || !message.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Send notification
          </button>
        </div>
      </div>
    </div>
  );
}
