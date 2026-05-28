// Synthesized per-member activity data — sessions, page-views, actions per day.
// Deterministic-ish (date-seeded) so the view stays stable across renders within a day.

export type AppSection =
  | "Dashboard"
  | "Users"
  | "Conversations"
  | "Subscriptions"
  | "Payments"
  | "Access"
  | "Configuration"
  | "Agents"
  | "Widgets"
  | "Tools"
  | "Adaptive Cards"
  | "Personalization"
  | "Themes"
  | "Integrations";

export type ActivityAction =
  | "viewed"
  | "edited"
  | "created"
  | "deleted"
  | "exported"
  | "invited"
  | "assigned"
  | "approved"
  | "configured";

export type ActivityEvent = {
  id: string;
  at: string; // ISO
  section: AppSection;
  action: ActivityAction;
  detail: string;
  durationMin: number; // minutes spent on this event
};

export type DailySession = {
  id: string;
  start: string;
  end: string;
  device: string;
  location: string;
};

export type DailyActivity = {
  date: string; // YYYY-MM-DD
  memberId: string;
  sessions: DailySession[];
  events: ActivityEvent[];
  totalMinutes: number;
  focusSection: AppSection;
};

const SECTIONS: AppSection[] = [
  "Dashboard", "Users", "Conversations", "Subscriptions", "Payments",
  "Access", "Configuration", "Agents", "Widgets", "Tools",
  "Adaptive Cards", "Personalization", "Themes", "Integrations",
];

export const SECTION_COLORS: Record<AppSection, string> = {
  Dashboard: "oklch(0.65 0.18 250)",
  Users: "oklch(0.65 0.18 220)",
  Conversations: "oklch(0.65 0.18 190)",
  Subscriptions: "oklch(0.65 0.20 300)",
  Payments: "oklch(0.65 0.22 30)",
  Access: "oklch(0.65 0.22 350)",
  Configuration: "oklch(0.65 0.16 100)",
  Agents: "oklch(0.7 0.18 60)",
  Widgets: "oklch(0.65 0.18 160)",
  Tools: "oklch(0.65 0.16 140)",
  "Adaptive Cards": "oklch(0.7 0.16 80)",
  Personalization: "oklch(0.65 0.20 330)",
  Themes: "oklch(0.65 0.18 270)",
  Integrations: "oklch(0.65 0.20 200)",
};

const ACTION_VERBS: Record<ActivityAction, string> = {
  viewed: "Viewed",
  edited: "Edited",
  created: "Created",
  deleted: "Deleted",
  exported: "Exported",
  invited: "Invited",
  assigned: "Assigned",
  approved: "Approved",
  configured: "Configured",
};

export const ACTION_LABEL = ACTION_VERBS;

// Section profiles bias what each role tends to do
const ROLE_FOCUS: Record<string, AppSection[]> = {
  super_admin: ["Dashboard", "Access", "Configuration", "Agents", "Users"],
  admin: ["Dashboard", "Users", "Conversations", "Access", "Agents"],
  billing: ["Dashboard", "Subscriptions", "Payments", "Users"],
  support: ["Dashboard", "Users", "Conversations"],
  viewer: ["Dashboard"],
};

// Simple seeded RNG
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const DEVICES = [
  "MacBook Pro · Chrome 138",
  "Windows 11 · Edge 137",
  "MacBook Air · Safari 19",
  "Ubuntu 24.04 · Firefox 142",
];
const LOCATIONS = [
  "Bengaluru, IN",
  "London, UK",
  "New York, US",
  "Singapore, SG",
  "Berlin, DE",
];

const DETAIL_TEMPLATES: Partial<Record<AppSection, string[]>> = {
  Dashboard: ["Reviewed KPIs", "Checked weekly trend", "Inspected activity heat-map"],
  Users: ["Filtered by churn risk", "Opened user profile", "Bulk-tagged accounts"],
  Conversations: ["Triaged escalations", "Reviewed transcript", "Tagged sentiment"],
  Subscriptions: ["Updated plan tier", "Reviewed renewals", "Inspected MRR"],
  Payments: ["Reconciled refunds", "Reviewed failed charges", "Approved disbursement"],
  Access: ["Edited role permissions", "Reviewed audit log", "Invited new member"],
  Configuration: ["Tuned rate limits", "Adjusted retention", "Toggled feature flag"],
  Agents: ["Published new prompt", "Edited routing rules", "Tested agent response"],
  Widgets: ["Composed homepage widget", "Repositioned layout"],
  Tools: ["Registered new tool", "Updated schema"],
  "Adaptive Cards": ["Edited card template", "Previewed render"],
  Personalization: ["Adjusted ranking weights", "Tested cohort"],
  Themes: ["Tweaked tokens", "Published theme"],
  Integrations: ["Rotated credentials", "Tested webhook"],
};

function pickWeighted<T>(rng: () => number, items: T[], focus: T[]): T {
  if (rng() < 0.7 && focus.length) return focus[Math.floor(rng() * focus.length)];
  return items[Math.floor(rng() * items.length)];
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function makeDay(memberId: string, role: string, date: Date, status: "active" | "invited" | "suspended"): DailyActivity {
  const dateStr = fmtDate(date);
  const rng = mulberry32(hashSeed(`${memberId}-${dateStr}`));
  const focus = ROLE_FOCUS[role] ?? ROLE_FOCUS.viewer;

  // Suspended → no activity. Invited → tiny activity once.
  let sessionCount = 0;
  if (status === "suspended") sessionCount = 0;
  else if (status === "invited") sessionCount = rng() > 0.5 ? 1 : 0;
  else {
    const day = date.getDay();
    const weekend = day === 0 || day === 6;
    sessionCount = weekend ? Math.floor(rng() * 2) : 1 + Math.floor(rng() * 3);
  }

  const sessions: DailySession[] = [];
  const events: ActivityEvent[] = [];
  let totalMinutes = 0;

  // Time-of-day buckets so sessions span the workday
  const dayStart = 8; // 8 AM
  let cursor = dayStart * 60 + Math.floor(rng() * 60);

  for (let s = 0; s < sessionCount; s++) {
    const startMin = cursor;
    const lengthMin = 20 + Math.floor(rng() * 95); // 20–115 min
    const endMin = Math.min(startMin + lengthMin, 22 * 60);
    cursor = endMin + 30 + Math.floor(rng() * 90);
    const startDate = new Date(date);
    startDate.setHours(0, startMin, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(0, endMin, 0, 0);

    sessions.push({
      id: `s_${memberId}_${dateStr}_${s}`,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      device: DEVICES[Math.floor(rng() * DEVICES.length)],
      location: LOCATIONS[Math.floor(rng() * LOCATIONS.length)],
    });
    totalMinutes += endMin - startMin;

    // 2–6 events per session
    const evCount = 2 + Math.floor(rng() * 5);
    for (let e = 0; e < evCount; e++) {
      const section = pickWeighted(rng, SECTIONS, focus);
      const action = (Object.keys(ACTION_VERBS) as ActivityAction[])[
        Math.floor(rng() * Object.keys(ACTION_VERBS).length)
      ];
      const templates = DETAIL_TEMPLATES[section] ?? ["Activity"];
      const detail = templates[Math.floor(rng() * templates.length)];
      const offset = Math.floor(((endMin - startMin) * e) / evCount);
      const at = new Date(date);
      at.setHours(0, startMin + offset, Math.floor(rng() * 60), 0);
      events.push({
        id: `ev_${memberId}_${dateStr}_${s}_${e}`,
        at: at.toISOString(),
        section,
        action,
        detail,
        durationMin: Math.max(2, Math.floor((endMin - startMin) / evCount) + Math.floor(rng() * 5)),
      });
    }
  }

  // Determine focus section by total minutes
  const sectionTotals = new Map<AppSection, number>();
  for (const e of events) sectionTotals.set(e.section, (sectionTotals.get(e.section) ?? 0) + e.durationMin);
  let focusSection: AppSection = focus[0] ?? "Dashboard";
  let max = -1;
  for (const [sec, mins] of sectionTotals) {
    if (mins > max) { max = mins; focusSection = sec; }
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return { date: dateStr, memberId, sessions, events, totalMinutes, focusSection };
}

export function getMemberActivity(
  memberId: string,
  role: string,
  status: "active" | "invited" | "suspended",
  days = 14,
  referenceDate: Date = new Date()
): DailyActivity[] {
  const out: DailyActivity[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    out.push(makeDay(memberId, role, d, status));
  }
  return out; // most recent first
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
