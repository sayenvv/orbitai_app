"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ShieldAlert,
  CreditCard,
  Settings as SettingsIcon,
  UserPlus,
  FileBarChart,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  CheckCheck,
  Trash2,
  ArrowRight,
  Search,
  Send,
  Megaphone,
  Users as UsersIcon,
  Loader2,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { RequirePermission, useCanPerform } from "@/components/auth-guard";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { Badge } from "@/components/ui/badge";
import {
  SEED_NOTIFICATIONS,
  formatDateTime,
  type NotificationItem,
  type NotificationCategory,
  type NotificationSeverity,
} from "@/lib/ops-data";
import { formatRelative } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger" | "violet" | "neutral";

const CATEGORY_META: Record<NotificationCategory, { label: string; icon: typeof Bell; tone: Tone }> = {
  security: { label: "Security", icon: ShieldAlert, tone: "danger" },
  billing: { label: "Billing", icon: CreditCard, tone: "violet" },
  system: { label: "System", icon: SettingsIcon, tone: "info" },
  member: { label: "Members", icon: UserPlus, tone: "success" },
  report: { label: "Reports", icon: FileBarChart, tone: "warning" },
};

const SEVERITY_META: Record<NotificationSeverity, { label: string; tone: Tone; icon: typeof Info }> = {
  critical: { label: "Critical", tone: "danger", icon: XCircle },
  warning: { label: "Warning", tone: "warning", icon: AlertTriangle },
  info: { label: "Info", tone: "info", icon: Info },
  success: { label: "Success", tone: "success", icon: CheckCircle2 },
};

export default function NotificationsPage() {
  return (
    <RequirePermission permission="notifications.view">
      <NotificationsInner />
    </RequirePermission>
  );
}

function NotificationsInner() {
  const canSend = useCanPerform("notifications.send");
  const [items, setItems] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<NotificationCategory | "all">("all");
  const [severity, setSeverity] = useState<NotificationSeverity | "all">("all");
  const [view, setView] = useState<"all" | "unread">("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (view === "unread" && n.read) return false;
      if (category !== "all" && n.category !== category) return false;
      if (severity !== "all" && n.severity !== severity) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.actor ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, view, category, severity, search]);

  const { visible: visibleNotifs, sentinelRef: notifsSentinelRef, hasMore: hasMoreNotifs } = useInfiniteScroll(filtered, { step: 20 });

  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const toggleRead = (id: string) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  const remove = (id: string) => setItems((prev) => prev.filter((n) => n.id !== id));

  const counts = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const n of items) {
      byCategory[n.category] = (byCategory[n.category] ?? 0) + 1;
      bySeverity[n.severity] = (bySeverity[n.severity] ?? 0) + 1;
    }
    return { byCategory, bySeverity };
  }, [items]);

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unreadCount === 0 ? "You're all caught up." : `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
            {canSend && (
              <button
                onClick={() => setComposeOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Megaphone className="h-3.5 w-3.5" />
                Compose notification
              </button>
            )}
          </div>
        }
      />
      <PageBody className="space-y-4">
        {toast && (
          <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-[12px] text-[color:var(--success)] inline-flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {toast}
          </div>
        )}
        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Summary icon={Bell} label="Total" value={items.length} tone="info" />
          <Summary icon={XCircle} label="Critical" value={counts.bySeverity.critical ?? 0} tone="danger" />
          <Summary icon={AlertTriangle} label="Warnings" value={counts.bySeverity.warning ?? 0} tone="warning" />
          <Summary icon={CheckCircle2} label="Unread" value={unreadCount} tone="success" />
        </div>

        {/* Filter bar */}
        <div className="premium-card p-3 flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border bg-background p-0.5">
            {(["all", "unread"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  view === v ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "all" ? "All" : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications…"
              className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value as NotificationCategory | "all")} className="rounded-lg border bg-background px-2.5 py-1.5 text-xs">
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as NotificationSeverity | "all")} className="rounded-lg border bg-background px-2.5 py-1.5 text-xs">
            <option value="all">All severities</option>
            {Object.entries(SEVERITY_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium">Nothing to see here</p>
            <p className="text-xs text-muted-foreground mt-1">No notifications match your filters.</p>
          </div>
        ) : (
          <>
            <div className="premium-card divide-y divide-border/60 overflow-hidden">
              {visibleNotifs.map((n) => (
                <NotificationRow key={n.id} item={n} onToggleRead={() => toggleRead(n.id)} onRemove={() => remove(n.id)} />
              ))}
            </div>
            {hasMoreNotifs ? (
              <div ref={notifsSentinelRef} className="flex items-center justify-center gap-2 py-4 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
              </div>
            ) : (
              filtered.length > 0 && (
                <div className="py-3 text-center text-[11px] text-muted-foreground">
                  All {filtered.length} notifications shown
                </div>
              )
            )}
          </>
        )}
      </PageBody>
      {composeOpen && (
        <ComposeModal
          onCancel={() => setComposeOpen(false)}
          onSend={(payload) => {
            const audienceLabel =
              payload.audienceKind === "all" ? "All users" :
              payload.audienceKind === "role" ? `Role: ${payload.audienceValue}` :
              payload.audienceKind === "plan" ? `Plan: ${payload.audienceValue}` :
              `User: ${payload.audienceValue}`;
            const newItem: NotificationItem = {
              id: `bcast_${Date.now()}`,
              at: new Date().toISOString(),
              title: payload.title,
              message: payload.message,
              category: payload.category,
              severity: payload.severity,
              actor: "You",
              read: false,
              link: payload.link ? { href: payload.link, label: "Open link" } : undefined,
              audience: audienceLabel,
              channel: payload.channel,
            };
            setItems((prev) => [newItem, ...prev]);
            setComposeOpen(false);
            setToast(`Notification sent to ${audienceLabel} via ${payload.channel}.`);
            setTimeout(() => setToast(null), 3000);
          }}
        />
      )}
    </>
  );
}

function Summary({ icon: Icon, label, value, tone }: { icon: typeof Bell; label: string; value: number; tone: Tone }) {
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

function NotificationRow({ item, onToggleRead, onRemove }: { item: NotificationItem; onToggleRead: () => void; onRemove: () => void }) {
  const cat = CATEGORY_META[item.category];
  const sev = SEVERITY_META[item.severity];
  const CatIcon = cat.icon;
  const SevIcon = sev.icon;
  return (
    <div className={`p-4 flex items-start gap-3 group transition-colors ${item.read ? "" : "bg-primary/5"}`}>
      <div className="relative shrink-0">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/60">
          <CatIcon className="h-4 w-4 text-primary" />
        </div>
        {!item.read && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className={`text-sm ${item.read ? "font-medium" : "font-semibold"}`}>{item.title}</h4>
          <Badge tone={cat.tone}>{cat.label}</Badge>
          <Badge tone={sev.tone}>
            <span className="inline-flex items-center gap-0.5">
              <SevIcon className="h-2.5 w-2.5" />
              {sev.label}
            </span>
          </Badge>
        </div>
        <p className="text-[12px] text-muted-foreground leading-snug">{item.message}</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5 flex-wrap">
          {item.actor && <span>by <span className="font-medium text-foreground">{item.actor}</span></span>}
          <span title={formatDateTime(item.at)}>{formatRelative(item.at)}</span>
          {item.audience && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5">
              <UsersIcon className="h-2.5 w-2.5" /> {item.audience}
            </span>
          )}
          {item.channel && <span className="rounded-md bg-muted/60 px-1.5 py-0.5">via {item.channel}</span>}
          {item.link && (
            <Link href={item.link.href} className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
              {item.link.label} <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onToggleRead} className="text-[10.5px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent">
          Mark {item.read ? "unread" : "read"}
        </button>
        <button onClick={onRemove} className="text-[10.5px] text-destructive hover:bg-destructive/10 px-2 py-1 rounded-md inline-flex items-center gap-1">
          <Trash2 className="h-3 w-3" /> Dismiss
        </button>
      </div>
    </div>
  );
}

/* ---------------- Compose modal ---------------- */

const ROLE_OPTIONS = ["All admins", "Billing managers", "Support team", "Viewers"];
const PLAN_OPTIONS = ["Free", "Pro", "Business", "Enterprise"];
const USER_SUGGESTIONS = [
  "aarav@northwind.co",
  "beatriz@lumiere.fr",
  "chen.wei@globex.cn",
  "dilnoza@helix.uz",
  "elena@acmecorp.io",
  "felipe@orbital.br",
  "greta@nordic.dk",
  "hiroshi@kazoku.jp",
];

const COMPOSE_TEMPLATES: Array<{
  id: string;
  label: string;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
}> = [
  { id: "maintenance", label: "Scheduled maintenance", category: "system", severity: "info",
    title: "Scheduled maintenance window",
    message: "We'll be performing maintenance this weekend. Expect brief interruptions between 02:00 - 04:00 UTC on Sunday." },
  { id: "feature", label: "New feature announcement", category: "system", severity: "success",
    title: "New: Adaptive cards 2.0",
    message: "We've just shipped a redesigned adaptive cards experience with richer interactions and faster previews." },
  { id: "incident", label: "Incident update", category: "system", severity: "warning",
    title: "We're investigating elevated response times",
    message: "Some users may experience slower-than-usual responses. We're investigating and will share an update shortly." },
  { id: "billing", label: "Billing reminder", category: "billing", severity: "warning",
    title: "Action required: update your payment method",
    message: "Your card on file is about to expire. Please update it to avoid any service interruption." },
  { id: "custom", label: "Custom message", category: "system", severity: "info",
    title: "", message: "" },
];

type ComposePayload = {
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  audienceKind: "all" | "role" | "plan" | "user";
  audienceValue: string;
  channel: "In-app" | "Email" | "Both";
  link: string;
};

function ComposeModal({ onCancel, onSend }: { onCancel: () => void; onSend: (p: ComposePayload) => void }) {
  const [templateId, setTemplateId] = useState("maintenance");
  const initial = COMPOSE_TEMPLATES[0];
  const [title, setTitle] = useState(initial.title);
  const [message, setMessage] = useState(initial.message);
  const [category, setCategory] = useState<NotificationCategory>(initial.category);
  const [severity, setSeverity] = useState<NotificationSeverity>(initial.severity);
  const [audienceKind, setAudienceKind] = useState<ComposePayload["audienceKind"]>("all");
  const [audienceValue, setAudienceValue] = useState<string>(ROLE_OPTIONS[0]);
  const [channel, setChannel] = useState<ComposePayload["channel"]>("In-app");
  const [link, setLink] = useState("");

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = COMPOSE_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    if (id !== "custom") {
      setTitle(t.title);
      setMessage(t.message);
      setCategory(t.category);
      setSeverity(t.severity);
    }
  };

  const onAudienceKindChange = (k: ComposePayload["audienceKind"]) => {
    setAudienceKind(k);
    if (k === "role") setAudienceValue(ROLE_OPTIONS[0]);
    else if (k === "plan") setAudienceValue(PLAN_OPTIONS[0]);
    else if (k === "user") setAudienceValue("");
    else setAudienceValue("");
  };

  const submit = () => {
    if (!title.trim() || !message.trim()) return;
    if ((audienceKind === "user") && !audienceValue.trim()) return;
    onSend({ title, message, category, severity, audienceKind, audienceValue: audienceKind === "all" ? "" : audienceValue, channel, link });
  };

  const sev = SEVERITY_META[severity];
  const cat = CATEGORY_META[category];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-2xl premium-card p-5 space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/40">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Compose notification</h3>
            <p className="text-[11px] text-muted-foreground">Broadcast a message to your users in-app and/or by email.</p>
          </div>
        </div>

        {/* Templates */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium">Template</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
            {COMPOSE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t.id)}
                className={`text-left rounded-md border px-2 py-1.5 text-[10.5px] leading-snug ${
                  templateId === t.id ? "bg-accent ring-1 ring-primary/40" : "bg-background hover:bg-accent/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title + Message */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
            placeholder="Short, clear title"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-lg border bg-background px-3 py-2 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/40"
            placeholder="The body of your notification"
          />
        </div>

        {/* Category / Severity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as NotificationCategory)} className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs">
              {Object.entries(CATEGORY_META).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium">Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as NotificationSeverity)} className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs">
              {Object.entries(SEVERITY_META).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
            </select>
          </div>
        </div>

        {/* Audience */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium">Audience</label>
          <div className="inline-flex rounded-lg border bg-background p-0.5">
            {(["all", "role", "plan", "user"] as const).map((k) => (
              <button
                key={k}
                onClick={() => onAudienceKindChange(k)}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  audienceKind === k ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {k === "all" ? "All users" : k === "role" ? "By role" : k === "plan" ? "By plan" : "Specific user"}
              </button>
            ))}
          </div>
          {audienceKind === "role" && (
            <select value={audienceValue} onChange={(e) => setAudienceValue(e.target.value)} className="mt-2 w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs">
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          {audienceKind === "plan" && (
            <select value={audienceValue} onChange={(e) => setAudienceValue(e.target.value)} className="mt-2 w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs">
              {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {audienceKind === "user" && (
            <>
              <input
                list="compose-user-suggestions"
                value={audienceValue}
                onChange={(e) => setAudienceValue(e.target.value)}
                placeholder="user@example.com"
                className="mt-2 w-full rounded-lg border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <datalist id="compose-user-suggestions">
                {USER_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
              </datalist>
            </>
          )}
          {audienceKind === "all" && (
            <p className="mt-1 text-[10.5px] text-muted-foreground">This message will be delivered to every active user across all workspaces.</p>
          )}
        </div>

        {/* Channel + Link */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as ComposePayload["channel"])} className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs">
              <option value="In-app">In-app only</option>
              <option value="Email">Email only</option>
              <option value="Both">In-app + Email</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium">Action link (optional)</label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/settings or https://..."
              className="w-full rounded-lg border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg border bg-background/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Preview</p>
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/60 shrink-0">
              <cat.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-semibold">{title || <span className="text-muted-foreground italic">Title preview...</span>}</h4>
                <Badge tone={cat.tone}>{cat.label}</Badge>
                <Badge tone={sev.tone}>{sev.label}</Badge>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1 leading-snug whitespace-pre-wrap">{message || "Message preview will appear here."}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <button onClick={onCancel} className="rounded-lg border bg-background px-3 py-1.5 text-xs hover:bg-accent">Cancel</button>
          <button
            onClick={submit}
            disabled={!title.trim() || !message.trim() || (audienceKind === "user" && !audienceValue.trim())}
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