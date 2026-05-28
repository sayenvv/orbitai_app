"use client";

import Link from "next/link";
import { DataTable, type Column, type FilterDef } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { AdminUser } from "@/types";
import { formatCurrency, formatDate, formatNumber, formatRelative, initials } from "@/lib/utils";

const STATUS_TONE = {
  active: "success",
  trial: "info",
  invited: "neutral",
  suspended: "danger",
} as const;

const PLAN_TONE = {
  free: "neutral",
  starter: "info",
  pro: "violet",
  enterprise: "warning",
} as const;

export function UsersTable({ users }: { users: AdminUser[] }) {
  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: "User",
      sortValue: (u) => u.name.toLowerCase(),
      cell: (u) => (
        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-full bg-gradient-to-br ${u.avatarColor} flex items-center justify-center text-[11px] font-bold text-white shadow-sm ring-1 ring-border/40`}
          >
            {initials(u.name)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{u.name}</p>
            <p className="text-[10.5px] text-muted-foreground truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (u) => u.status,
      cell: (u) => <Badge tone={STATUS_TONE[u.status]}>{u.status}</Badge>,
    },
    {
      key: "plan",
      header: "Plan",
      sortValue: (u) => u.plan,
      cell: (u) => <Badge tone={PLAN_TONE[u.plan]}>{u.plan}</Badge>,
    },
    {
      key: "country",
      header: "Country",
      sortValue: (u) => u.country,
      cell: (u) => <span className="text-muted-foreground">{u.country}</span>,
    },
    {
      key: "conversations",
      header: "Conversations",
      align: "right",
      sortValue: (u) => u.totalConversations,
      cell: (u) => <span className="font-mono">{formatNumber(u.totalConversations)}</span>,
    },
    {
      key: "spend",
      header: "Total spend",
      align: "right",
      sortValue: (u) => u.totalSpend,
      cell: (u) => <span className="font-mono font-semibold">{formatCurrency(u.totalSpend)}</span>,
    },
    {
      key: "joined",
      header: "Joined",
      sortValue: (u) => new Date(u.registeredAt).getTime(),
      cell: (u) => <span className="text-muted-foreground">{formatDate(u.registeredAt)}</span>,
    },
    {
      key: "active",
      header: "Last active",
      sortValue: (u) => new Date(u.lastActiveAt).getTime(),
      cell: (u) => <span className="text-muted-foreground">{formatRelative(u.lastActiveAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (u) => (
        <Link
          href={`/users/${u.id}`}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          View
        </Link>
      ),
    },
  ];

  const filters: FilterDef<AdminUser>[] = [
    {
      key: "status",
      label: "Status",
      accessor: (u) => u.status,
      options: [
        { value: "active", label: "Active" },
        { value: "trial", label: "Trial" },
        { value: "invited", label: "Invited" },
        { value: "suspended", label: "Suspended" },
      ],
    },
    {
      key: "plan",
      label: "Plan",
      accessor: (u) => u.plan,
      options: [
        { value: "free", label: "Free" },
        { value: "starter", label: "Starter" },
        { value: "pro", label: "Pro" },
        { value: "enterprise", label: "Enterprise" },
      ],
    },
  ];

  return (
    <DataTable
      data={users}
      columns={columns}
      filters={filters}
      searchAccessor={(u) => `${u.name} ${u.email} ${u.country}`}
      searchPlaceholder="Search users, emails, country..."
      rowKey={(u) => u.id}
      pageSize={10}
      initialSort={{ key: "active", direction: "desc" }}
    />
  );
}
