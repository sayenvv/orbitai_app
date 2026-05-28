// Synthesized notifications + system log entries for the admin app.

export type NotificationCategory = "security" | "billing" | "system" | "member" | "report";
export type NotificationSeverity = "critical" | "warning" | "info" | "success";

export type NotificationItem = {
  id: string;
  at: string;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  actor?: string;
  link?: { href: string; label: string };
  read: boolean;
  audience?: string;
  channel?: string;
};

export const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n_001",
    at: "2026-05-28T07:42:00Z",
    title: "Unusual sign-in detected",
    message: "Diego Hernandez attempted to sign in from a new device (Berlin, DE). Access was blocked because the account is disabled.",
    category: "security", severity: "critical", actor: "Auth service",
    link: { href: "/access/members", label: "Review members" }, read: false,
  },
  {
    id: "n_002",
    at: "2026-05-28T06:15:00Z",
    title: "Failed payment retried",
    message: "Subscription INV-30421 (Northwind Co.) failed retry #3. Auto-dunning will pause renewals in 24h.",
    category: "billing", severity: "warning", actor: "Billing engine",
    link: { href: "/payments", label: "Open invoice" }, read: false,
  },
  {
    id: "n_003",
    at: "2026-05-27T18:02:00Z",
    title: "Weekly usage report ready",
    message: "Your weekly usage digest for May 19–25 has been generated. 12.4M tokens consumed, +18% WoW.",
    category: "report", severity: "info", actor: "Reports",
    link: { href: "/reports", label: "View report" }, read: false,
  },
  {
    id: "n_004",
    at: "2026-05-27T14:28:00Z",
    title: "New member joined",
    message: "Hannah Weiss accepted the invitation and signed in for the first time.",
    category: "member", severity: "success", actor: "Priya Raman",
    link: { href: "/access/members", label: "Open profile" }, read: true,
  },
  {
    id: "n_005",
    at: "2026-05-27T09:11:00Z",
    title: "Background job slowdown",
    message: "Embedding refresh job p95 latency exceeded 8s for 12 minutes. Auto-scaled to 4 workers.",
    category: "system", severity: "warning", actor: "Workers", read: true,
  },
  {
    id: "n_006",
    at: "2026-05-26T22:40:00Z",
    title: "Role permissions updated",
    message: "Operations Lead granted ‘Issue refunds’ to Billing Manager role.",
    category: "security", severity: "info", actor: "Operations Lead",
    link: { href: "/access/roles", label: "View role" }, read: true,
  },
  {
    id: "n_007",
    at: "2026-05-26T17:05:00Z",
    title: "Monthly revenue milestone",
    message: "May MRR crossed $1.2M (+9.4% MoM). Top-up plans drove 38% of new revenue.",
    category: "report", severity: "success", actor: "Reports",
    link: { href: "/reports", label: "Open revenue report" }, read: true,
  },
  {
    id: "n_008",
    at: "2026-05-25T11:58:00Z",
    title: "SSL certificate renewal scheduled",
    message: "api.orbit.ai certificate auto-renews on Jun 14, 2026. No action required.",
    category: "system", severity: "info", actor: "Platform", read: true,
  },
];

/* ---------- system logs ---------- */

export type LogSource = "auth" | "api" | "billing" | "worker" | "deploy" | "access" | "webhook" | "agent";
export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

export type LogEntry = {
  id: string;
  at: string;
  source: LogSource;
  level: LogLevel;
  actor?: string;
  message: string;
  ip?: string;
  requestId?: string;
  durationMs?: number;
  statusCode?: number;
  meta?: Record<string, string | number>;
};

const SAMPLE_ACTORS = ["Operations Lead", "Priya Raman", "Marcus Chen", "Sofia Almeida", "Liam Patel", "system", "scheduler", "deploy-bot"];
const SAMPLE_IPS = ["10.42.18.7", "10.42.18.22", "10.42.19.4", "10.42.20.3", "10.42.21.11"];

const TEMPLATES: { source: LogSource; level: LogLevel; msg: (rng: () => number) => string; status?: number; duration?: () => number }[] = [
  { source: "auth", level: "info", msg: () => "User signed in via SSO", status: 200, duration: () => 80 + Math.floor(Math.random() * 200) },
  { source: "auth", level: "warn", msg: () => "Sign-in throttled (3/3 attempts)", status: 429 },
  { source: "auth", level: "critical", msg: () => "MFA challenge failed from unrecognized device", status: 401 },
  { source: "api", level: "info", msg: () => "GET /api/users?page=2 200", status: 200, duration: () => 30 + Math.floor(Math.random() * 90) },
  { source: "api", level: "info", msg: () => "POST /api/agents 201", status: 201, duration: () => 60 + Math.floor(Math.random() * 240) },
  { source: "api", level: "warn", msg: () => "Rate limit nearing for tenant_42", status: 200 },
  { source: "api", level: "error", msg: () => "PUT /api/widgets/9182 500 — payload validation failed", status: 500, duration: () => 12 },
  { source: "billing", level: "info", msg: () => "Invoice INV-30421 generated for Northwind Co.", status: 201 },
  { source: "billing", level: "error", msg: () => "Stripe webhook signature mismatch", status: 400 },
  { source: "billing", level: "warn", msg: () => "Refund queued — manual review required", status: 202 },
  { source: "worker", level: "info", msg: () => "Embedding refresh job finished (4,812 docs)" },
  { source: "worker", level: "warn", msg: () => "Job latency exceeded SLO — auto-scaled to 4 workers" },
  { source: "deploy", level: "info", msg: () => "Deployment v2026.05.28-rc1 promoted to production" },
  { source: "deploy", level: "critical", msg: () => "Canary rollout aborted — error rate spiked 4.2%" },
  { source: "access", level: "info", msg: () => "Role permissions updated" },
  { source: "access", level: "warn", msg: () => "Member account disabled" },
  { source: "webhook", level: "info", msg: () => "Webhook delivered to https://hooks.partner.io/orbit (200)", status: 200 },
  { source: "webhook", level: "error", msg: () => "Webhook delivery failed after 5 retries (timeout)", status: 504 },
  { source: "agent", level: "info", msg: () => "Agent ‘Trip Adviser’ published new prompt version" },
  { source: "agent", level: "warn", msg: () => "Agent ‘Job Search’ exceeded token budget for tenant_18" },
];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateLogs(count = 80, referenceDate: Date = new Date()): LogEntry[] {
  const rng = mulberry32(20260528);
  const out: LogEntry[] = [];
  let cursor = referenceDate.getTime();
  for (let i = 0; i < count; i++) {
    cursor -= Math.floor(rng() * 30 * 60_000) + 60_000; // step back 1–30 min
    const tpl = TEMPLATES[Math.floor(rng() * TEMPLATES.length)];
    const id = `log_${i.toString().padStart(4, "0")}`;
    const reqId = `req_${Math.random().toString(36).slice(2, 10)}`;
    out.push({
      id,
      at: new Date(cursor).toISOString(),
      source: tpl.source,
      level: tpl.level,
      actor: SAMPLE_ACTORS[Math.floor(rng() * SAMPLE_ACTORS.length)],
      ip: SAMPLE_IPS[Math.floor(rng() * SAMPLE_IPS.length)],
      requestId: reqId,
      message: tpl.msg(rng),
      statusCode: tpl.status,
      durationMs: tpl.duration ? tpl.duration() : undefined,
    });
  }
  return out;
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
}

/* ---------- user health ---------- */

export type UserHealthStatus = "healthy" | "degraded" | "blocked";
export type IssueKind = "slow_response" | "error_rate" | "auth_failure" | "rate_limited" | "agent_failure" | "complaint";

export type UserIssue = {
  id: string;
  kind: IssueKind;
  severity: "low" | "medium" | "high";
  detail: string;
  detectedAt: string;
};

export type UserHealth = {
  userId: string;
  name: string;
  email: string;
  plan: "Free" | "Pro" | "Business" | "Enterprise";
  workspace: string;
  region: string;
  status: UserHealthStatus;
  avgResponseMs: number;
  p95ResponseMs: number;
  baselineMs: number;
  errorRate: number; // 0..1
  sessions24h: number;
  lastActiveAt: string;
  issues: UserIssue[];
};

export const SEED_USER_HEALTH: UserHealth[] = [
  {
    userId: "u_4821", name: "Aarav Sharma", email: "aarav@northwind.co",
    plan: "Enterprise", workspace: "Northwind", region: "Mumbai, IN",
    status: "blocked", avgResponseMs: 9420, p95ResponseMs: 14800, baselineMs: 1200, errorRate: 0.22, sessions24h: 14,
    lastActiveAt: "2026-05-28T07:48:00Z",
    issues: [
      { id: "iss_001", kind: "slow_response", severity: "high", detail: "p95 response 14.8s (12× baseline) on /agents/trip-adviser", detectedAt: "2026-05-28T07:30:00Z" },
      { id: "iss_002", kind: "error_rate", severity: "high", detail: "22% of requests returning 5xx in last 30m", detectedAt: "2026-05-28T07:18:00Z" },
      { id: "iss_003", kind: "complaint", severity: "medium", detail: "Submitted 2 in-app feedbacks: \u201CChatbot keeps spinning.\u201D", detectedAt: "2026-05-28T07:10:00Z" },
    ],
  },
  {
    userId: "u_3309", name: "Beatriz Costa", email: "beatriz@lumiere.fr",
    plan: "Business", workspace: "Lumi\u00e8re", region: "Paris, FR",
    status: "degraded", avgResponseMs: 3120, p95ResponseMs: 5800, baselineMs: 900, errorRate: 0.06, sessions24h: 8,
    lastActiveAt: "2026-05-28T07:42:00Z",
    issues: [
      { id: "iss_004", kind: "slow_response", severity: "medium", detail: "Avg response 3.1s (3.5\u00d7 baseline) on Job Search agent", detectedAt: "2026-05-28T07:05:00Z" },
      { id: "iss_005", kind: "rate_limited", severity: "low", detail: "Hit rate limit twice in last hour", detectedAt: "2026-05-28T07:30:00Z" },
    ],
  },
  {
    userId: "u_7712", name: "Chen Wei", email: "chen.wei@globex.cn",
    plan: "Pro", workspace: "Globex", region: "Shanghai, CN",
    status: "degraded", avgResponseMs: 2540, p95ResponseMs: 4900, baselineMs: 1100, errorRate: 0.03, sessions24h: 4,
    lastActiveAt: "2026-05-28T06:58:00Z",
    issues: [
      { id: "iss_006", kind: "auth_failure", severity: "medium", detail: "5 failed SSO attempts in 10m", detectedAt: "2026-05-28T06:50:00Z" },
    ],
  },
  {
    userId: "u_5544", name: "Dilnoza Karimova", email: "dilnoza@helix.uz",
    plan: "Pro", workspace: "Helix", region: "Tashkent, UZ",
    status: "degraded", avgResponseMs: 2890, p95ResponseMs: 4300, baselineMs: 1300, errorRate: 0.04, sessions24h: 6,
    lastActiveAt: "2026-05-28T07:11:00Z",
    issues: [
      { id: "iss_007", kind: "agent_failure", severity: "medium", detail: "Study Helper agent returned empty response 3 times", detectedAt: "2026-05-28T06:42:00Z" },
    ],
  },
  {
    userId: "u_2210", name: "Elena Vasquez", email: "elena@acmecorp.io",
    plan: "Business", workspace: "AcmeCorp", region: "Madrid, ES",
    status: "healthy", avgResponseMs: 980, p95ResponseMs: 1450, baselineMs: 1000, errorRate: 0.002, sessions24h: 12,
    lastActiveAt: "2026-05-28T07:54:00Z",
    issues: [],
  },
  {
    userId: "u_9988", name: "Felipe Moreira", email: "felipe@orbital.br",
    plan: "Free", workspace: "Orbital", region: "S\u00e3o Paulo, BR",
    status: "healthy", avgResponseMs: 1280, p95ResponseMs: 1820, baselineMs: 1200, errorRate: 0.005, sessions24h: 3,
    lastActiveAt: "2026-05-28T07:33:00Z",
    issues: [],
  },
  {
    userId: "u_6601", name: "Greta Hansen", email: "greta@nordic.dk",
    plan: "Enterprise", workspace: "Nordic", region: "Copenhagen, DK",
    status: "healthy", avgResponseMs: 740, p95ResponseMs: 1180, baselineMs: 900, errorRate: 0.001, sessions24h: 9,
    lastActiveAt: "2026-05-28T07:21:00Z",
    issues: [],
  },
  {
    userId: "u_4477", name: "Hiroshi Tanaka", email: "hiroshi@kazoku.jp",
    plan: "Business", workspace: "Kazoku", region: "Tokyo, JP",
    status: "healthy", avgResponseMs: 880, p95ResponseMs: 1320, baselineMs: 950, errorRate: 0.004, sessions24h: 5,
    lastActiveAt: "2026-05-28T07:02:00Z",
    issues: [],
  },
];

export const ISSUE_LABELS: Record<IssueKind, string> = {
  slow_response: "Slow response",
  error_rate: "High error rate",
  auth_failure: "Auth failures",
  rate_limited: "Rate limited",
  agent_failure: "Agent failure",
  complaint: "User complaint",
};

