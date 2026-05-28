import { Download, CreditCard, CircleDollarSign, RotateCcw, XCircle } from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";
import { PaymentsTable } from "@/components/tables/payments-table";
import { RequirePermission, Can } from "@/components/auth-guard";
import { getPayments } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default function PaymentsPage() {
  const payments = getPayments();

  const succeeded = payments.filter((p) => p.status === "succeeded");
  const pending = payments.filter((p) => p.status === "pending");
  const refunded = payments.filter((p) => p.status === "refunded");
  const failed = payments.filter((p) => p.status === "failed");

  const gross = succeeded.reduce((sum, p) => sum + p.amount, 0);
  const refundedAmt = refunded.reduce((sum, p) => sum + p.amount, 0);

  return (
    <RequirePermission permission="payments.view">
      <PageHeader
        title="Payments"
        description="Complete payment history across customers and plans."
        actions={
          <Can permission="payments.export">
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </Can>
        }
      />
      <PageBody className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Gross revenue" value={formatCurrency(gross)} delta={9.4} hint="successful" icon={CircleDollarSign} tone="success" />
          <StatCard label="Pending" value={String(pending.length)} hint="awaiting capture" icon={CreditCard} tone="warning" />
          <StatCard label="Refunded" value={formatCurrency(refundedAmt)} hint={`${refunded.length} refunds`} icon={RotateCcw} tone="violet" />
          <StatCard label="Failed" value={String(failed.length)} hint="needs review" icon={XCircle} tone="primary" />
        </div>

        <PaymentsTable payments={payments} />
      </PageBody>
    </RequirePermission>
  );
}
