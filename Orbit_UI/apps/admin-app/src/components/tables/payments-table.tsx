"use client";

import { DataTable, type Column, type FilterDef } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { Payment } from "@/types";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

const PAYMENT_TONE = {
  succeeded: "success",
  pending: "warning",
  refunded: "neutral",
  failed: "danger",
} as const;

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  const columns: Column<Payment>[] = [
    {
      key: "id",
      header: "Reference",
      sortValue: (p) => p.id,
      cell: (p) => <span className="font-mono text-[11px] text-muted-foreground">{p.id}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      sortValue: (p) => p.userName.toLowerCase(),
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-chart-4/30 flex items-center justify-center text-[10px] font-semibold text-primary ring-1 ring-border/60">
            {initials(p.userName)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{p.userName}</p>
            <p className="text-[10.5px] text-muted-foreground truncate">{p.userEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      sortValue: (p) => p.description,
      cell: (p) => <span className="text-muted-foreground">{p.description}</span>,
    },
    {
      key: "method",
      header: "Method",
      sortValue: (p) => p.method,
      cell: (p) => (
        <span className="text-muted-foreground">
          {p.method}
          {p.cardLast4 ? ` •••• ${p.cardLast4}` : ""}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortValue: (p) => p.amount,
      cell: (p) => (
        <span className="font-mono font-semibold">{formatCurrency(p.amount, p.currency)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (p) => p.status,
      cell: (p) => <Badge tone={PAYMENT_TONE[p.status]}>{p.status}</Badge>,
    },
    {
      key: "date",
      header: "Date",
      sortValue: (p) => new Date(p.createdAt).getTime(),
      cell: (p) => <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>,
    },
  ];

  const filters: FilterDef<Payment>[] = [
    {
      key: "status",
      label: "Status",
      accessor: (p) => p.status,
      options: [
        { value: "succeeded", label: "Succeeded" },
        { value: "pending", label: "Pending" },
        { value: "refunded", label: "Refunded" },
        { value: "failed", label: "Failed" },
      ],
    },
    {
      key: "method",
      label: "Method",
      accessor: (p) => p.method,
      options: [
        { value: "card", label: "Card" },
        { value: "paypal", label: "PayPal" },
        { value: "bank", label: "Bank" },
        { value: "apple_pay", label: "Apple Pay" },
      ],
    },
    {
      key: "currency",
      label: "Currency",
      accessor: (p) => p.currency,
      options: [
        { value: "USD", label: "USD" },
        { value: "EUR", label: "EUR" },
      ],
    },
  ];

  return (
    <DataTable
      data={payments}
      columns={columns}
      filters={filters}
      searchAccessor={(p) => `${p.id} ${p.userName} ${p.userEmail} ${p.description}`}
      searchPlaceholder="Search by reference, customer, description..."
      rowKey={(p) => p.id}
      pageSize={10}
      initialSort={{ key: "date", direction: "desc" }}
    />
  );
}
