"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Clock,
  LogIn,
  MapPin,
  Monitor,
  Target,
  TrendingUp,
  Users as UsersIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Trash2,
  Download,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { useTeamStore } from "@/store/team-store";
import {
  getMemberActivity,
  formatDuration,
  formatClock,
  SECTION_COLORS,
  ACTION_LABEL,
  type AppSection,
  type ActivityAction,
  type DailyActivity,
  type ActivityEvent,
} from "@/lib/activity-data";
import { initials } from "@/lib/utils";

const ACTION_ICON: Record<ActivityAction, typeof Eye> = {
  viewed: Eye,
  edited: Pencil,
  created: Plus,
  deleted: Trash2,
  exported: Download,
  invited: UserPlus,
  assigned: ShieldCheck,
  approved: CheckCircle2,
  configured: Settings,
};

const DAY_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
];

export default function ActivityPage() {
  const members = useTeamStore((s) => s.members);
  const roles = useTeamStore((s) => s.roles);

  const [search, setSearch] = useState("");
  const [days, setDays] = useState(14);
  const [selectedMember, setSelectedMember] = useState<string>(members[0]?.id ?? "");
  const [activeDate, setActiveDate] = useState<string>(""); // YYYY-MM-DD

  const filteredMembers = useMemo(
    () => members.filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())),
    [members, search]
  );

  const member = members.find((m) => m.id === selectedMember) ?? members[0];
  const roleLabel = roles.find((r) => r.id === member?.role)?.label ?? member?.role ?? "";

  const activity = useMemo<DailyActivity[]>(() => {
    if (!member) return [];
    return getMemberActivity(member.id, member.role, member.status, days);
  }, [member, days]);

  // Initialize / re-sync active date to most recent day with activity
  const effectiveDate = useMemo(() => {
    if (activeDate && activity.some((d) => d.date === activeDate)) return activeDate;
    const firstWithEvents = activity.find((d) => d.events.length > 0);
    return firstWithEvents?.date ?? activity[0]?.date ?? "";
  }, [activeDate, activity]);

  const currentDay = activity.find((d) => d.date === effectiveDate);

  // Aggregate stats across range
  const totals = useMemo(() => {
    const minutes = activity.reduce((sum, d) => sum + d.totalMinutes, 0);
    const sessions = activity.reduce((sum, d) => sum + d.sessions.length, 0);
    const actions = activity.reduce((sum, d) => sum + d.events.length, 0);
    const activeDays = activity.filter((d) => d.events.length > 0).length;
    return { minutes, sessions, actions, activeDays };
  }, [activity]);

  // Per-section totals across range
  const sectionBreakdown = useMemo(() => {
    const map = new Map<AppSection, number>();
    for (const d of activity) for (const e of d.events) map.set(e.section, (map.get(e.section) ?? 0) + e.durationMin);
    return Array.from(map.entries())
      .map(([section, minutes]) => ({ section, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [activity]);

  const peakMinutes = Math.max(1, ...activity.map((d) => d.totalMinutes));

  const goPrev = () => {
    const idx = activity.findIndex((d) => d.date === effectiveDate);
    if (idx < activity.length - 1) setActiveDate(activity[idx + 1].date);
  };
  const goNext = () => {
    const idx = activity.findIndex((d) => d.date === effectiveDate);
    if (idx > 0) setActiveDate(activity[idx - 1].date);
  };

  if (!member) {
    return (
      <>
        <PageHeader title="Member activity" description="See what each member did, for how long, and where they focused." />
        <PageBody><div className="premium-card p-12 text-center text-sm text-muted-foreground">No members to inspect.</div></PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Member activity"
        description="Per-member daily breakdown of time spent, sessions, and what they focused on."
        actions={
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs"
          >
            {DAY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        }
      />
      <PageBody>
        <div className="grid grid-cols-12 gap-4">
          {/* LEFT: member rail */}
          <aside className="col-span-12 lg:col-span-3">
            <div className="premium-card p-3 space-y-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find member…"
                  className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <ul className="space-y-1 max-h-[560px] overflow-y-auto pr-1">
                {filteredMembers.map((m) => {
                  const isSel = m.id === member.id;
                  const summary = getMemberActivity(m.id, m.role, m.status, days);
                  const mins = summary.reduce((s, d) => s + d.totalMinutes, 0);
                  return (
                    <li key={m.id}>
                      <button
                        onClick={() => { setSelectedMember(m.id); setActiveDate(""); }}
                        className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                          isSel ? "bg-accent ring-1 ring-border" : "hover:bg-accent/40"
                        }`}
                      >
                        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${m.avatarColor} text-[10px] font-bold text-white`}>
                          {initials(m.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold truncate">{m.name}</p>
                          <p className="text-[10.5px] text-muted-foreground truncate">{m.email}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10.5px] font-semibold tabular-nums">{formatDuration(mins)}</p>
                          <p className="text-[9.5px] text-muted-foreground">{days}d</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
                {filteredMembers.length === 0 && <li className="text-[11px] text-muted-foreground text-center py-4">No matches.</li>}
              </ul>
            </div>
          </aside>

          {/* RIGHT: detail */}
          <section className="col-span-12 lg:col-span-9 space-y-4">
            {/* Profile header */}
            <div className="premium-card p-4 flex items-center gap-4">
              <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${member.avatarColor} text-base font-bold text-white shadow`}>
                {initials(member.name)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold truncate">{member.name}</h2>
                  <Badge tone={member.status === "active" ? "success" : member.status === "invited" ? "info" : "warning"}>{member.status}</Badge>
                  <Badge tone="violet">{roleLabel}</Badge>
                </div>
                <p className="text-[11.5px] text-muted-foreground">{member.email}</p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {currentDay?.sessions[0]?.location ?? "—"}
              </div>
            </div>

            {/* Range KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={Clock} label="Total time" value={formatDuration(totals.minutes)} sub={`${days}d window`} tone="info" />
              <Kpi icon={LogIn} label="Sessions" value={String(totals.sessions)} sub={`${totals.activeDays}/${days} active days`} tone="violet" />
              <Kpi icon={Activity} label="Actions" value={String(totals.actions)} sub={totals.actions ? `${(totals.actions / Math.max(1, totals.activeDays)).toFixed(1)} per active day` : "—"} tone="warning" />
              <Kpi
                icon={Target}
                label="Top focus"
                value={sectionBreakdown[0]?.section ?? "—"}
                sub={sectionBreakdown[0] ? formatDuration(sectionBreakdown[0].minutes) : ""}
                tone="success"
              />
            </div>

            {/* Daily hours chart */}
            <div className="premium-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">Daily time in app</h3>
                  <p className="text-[11px] text-muted-foreground">Click a bar to inspect that day.</p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <DailyBars
                activity={activity}
                peakMinutes={peakMinutes}
                activeDate={effectiveDate}
                onPick={(d) => setActiveDate(d)}
              />
            </div>

            {/* Focus breakdown */}
            <div className="premium-card p-4">
              <h3 className="text-sm font-semibold mb-3">What {member.name.split(" ")[0]} focused on</h3>
              {sectionBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No activity recorded in this range.</p>
              ) : (
                <div className="space-y-2">
                  <FocusBar items={sectionBreakdown} total={totals.minutes} />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                    {sectionBreakdown.slice(0, 9).map((s) => {
                      const pct = totals.minutes ? Math.round((s.minutes / totals.minutes) * 100) : 0;
                      return (
                        <div key={s.section} className="flex items-center gap-2 rounded-lg border bg-background/60 px-2.5 py-1.5">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: SECTION_COLORS[s.section] }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium truncate">{s.section}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDuration(s.minutes)} · {pct}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Day inspector */}
            {currentDay && <DayInspector day={currentDay} onPrev={goPrev} onNext={goNext} canPrev={activity.findIndex((d) => d.date === effectiveDate) < activity.length - 1} canNext={activity.findIndex((d) => d.date === effectiveDate) > 0} />}
          </section>
        </div>
      </PageBody>
    </>
  );
}

/* ------------- subcomponents ------------- */

type Tone = "info" | "success" | "warning" | "violet";

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: typeof Activity; label: string; value: string; sub?: string; tone: Tone }) {
  const t: Record<Tone, string> = {
    info: "from-info/15 to-info/5 text-info",
    success: "from-success/15 to-success/5 text-[color:var(--success)]",
    warning: "from-warning/15 to-warning/5 text-[color:var(--warning)]",
    violet: "from-chart-4/15 to-chart-4/5 text-chart-4",
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

function DailyBars({
  activity, peakMinutes, activeDate, onPick,
}: {
  activity: DailyActivity[];
  peakMinutes: number;
  activeDate: string;
  onPick: (date: string) => void;
}) {
  const ordered = [...activity].reverse(); // oldest → newest left-to-right
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1.5 h-40">
        {ordered.map((d) => {
          const h = Math.max(2, Math.round((d.totalMinutes / peakMinutes) * 100));
          const isActive = d.date === activeDate;
          const day = new Date(d.date);
          return (
            <button
              key={d.date}
              onClick={() => onPick(d.date)}
              className="flex-1 group relative flex flex-col justify-end h-full"
              title={`${d.date} · ${formatDuration(d.totalMinutes)} · ${d.events.length} actions`}
            >
              <div
                className={`w-full rounded-t-md transition-all ${
                  isActive ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/55"
                }`}
                style={{ height: `${h}%` }}
              />
              <span className={`text-[9px] mt-1 ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {day.toLocaleDateString([], { weekday: "narrow" })}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
        <span>{ordered[0] && new Date(ordered[0].date).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
        <span>Peak: {formatDuration(peakMinutes)}</span>
        <span>{ordered[ordered.length - 1] && new Date(ordered[ordered.length - 1].date).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
      </div>
    </div>
  );
}

function FocusBar({ items, total }: { items: { section: AppSection; minutes: number }[]; total: number }) {
  if (total === 0) return null;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full ring-1 ring-border/40">
      {items.map((it) => {
        const pct = (it.minutes / total) * 100;
        return (
          <div
            key={it.section}
            title={`${it.section} — ${formatDuration(it.minutes)} (${Math.round(pct)}%)`}
            style={{ width: `${pct}%`, background: SECTION_COLORS[it.section] }}
          />
        );
      })}
    </div>
  );
}

function DayInspector({
  day, onPrev, onNext, canPrev, canNext,
}: {
  day: DailyActivity;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  const dateObj = new Date(day.date);
  const dateLabel = dateObj.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Per-day section totals
  const dayTotals = useMemo(() => {
    const map = new Map<AppSection, number>();
    for (const e of day.events) map.set(e.section, (map.get(e.section) ?? 0) + e.durationMin);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [day]);

  return (
    <div className="premium-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">{dateLabel}</h3>
          <p className="text-[11px] text-muted-foreground">
            {formatDuration(day.totalMinutes)} active · {day.sessions.length} session{day.sessions.length === 1 ? "" : "s"} · {day.events.length} action{day.events.length === 1 ? "" : "s"}
            {day.events.length > 0 && <> · focused on <span className="font-medium text-foreground">{day.focusSection}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} disabled={!canPrev} className="p-1.5 rounded-md border hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"><ChevronLeft className="h-3.5 w-3.5" /></button>
          <button onClick={onNext} disabled={!canNext} className="p-1.5 rounded-md border hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"><ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {day.events.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground">
          No activity on this day.
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Sessions + section breakdown */}
          <div className="col-span-12 md:col-span-4 space-y-3">
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Sessions</h4>
              <ul className="space-y-1.5">
                {day.sessions.map((s) => {
                  const mins = Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000);
                  return (
                    <li key={s.id} className="rounded-lg border bg-background/60 p-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold tabular-nums">{formatClock(s.start)} – {formatClock(s.end)}</span>
                        <span className="text-muted-foreground">{formatDuration(mins)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Monitor className="h-2.5 w-2.5" />
                        <span className="truncate">{s.device}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5" />
                        <span>{s.location}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Time by section</h4>
              <ul className="space-y-1">
                {dayTotals.map(([sec, mins]) => {
                  const pct = Math.round((mins / day.totalMinutes) * 100);
                  return (
                    <li key={sec} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: SECTION_COLORS[sec] }} />
                          {sec}
                        </span>
                        <span className="text-muted-foreground tabular-nums">{formatDuration(mins)} · {pct}%</span>
                      </div>
                      <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SECTION_COLORS[sec] }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Action timeline */}
          <div className="col-span-12 md:col-span-8">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Action timeline</h4>
            <ol className="relative space-y-2 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
              {day.events.map((e) => <TimelineRow key={e.id} event={e} />)}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineRow({ event }: { event: ActivityEvent }) {
  const Icon = ACTION_ICON[event.action];
  return (
    <li className="relative pl-10">
      <div
        className="absolute left-0 top-0.5 h-8 w-8 rounded-xl flex items-center justify-center ring-1 ring-border/60"
        style={{ background: `color-mix(in oklch, ${SECTION_COLORS[event.section]} 18%, transparent)` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: SECTION_COLORS[event.section] }} />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] leading-snug">
            <span className="font-semibold">{ACTION_LABEL[event.action]}</span>
            <span className="text-muted-foreground"> in </span>
            <span className="font-medium">{event.section}</span>
            <span className="text-muted-foreground"> — {event.detail}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{formatDuration(event.durationMin)} spent</p>
        </div>
        <span className="text-[10.5px] text-muted-foreground whitespace-nowrap shrink-0 font-mono">
          {formatClock(event.at)}
        </span>
      </div>
    </li>
  );
}
