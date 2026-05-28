"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Check,
  Minus,
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  X,
  AlertTriangle,
  KeyRound,
  Search,
  Lock,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Can, useCanPerform } from "@/components/auth-guard";
import {
  useTeamStore,
  useRoles,
  usePermissions,
  usePermissionGroups,
  type PermissionDef,
} from "@/store/team-store";
import { useAuthStore } from "@/store/auth-store";
import { useRoleDef } from "@/store/team-store";
import { cn } from "@/lib/utils";

export default function PermissionsPage() {
  const roles = useRoles();
  const permissions = usePermissions();
  const groups = usePermissionGroups();
  const createPermission = useTeamStore((s) => s.createPermission);
  const updatePermissionLabel = useTeamStore((s) => s.updatePermissionLabel);
  const togglePermissionDisabled = useTeamStore((s) => s.togglePermissionDisabled);
  const deletePermission = useTeamStore((s) => s.deletePermission);
  const canManage = useCanPerform("access.manage");
  const currentRole = useAuthStore((s) => s.role);
  const actor = useRoleDef(currentRole)?.label ?? "Unknown";

  const [tab, setTab] = useState<"manage" | "matrix">("manage");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  const filtered = useMemo(() => {
    if (!search) return permissions;
    const q = search.toLowerCase();
    return permissions.filter((p) => p.id.toLowerCase().includes(q) || p.label.toLowerCase().includes(q));
  }, [permissions, search]);

  const startEdit = (p: PermissionDef) => {
    setEditingId(p.id);
    setEditLabel(p.label);
  };
  const commitEdit = (id: string) => {
    if (editLabel.trim()) updatePermissionLabel(id, editLabel.trim(), actor);
    setEditingId(null);
  };
  const handleDelete = (p: PermissionDef) => {
    const result = deletePermission(p.id, actor);
    if (!result.ok) showError(`${p.label}: ${result.reason}`);
  };

  const usageCount = (id: string) => roles.filter((r) => r.permissions.includes(id)).length;

  return (
    <>
      <PageHeader
        title="Permissions"
        description={`${permissions.length} permission${permissions.length === 1 ? "" : "s"} · ${permissions.filter((p) => p.disabled).length} disabled.`}
        actions={
          tab === "manage" ? (
            <Can permission="access.manage">
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> New permission
              </button>
            </Can>
          ) : null
        }
      />
      <PageBody className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border bg-background p-0.5">
            <button
              onClick={() => setTab("manage")}
              className={cn(
                "px-3 py-1.5 text-[11.5px] font-medium rounded-md transition-colors",
                tab === "manage" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              Manage
            </button>
            <button
              onClick={() => setTab("matrix")}
              className={cn(
                "px-3 py-1.5 text-[11.5px] font-medium rounded-md transition-colors",
                tab === "matrix" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              Role matrix
            </button>
          </div>
          {tab === "manage" && (
            <div className="relative flex-1 max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search permissions…"
                className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-[11.5px] text-destructive flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-destructive">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {tab === "manage" ? (
          <div className="space-y-4">
            {groups.map((g) => {
              const items = filtered.filter((p) => p.group === g.key);
              if (items.length === 0) return null;
              return (
                <div key={g.key} className="premium-card overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/30 border-b flex items-center justify-between">
                    <p className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-foreground">
                      {g.label}
                    </p>
                    <span className="text-[10.5px] text-muted-foreground">{items.length} permission{items.length === 1 ? "" : "s"}</span>
                  </div>
                  <ul className="divide-y">
                    {items.map((p) => {
                      const used = usageCount(p.id);
                      const isEditing = editingId === p.id;
                      return (
                        <li
                          key={p.id}
                          className={cn(
                            "px-4 py-3 flex items-center gap-3 hover:bg-accent/20 transition-colors",
                            p.disabled && "opacity-60"
                          )}
                        >
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/60 shrink-0">
                            <KeyRound className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <input
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                onBlur={() => commitEdit(p.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitEdit(p.id);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                autoFocus
                                className="w-full rounded-md border bg-background px-2 py-1 text-[12px]"
                              />
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-[12px] font-medium leading-tight">{p.label}</p>
                                {!p.isBuiltIn && <Badge tone="info">custom</Badge>}
                                {p.disabled && <Badge tone="danger">disabled</Badge>}
                              </div>
                            )}
                            <p className="text-[10.5px] font-mono text-muted-foreground mt-0.5">{p.id}</p>
                          </div>
                          <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">
                            used by {used} role{used === 1 ? "" : "s"}
                          </span>
                          {canManage ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => startEdit(p)}
                                title="Rename"
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent/50"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => togglePermissionDisabled(p.id, actor)}
                                title={p.disabled ? "Enable permission" : "Disable permission"}
                                className={cn(
                                  "h-7 w-7 inline-flex items-center justify-center rounded-md border bg-background transition-colors",
                                  p.disabled
                                    ? "hover:bg-success/10 hover:text-[color:var(--success)] hover:border-success/30"
                                    : "hover:bg-warning/10 hover:text-[color:var(--warning)] hover:border-warning/30"
                                )}
                              >
                                {p.disabled ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}
                              </button>
                              <button
                                onClick={() => handleDelete(p)}
                                disabled={p.isBuiltIn || used > 0}
                                title={
                                  p.isBuiltIn
                                    ? "Built-in permission (disable instead)"
                                    : used > 0
                                      ? "Remove from all roles first"
                                      : "Delete permission"
                                }
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No permissions match your search.</p>
            )}
          </div>
        ) : (
          <div className="premium-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3 min-w-[260px]">Permission</th>
                    {roles.map((r) => (
                      <th key={r.id} className="px-3 py-3 text-center font-semibold">
                        <div className="flex flex-col items-center gap-1">
                          <Badge tone={r.tone}>{r.label}</Badge>
                          {(r.disabled || !r.isBuiltIn) && (
                            <span className={cn("text-[9px] font-medium normal-case tracking-normal", r.disabled ? "text-destructive" : "text-primary")}>
                              {r.disabled ? "disabled" : "custom"}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => {
                    const items = permissions.filter((p) => p.group === g.key);
                    if (items.length === 0) return null;
                    return (
                      <Fragment key={g.key}>
                        <tr className="bg-muted/20 border-t">
                          <td
                            colSpan={roles.length + 1}
                            className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground"
                          >
                            {g.label}
                          </td>
                        </tr>
                        {items.map((p) => (
                          <tr key={p.id} className={cn("border-t hover:bg-accent/30 transition-colors", p.disabled && "opacity-60")}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-medium">{p.label}</p>
                                  <p className="text-[10.5px] text-muted-foreground font-mono mt-0.5">{p.id}</p>
                                </div>
                                {p.disabled && <Badge tone="danger">disabled</Badge>}
                              </div>
                            </td>
                            {roles.map((r) => {
                              const granted = r.permissions.includes(p.id);
                              return (
                                <td key={r.id} className="px-3 py-3 text-center">
                                  {granted ? (
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-[color:var(--success)] ring-1 ring-success/25">
                                      <Check className="h-3.5 w-3.5" />
                                    </span>
                                  ) : (
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 text-muted-foreground/60">
                                      <Minus className="h-3 w-3" />
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PageBody>

      {createOpen && (
        <CreatePermissionModal
          groups={groups}
          onClose={() => setCreateOpen(false)}
          onCreate={(input) => {
            createPermission({ ...input, actor });
            setCreateOpen(false);
          }}
        />
      )}
    </>
  );
}

function CreatePermissionModal({
  groups,
  onClose,
  onCreate,
}: {
  groups: ReturnType<typeof usePermissionGroups>;
  onClose: () => void;
  onCreate: (input: { label: string; group: string }) => void;
}) {
  const [label, setLabel] = useState("");
  const [group, setGroup] = useState(groups[0]?.key ?? "system");
  const valid = label.trim().length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
      <div className="premium-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/60">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">New permission</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Create a custom permission to grant to roles.</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 inline-flex items-center justify-center rounded-lg hover:bg-accent/50">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-medium">Label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Export billing report"
              className="mt-1 w-full rounded-lg border bg-background/70 px-3 py-2 text-xs"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium">Group</span>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background/70 px-3 py-2 text-xs"
            >
              {groups.map((g) => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
          </label>
          {label.trim() && (
            <p className="text-[10px] font-mono text-muted-foreground">
              id: {group}.{label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}
            </p>
          )}
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border bg-background px-3 py-1.5 text-[11.5px] font-medium hover:bg-accent/50">
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() => onCreate({ label: label.trim(), group })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" /> Create
          </button>
        </div>
      </div>
    </div>
  );
}
