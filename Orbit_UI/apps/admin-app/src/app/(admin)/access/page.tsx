"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Users,
  KeyRound,
  History,
  ArrowUpRight,
  Lock,
  UserCheck,
  UserCog,
  Sparkles,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { useTeamStore, usePermissions } from "@/store/team-store";
import { formatRelative } from "@/lib/utils";

const ACTION_TEXT: Record<string, (target: string) => string> = {
  role_changed: (t) => `changed ${t}'s role`,
  member_created: (t) => `created member ${t}`,
  member_invited: (t) => `invited ${t}`,
  member_suspended: (t) => `disabled ${t}`,
  member_reactivated: (t) => `reactivated ${t}`,
  member_removed: (t) => `removed ${t}`,
  role_created: (t) => `created role ${t}`,
  role_updated: (t) => `updated role ${t}`,
  role_permissions_changed: (t) => `updated permissions on ${t}`,
  role_deleted: (t) => `deleted role ${t}`,
  role_disabled: (t) => `disabled role ${t}`,
  role_enabled: (t) => `enabled role ${t}`,
  permission_created: (t) => `created permission ${t}`,
  permission_updated: (t) => `renamed permission ${t}`,
  permission_disabled: (t) => `disabled permission ${t}`,
  permission_enabled: (t) => `enabled permission ${t}`,
  permission_deleted: (t) => `deleted permission ${t}`,
};

export default function AccessOverviewPage() {
  const members = useTeamStore((s) => s.members);
  const audit = useTeamStore((s) => s.audit);
  const roles = useTeamStore((s) => s.roles);
  const permissions = usePermissions();

  const active = members.filter((m) => m.status === "active").length;
  const invited = members.filter((m) => m.status === "invited").length;
  const suspended = members.filter((m) => m.status === "suspended").length;
  const customRoles = roles.filter((r) => !r.isBuiltIn).length;
  const disabledPerms = permissions.filter((p) => p.disabled).length;

  const distribution = roles
    .map((r) => ({ role: r, count: members.filter((m) => m.role === r.id).length }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <PageHeader
        title="Access control"
        description="Manage who can do what across the Orbit admin console."
      />
      <PageBody className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Team members" value={String(members.length)} hint={`${active} active · ${suspended} disabled`} icon={Users} tone="primary" />
          <StatCard label="Roles defined" value={String(roles.length)} hint={`${customRoles} custom`} icon={ShieldCheck} tone="violet" />
          <StatCard label="Permissions" value={String(permissions.length)} hint={`${disabledPerms} disabled`} icon={KeyRound} tone="success" />
          <StatCard label="Pending invites" value={String(invited)} hint="awaiting first login" icon={UserCog} tone="warning" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 premium-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold">Role distribution</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Members assigned to each role.</p>
              </div>
              <Link href="/access/members" className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1">
                Manage members <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {distribution.map(({ role, count }) => {
                const pct = members.length ? Math.round((count / members.length) * 100) : 0;
                return (
                  <div key={role.id}>
                    <div className="flex items-center justify-between text-[11.5px] mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone={role.tone}>{role.label}</Badge>
                        <span className="text-muted-foreground">{role.permissions.length} permissions</span>
                        {!role.isBuiltIn && (
                          <span className="text-[9px] font-medium text-primary px-1.5 py-0.5 rounded-full bg-primary/10">custom</span>
                        )}
                        {role.disabled && <Badge tone="danger">disabled</Badge>}
                      </div>
                      <span className="font-mono font-semibold">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-chart-4 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Recent activity
              </h2>
              <Link href="/access/audit" className="text-[11px] font-medium text-primary hover:underline">View all</Link>
            </div>
            {audit.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent changes.</p>
            ) : (
              <ul className="space-y-3">
                {audit.slice(0, 5).map((e) => (
                  <li key={e.id} className="text-[11.5px]">
                    <p className="font-medium leading-snug">
                      <span className="text-primary">{e.actor}</span>{" "}
                      <span className="text-muted-foreground">
                        {ACTION_TEXT[e.action]?.(e.targetName) ?? e.action}
                      </span>
                    </p>
                    {e.meta?.fromLabel && e.meta?.toLabel && (
                      <p className="text-[10.5px] text-muted-foreground mt-0.5">
                        {e.meta.fromLabel} → {e.meta.toLabel}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(e.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/access/roles" className="premium-card p-5 hover:scale-[1.01] transition-transform group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/60">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Create & edit roles</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Tune permissions per role</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
          <Link href="/access/permissions" className="premium-card p-5 hover:scale-[1.01] transition-transform group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/60">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Permissions catalog</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Add, rename, disable, delete</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
          <Link href="/access/members" className="premium-card p-5 hover:scale-[1.01] transition-transform group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/60">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Team members</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Invite, disable, reassign</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        </div>
      </PageBody>
    </>
  );
}
