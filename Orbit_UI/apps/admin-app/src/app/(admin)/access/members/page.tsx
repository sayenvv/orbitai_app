"use client";

import { useState, useMemo, useEffect } from "react";
import {
  UserPlus,
  Search,
  MoreVertical,
  ShieldCheck,
  Mail,
  Ban,
  RotateCcw,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Send,
  UserCheck,
  Loader2,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Can, useCanPerform } from "@/components/auth-guard";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import {
  useTeamStore,
  useRoles,
  useRoleDef,
  type MemberStatus,
} from "@/store/team-store";
import { useAuthStore } from "@/store/auth-store";
import type { Role } from "@/lib/rbac";
import { cn, formatRelative } from "@/lib/utils";

const STATUS_META: Record<MemberStatus, { label: string; tone: "success" | "warning" | "danger"; icon: typeof CheckCircle2 }> = {
  active: { label: "Active", tone: "success", icon: CheckCircle2 },
  invited: { label: "Invited", tone: "warning", icon: Clock },
  suspended: { label: "Suspended", tone: "danger", icon: XCircle },
};

export default function MembersPage() {
  const members = useTeamStore((s) => s.members);
  const roles = useRoles();
  const inviteMember = useTeamStore((s) => s.inviteMember);
  const createMember = useTeamStore((s) => s.createMember);
  const changeRole = useTeamStore((s) => s.changeRole);
  const suspendMember = useTeamStore((s) => s.suspendMember);
  const reactivateMember = useTeamStore((s) => s.reactivateMember);
  const removeMember = useTeamStore((s) => s.removeMember);
  const currentRole = useAuthStore((s) => s.role);
  const currentDef = useRoleDef(currentRole);
  const canManage = useCanPerform("access.manage");
  const actor = `${currentDef?.label ?? currentRole} (you)`;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  useEffect(() => {
    const onClick = () => setOpenMenu(null);
    if (openMenu) {
      document.addEventListener("click", onClick);
      return () => document.removeEventListener("click", onClick);
    }
  }, [openMenu]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [members, statusFilter, roleFilter, search]);

  const { visible: visibleMembers, sentinelRef: membersSentinelRef, hasMore: hasMoreMembers } = useInfiniteScroll(filtered, { step: 25 });

  const roleOf = (id: Role) => roles.find((r) => r.id === id);
  const assignableRoles = roles.filter((r) => !r.disabled);

  return (
    <>
      <PageHeader
        title="Team members"
        description={`${members.length} total · ${members.filter((m) => m.status === "active").length} active · ${members.filter((m) => m.status === "suspended").length} disabled.`}
        actions={
          <Can permission="access.manage">
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <UserPlus className="h-3.5 w-3.5" /> Add member
            </button>
          </Can>
        }
      />
      <PageBody className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-[11.5px] text-destructive flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-destructive">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MemberStatus | "all")}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="suspended">Disabled / Suspended</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs"
          >
            <option value="all">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.label}{r.disabled ? " (disabled)" : ""}</option>
            ))}
          </select>
        </div>

        <div className="premium-card overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Member</th>
                <th className="text-left font-semibold px-4 py-3">Role</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-left font-semibold px-4 py-3">Last active</th>
                <th className="text-left font-semibold px-4 py-3">Joined</th>
                <th className="text-right font-semibold px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((m) => {
                const status = STATUS_META[m.status];
                const StatusIcon = status.icon;
                const def = roleOf(m.role);
                return (
                  <tr key={m.id} className={cn("border-t hover:bg-accent/30 transition-colors", m.status === "suspended" && "opacity-70")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-[11px] font-bold shrink-0", m.avatarColor)}>
                          {m.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{m.name}</p>
                          <p className="text-[10.5px] text-muted-foreground truncate">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.id, e.target.value as Role, actor)}
                          className="rounded-md border bg-background px-2 py-1 text-[11px] font-medium"
                        >
                          {assignableRoles.map((r) => (
                            <option key={r.id} value={r.id}>{r.label}</option>
                          ))}
                          {def?.disabled && <option value={m.role}>{def.label} (disabled)</option>}
                        </select>
                      ) : (
                        <Badge tone={def?.tone ?? "neutral"}>{def?.label ?? m.role}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={status.tone}>
                        <StatusIcon className="h-3 w-3 mr-1 inline" />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatRelative(m.lastActiveAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatRelative(m.joinedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {canManage && (
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenu(openMenu === m.id ? null : m.id);
                            }}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent/50"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                          {openMenu === m.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-popover shadow-lg z-30 py-1"
                            >
                              {m.status === "suspended" ? (
                                <button
                                  onClick={() => { reactivateMember(m.id, actor); setOpenMenu(null); }}
                                  className="w-full text-left px-3 py-1.5 text-[11.5px] hover:bg-accent/50 inline-flex items-center gap-2"
                                >
                                  <RotateCcw className="h-3 w-3" /> Reactivate / Enable
                                </button>
                              ) : (
                                <button
                                  onClick={() => { suspendMember(m.id, actor); setOpenMenu(null); }}
                                  className="w-full text-left px-3 py-1.5 text-[11.5px] hover:bg-accent/50 inline-flex items-center gap-2"
                                >
                                  <Ban className="h-3 w-3" /> Disable / Suspend
                                </button>
                              )}
                              <button
                                onClick={() => { removeMember(m.id, actor); setOpenMenu(null); }}
                                className="w-full text-left px-3 py-1.5 text-[11.5px] text-destructive hover:bg-destructive/10 inline-flex items-center gap-2"
                              >
                                <Trash2 className="h-3 w-3" /> Remove permanently
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No members match your filters.
                  </td>
                </tr>
              )}
              {hasMoreMembers && (
                <tr>
                  <td colSpan={6} className="px-4 py-3">
                    <div ref={membersSentinelRef} className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
                    </div>
                  </td>
                </tr>
              )}
              {!hasMoreMembers && filtered.length > 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-2 text-center text-[10.5px] text-muted-foreground">
                    All {filtered.length} members shown
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PageBody>

      {addOpen && (
        <AddMemberModal
          roles={assignableRoles}
          onClose={() => setAddOpen(false)}
          onSubmit={(input) => {
            const result =
              input.status === "invited"
                ? inviteMember({ name: input.name, email: input.email, role: input.role, actor })
                : createMember({ ...input, actor });
            if (!result.ok) {
              showError(result.reason ?? "Failed to add member.");
              return false;
            }
            setAddOpen(false);
            return true;
          }}
        />
      )}
    </>
  );
}

function AddMemberModal({
  roles,
  onClose,
  onSubmit,
}: {
  roles: ReturnType<typeof useRoles>;
  onClose: () => void;
  onSubmit: (input: { name: string; email: string; role: Role; status: MemberStatus }) => boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(roles[0]?.id ?? "viewer");
  const [status, setStatus] = useState<MemberStatus>("invited");

  const valid = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
      <div className="premium-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/60">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Add member</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Send an invite or create an active account directly.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 inline-flex items-center justify-center rounded-lg hover:bg-accent/50">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-medium">Full name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background/70 px-3 py-2 text-xs"
              placeholder="Jane Doe"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-1 w-full rounded-lg border bg-background/70 px-3 py-2 text-xs"
              placeholder="jane@orbit.ai"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 w-full rounded-lg border bg-background/70 px-3 py-2 text-xs"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.permissions.length} permissions
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="text-[11px] font-medium">Initial status</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("invited")}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-all",
                  status === "invited" ? "border-primary ring-2 ring-ring/30 bg-accent/30" : "hover:bg-accent/40"
                )}
              >
                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold">
                  <Send className="h-3 w-3" /> Send invite
                </div>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">Awaits first login</p>
              </button>
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-all",
                  status === "active" ? "border-primary ring-2 ring-ring/30 bg-accent/30" : "hover:bg-accent/40"
                )}
              >
                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold">
                  <UserCheck className="h-3 w-3" /> Create as active
                </div>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">Immediate access</p>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border bg-background px-3 py-1.5 text-[11.5px] font-medium hover:bg-accent/50">
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() =>
              onSubmit({ name: name.trim(), email: email.trim(), role, status })
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "invited" ? (
              <>
                <Mail className="h-3.5 w-3.5" /> Send invite
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" /> Create member
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
