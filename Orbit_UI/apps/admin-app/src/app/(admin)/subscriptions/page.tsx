import { Sparkles, TrendingUp, UserCheck, AlertTriangle } from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";
import { SubscriptionsTable } from "@/components/tables/subscriptions-table";
import { RequirePermission } from "@/components/auth-guard";
import { getSubscriptions } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default function SubscriptionsPage() {
  const subs = getSubscriptions();
  const active = subs.filter((s) => s.status === "active");
  const trialing = subs.filter((s) => s.status === "trialing");
  const pastDue = subs.filter((s) => s.status === "past_due");
  const mrr = subs
    .filter((s) => s.status === "active" || s.status === "trialing")
    .reduce((sum, s) => sum + s.mrr, 0);

  return (
    <RequirePermission permission="subscriptions.view">
      <PageHeader
        title="Subscriptions"
        description="Plan distribution, renewals and lifecycle states."
      />
      <PageBody className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="MRR" value={formatCurrency(mrr)} delta={6.7} hint="recurring monthly" icon={TrendingUp} tone="success" />
          <StatCard label="Active" value={String(active.length)} hint="paid plans" icon={UserCheck} tone="primary" />
          <StatCard label="Trialing" value={String(trialing.length)} hint="conversion pending" icon={Sparkles} tone="violet" />
          <StatCard label="Past due" value={String(pastDue.length)} hint="needs attention" icon={AlertTriangle} tone="warning" />
        </div>

        <SubscriptionsTable subscriptions={subs} />
      </PageBody>
    </RequirePermission>
  );
}
