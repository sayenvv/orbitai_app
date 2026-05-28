"use client";

import { useMemo, useState } from "react";
import {
  FileBarChart,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users as UsersIcon,
  MessagesSquare,
  ShieldCheck,
  Calendar,
  Activity,
  Star,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { RequirePermission } from "@/components/auth-guard";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger" | "violet";

type ReportKpi = {
  label: string;
  value: string;
  delta: number; // % change
};

type Report = {
  id: string;
  title: string;
  description: string;
  category: "usage" | "revenue" | "members" | "security";
  icon: typeof FileBarChart;
  tone: Tone;
  cadence: string;
  lastGenerated: string;
  kpis: ReportKpi[];
  series: number[]; // 12 points
};

const REPORTS: Report[] = [
  {
    id: "usage",
    title: "Platform usage",
    description: "Tokens, requests, and active workspaces over time.",
    category: "usage",
    icon: Activity,
    tone: "info",
    cadence: "Weekly",
    lastGenerated: "2026-05-27T18:02:00Z",
    kpis: [
      { label: "Tokens (7d)", value: `${formatNumber(12_400_000)}`, delta: 18.2 },
      { label: "Requests", value: formatNumber(486_201), delta: 11.4 },
      { label: "Active workspaces", value: formatNumber(842), delta: 3.1 },
    ],
    series: [38, 42, 41, 47, 53, 49, 58, 64, 61, 70, 78, 84],
  },
  {
    id: "revenue",
    title: "Revenue & MRR",
    description: "Monthly recurring revenue, expansion and churn.",
    category: "revenue",
    icon: DollarSign,
    tone: "success",
    cadence: "Monthly",
    lastGenerated: "2026-05-26T17:05:00Z",
    kpis: [
      { label: "MRR", value: formatCurrency(1_204_500), delta: 9.4 },
      { label: "New revenue", value: formatCurrency(148_200), delta: 22.6 },
      { label: "Net churn", value: "1.8%", delta: -0.4 },
    ],
    series: [82, 84, 86, 91, 95, 98, 101, 104, 108, 112, 116, 120],
  },
  {
    id: "members",
    title: "Team & engagement",
    description: "Member activity, session length, and feature adoption.",
    category: "members",
    icon: UsersIcon,
    tone: "violet",
    cadence: "Weekly",
    lastGenerated: "2026-05-27T09:00:00Z",
    kpis: [
      { label: "Active admins", value: "12 / 14", delta: 7.1 },
      { label: "Avg session", value: "47m", delta: 4.8 },
      { label: "Feature adoption", value: "71%", delta: 6.2 },
    ],
    series: [55, 58, 60, 59, 62, 66, 65, 68, 70, 72, 74, 76],
  },
  {
    id: "support",
    title: "Conversations & CSAT",
    description: "Conversation volume, resolution time, and CSAT trend.",
    category: "usage",
    icon: MessagesSquare,
    tone: "warning",
    cadence: "Daily",
    lastGenerated: "2026-05-28T07:30:00Z",
    kpis: [
      { label: "Conversations", value: formatNumber(3_812), delta: 5.6 },
      { label: "Avg resolution", value: "4m 12s", delta: -8.3 },
      { label: "CSAT", value: "4.6 / 5", delta: 1.2 },
    ],
    series: [60, 62, 61, 65, 70, 68, 72, 75, 73, 78, 76, 80],
  },
  {
    id: "security",
    title: "Security & access",
    description: "Sign-ins, MFA coverage, and access-control changes.",
    category: "security",
    icon: ShieldCheck,
    tone: "danger",
    cadence: "Weekly",
    lastGenerated: "2026-05-26T22:40:00Z",
    kpis: [
      { label: "Sign-ins (7d)", value: formatNumber(1_204), delta: 2.1 },
      { label: "MFA coverage", value: "92%", delta: 3.0 },
      { label: "Access changes", value: "18", delta: 12.5 },
    ],
    series: [40, 41, 43, 42, 45, 44, 46, 48, 47, 50, 52, 51],
  },
  {
    id: "agents",
    title: "Agents & widgets",
    description: "Top-performing agents, widget impressions, and clickthrough.",
    category: "usage",
    icon: Star,
    tone: "violet",
    cadence: "Weekly",
    lastGenerated: "2026-05-25T08:00:00Z",
    kpis: [
      { label: "Active agents", value: "8", delta: 14.2 },
      { label: "Widget views", value: formatNumber(184_201), delta: 16.8 },
      { label: "CTR", value: "12.4%", delta: 1.9 },
    ],
    series: [30, 33, 36, 40, 45, 48, 52, 56, 60, 63, 68, 72],
  },
];

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
];

const CATEGORY_FILTERS = [
  { value: "all", label: "All reports" },
  { value: "usage", label: "Usage" },
  { value: "revenue", label: "Revenue" },
  { value: "members", label: "Team" },
  { value: "security", label: "Security" },
];

export default function ReportsPage() {
  return (
    <RequirePermission permission="reports.view">
      <ReportsInner />
    </RequirePermission>
  );
}

function ReportsInner() {
  const [range, setRange] = useState("30d");
  const [category, setCategory] = useState<"all" | Report["category"]>("all");

  const filtered = useMemo(() => REPORTS.filter((r) => category === "all" || r.category === category), [category]);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Pre-built dashboards for usage, revenue, team engagement and security."
        actions={
          <div className="flex items-center gap-2">
            <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg border bg-background px-3 py-1.5 text-xs">
              {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value as "all" | Report["category"])} className="rounded-lg border bg-background px-3 py-1.5 text-xs">
              {CATEGORY_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        }
      />
      <PageBody className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((r) => <ReportCard key={r.id} report={r} />)}
        </div>
      </PageBody>
    </>
  );
}

function ReportCard({ report }: { report: Report }) {
  const Icon = report.icon;
  const toneBg: Record<Tone, string> = {
    info: "from-info/15 to-info/5 text-info",
    success: "from-success/15 to-success/5 text-[color:var(--success)]",
    warning: "from-warning/15 to-warning/5 text-[color:var(--warning)]",
    danger: "from-destructive/15 to-destructive/5 text-destructive",
    violet: "from-chart-4/15 to-chart-4/5 text-chart-4",
  };
  const lastDate = new Date(report.lastGenerated);

  return (
    <div className="premium-card p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${toneBg[report.tone]} flex items-center justify-center ring-1 ring-border/40 shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight truncate">{report.title}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{report.description}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge tone="neutral">{report.cadence}</Badge>
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" />
                Generated {lastDate.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
            </div>
          </div>
        </div>
        <button className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent shrink-0">
          <Download className="h-3 w-3" />
          Export
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {report.kpis.map((k) => {
          const positive = k.delta >= 0;
          return (
            <div key={k.label} className="rounded-lg border bg-background/60 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <p className="text-sm font-semibold tabular-nums truncate mt-0.5">{k.value}</p>
              <p className={`text-[10.5px] font-medium inline-flex items-center gap-0.5 mt-0.5 ${positive ? "text-[color:var(--success)]" : "text-destructive"}`}>
                {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {Math.abs(k.delta).toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>

      {/* Sparkline */}
      <Sparkline values={report.series} tone={report.tone} />
    </div>
  );
}

function Sparkline({ values, tone }: { values: number[]; tone: Tone }) {
  const w = 520;
  const h = 56;
  const pad = 4;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const stepX = (w - pad * 2) / (values.length - 1);
  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${h - pad} L ${points[0][0].toFixed(1)} ${h - pad} Z`;
  const stroke: Record<Tone, string> = {
    info: "oklch(0.65 0.18 250)",
    success: "oklch(0.7 0.18 150)",
    warning: "oklch(0.75 0.18 80)",
    danger: "oklch(0.65 0.22 25)",
    violet: "oklch(0.65 0.22 300)",
  };
  return (
    <div className="rounded-lg border bg-muted/20 p-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14">
        <path d={areaPath} fill={stroke[tone]} fillOpacity={0.15} />
        <path d={linePath} stroke={stroke[tone]} strokeWidth={1.75} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.5} fill={stroke[tone]} opacity={i === points.length - 1 ? 1 : 0.4} />
        ))}
      </svg>
    </div>
  );
}
