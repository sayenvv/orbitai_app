"use client";

import { DataTable, type Column, type FilterDef } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { Subscription } from "@/types";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

const STATUS_TONE = {
  active: "success",
  trialing: "info",
  past_due: "warning",
  canceled: "neutral",
} as const;

const PLAN_TONE = {
  free: "neutral",
  starter: "info",
  pro: "violet",
  enterprise: "warning",
} as const;

export function SubscriptionsTable({ subscriptions }: { subscriptions: Subscription[] }) {
  const columns: Column<Subscription>[] = [
    {
      key: "customer",
      header: "Customer",
      sortValue: (s) => s.userName.toLowerCase(),
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-chart-4/30 flex items-center justify-center text-[10px] font-semibold text-primary ring-1 ring-border/60">
            {initials(s.userName)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{s.userName}</p>
            <p className="text-[10.5px] text-muted-foreground truncate">{s.userEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      sortValue: (s) => s.plan,
      cell: (s) => <Badge tone={PLAN_TONE[s.plan]}>{s.plan}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (s) => s.status,
      cell: (s) => <Badge tone={STATUS_TONE[s.status]}>{s.status.replace("_", " ")}</Badge>,
    },
    {
      key: "seats",
      header: "Seats",
      align: "right",
      sortValue: (s) => s.seats,
      cell: (s) => <span className="font-mono">{s.seats}</span>,
    },
    {
      key: "mrr",
      header: "MRR",
      align: "right",
      sortValue: (s) => s.mrr,
      cell: (s) => <span className="font-mono font-semibold">{formatCurrency(s.mrr)}</span>,
    },
    {
      key: "started",
      header: "Started",
      sortValue: (s) => new Date(s.startedAt).getTime(),
      cell: (s) => <span className="text-muted-foreground">{formatDate(s.startedAt)}</span>,
    },
    {
      key: "renews",
      header: "Renews",
      sortValue: (s) => new Date(s.renewsAt).getTime(),
      cell: (s) => <span className="text-muted-foreground">{formatDate(s.renewsAt)}</span>,
    },
  ];

  const filters: FilterDef<Subscription>[] = [
    {
      key: "status",
      label: "Status",
      accessor: (s) => s.status,
      options: [
        { value: "active", label: "Active" },
        { value: "trialing", label: "Trialing" },
        { value: "past_due", label: "Past due" },
        { value: "canceled", label: "Canceled" },
      ],
    },
    {
      key: "plan",
      label: "Plan",
      accessor: (s) => s.plan,
      options: [
        { value: "starter", label: "Starter" },
        { value: "pro", label: "Pro" },
        { value: "enterprise", label: "Enterprise" },
      ],
    },
  ];

  return (
    <DataTable
      data={subscriptions}
      columns={columns}
      filters={filters}
      searchAccessor={(s) => `${s.userName} ${s.userEmail} ${s.plan}`}
      searchPlaceholder="Search subscriptions..."
      rowKey={(s) => s.id}
      pageSize={10}
      initialSort={{ key: "mrr", direction: "desc" }}
    />
  );
}
