import {
  Users,
  CreditCard,
  Sparkles,
  MessagesSquare,
  TrendingUp,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { RequirePermission } from "@/components/auth-guard";
import { getActivity, getDashboardMetrics, getPayments, getSubscriptions } from "@/lib/data";
import { formatCurrency, formatNumber, formatRelative, initials } from "@/lib/utils";
import Link from "next/link";

const ACTIVITY_TONE = {
  signup: "info",
  login: "neutral",
  payment: "success",
  subscription: "violet",
  support: "warning",
  security: "danger",
} as const;

export default function DashboardPage() {
  const m = getDashboardMetrics();
  const payments = getPayments().slice(0, 5);
  const subs = getSubscriptions().filter((s) => s.status === "active").slice(0, 4);
  const events = getActivity().slice(0, 6);

  return (
    <RequirePermission permission="dashboard.view">
      <PageHeader
        title="Dashboard"
        description="A live snapshot of users, revenue and platform activity."
        actions={
          <Link
            href="/users"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            Manage users
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <PageBody className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Users"
            value={formatNumber(m.totalUsers)}
            delta={12.4}
            hint="vs. last month"
            icon={Users}
            tone="primary"
          />
          <StatCard
            label="Monthly Recurring"
            value={formatCurrency(m.mrr)}
            delta={8.2}
            hint="MRR"
            icon={TrendingUp}
            tone="success"
          />
          <StatCard
            label="Revenue (30d)"
            value={formatCurrency(m.revenue)}
            delta={-2.1}
            hint="processed"
            icon={CreditCard}
            tone="violet"
          />
          <StatCard
            label="Conversations"
            value={formatNumber(m.conversations)}
            delta={24.6}
            hint={`${formatNumber(m.messages)} messages`}
            icon={MessagesSquare}
            tone="warning"
          />
        </div>

        {/* Two-column: payments + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="premium-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold">Recent payments</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Latest transactions across all plans.</p>
              </div>
              <Link href="/payments" className="text-[11px] font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2">Customer</th>
                    <th className="text-left font-semibold px-3 py-2">Description</th>
                    <th className="text-right font-semibold px-3 py-2">Amount</th>
                    <th className="text-left font-semibold px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-accent/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-chart-4/30 flex items-center justify-center text-[10px] font-semibold text-primary ring-1 ring-border/60">
                            {initials(p.userName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.userName}</p>
                            <p className="text-[10.5px] text-muted-foreground truncate">{p.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.description}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">
                        {formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          tone={
                            p.status === "succeeded"
                              ? "success"
                              : p.status === "pending"
                              ? "warning"
                              : p.status === "refunded"
                              ? "neutral"
                              : "danger"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="premium-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold">Activity</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Latest events</p>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_15%,transparent)]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate">{e.actor}</span>
                      <Badge tone={ACTIVITY_TONE[e.type]}>{e.type}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{e.message}</p>
                    <p className="text-[10.5px] text-muted-foreground/70 mt-0.5">{formatRelative(e.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Active subscriptions */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Top active subscriptions
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ranked by MRR contribution.</p>
            </div>
            <Link href="/subscriptions" className="text-[11px] font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {subs.map((s) => (
              <div key={s.id} className="rounded-xl border bg-background/40 p-4 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <Badge tone="violet">{s.plan}</Badge>
                  <span className="text-[10.5px] text-muted-foreground">{s.seats} seats</span>
                </div>
                <p className="mt-3 text-sm font-semibold truncate">{s.userName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{s.userEmail}</p>
                <p className="mt-3 text-lg font-semibold">{formatCurrency(s.mrr)}<span className="text-[10.5px] font-normal text-muted-foreground">/mo</span></p>
              </div>
            ))}
          </div>
        </div>
      </PageBody>
    </RequirePermission>
  );
}
