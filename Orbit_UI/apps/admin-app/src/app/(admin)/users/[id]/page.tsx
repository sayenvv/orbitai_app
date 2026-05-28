import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Globe, Calendar, Activity, CreditCard } from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { RequirePermission } from "@/components/auth-guard";
import { getPaymentsForUser, getUser } from "@/lib/data";
import { formatCurrency, formatDate, formatNumber, formatRelative, initials } from "@/lib/utils";

const STATUS_TONE = {
  active: "success",
  trial: "info",
  invited: "neutral",
  suspended: "danger",
} as const;

const PAYMENT_TONE = {
  succeeded: "success",
  pending: "warning",
  refunded: "neutral",
  failed: "danger",
} as const;

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = getUser(id);
  if (!user) notFound();

  const payments = getPaymentsForUser(user.id);

  return (
    <RequirePermission permission="users.view">
      <PageHeader
        title={user.name}
        description={user.email}
        actions={
          <Link
            href="/users"
            className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-[11.5px] font-medium hover:bg-accent/50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
        }
      />
      <PageBody className="space-y-5">
        {/* Profile header */}
        <div className="premium-card p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center text-lg font-bold text-white shadow-md ring-1 ring-border/40`}>
              {initials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold tracking-tight">{user.name}</h2>
                <Badge tone={STATUS_TONE[user.status]}>{user.status}</Badge>
                <Badge tone="violet">{user.plan}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {user.email}</span>
                <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> {user.country}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Joined {formatDate(user.registeredAt)}</span>
                <span className="inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Active {formatRelative(user.lastActiveAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="premium-card p-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Conversations</p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(user.totalConversations)}</p>
          </div>
          <div className="premium-card p-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total spend</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(user.totalSpend)}</p>
          </div>
          <div className="premium-card p-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Payments</p>
            <p className="mt-2 text-2xl font-semibold">{payments.length}</p>
          </div>
        </div>

        {/* Payment history */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              Payment history
            </h3>
            <Link href="/payments" className="text-[11px] font-medium text-primary hover:underline">All payments</Link>
          </div>
          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No payments recorded for this user yet.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2">Date</th>
                    <th className="text-left font-semibold px-3 py-2">Description</th>
                    <th className="text-left font-semibold px-3 py-2">Method</th>
                    <th className="text-right font-semibold px-3 py-2">Amount</th>
                    <th className="text-left font-semibold px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-accent/30 transition-colors">
                      <td className="px-3 py-2.5 text-muted-foreground">{formatDate(p.createdAt)}</td>
                      <td className="px-3 py-2.5">{p.description}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {p.method}{p.cardLast4 ? ` •••• ${p.cardLast4}` : ""}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">
                        {formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="px-3 py-2.5"><Badge tone={PAYMENT_TONE[p.status]}>{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageBody>
    </RequirePermission>
  );
}
