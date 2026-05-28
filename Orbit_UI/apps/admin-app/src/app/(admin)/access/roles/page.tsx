"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Pencil,
  Trash2,
  Plus,
  Check,
  Lock,
  Users,
  AlertTriangle,
  X,
  Power,
  PowerOff,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { RoleEditor } from "@/components/role-editor";
import { Can, useCanPerform } from "@/components/auth-guard";
import {
  useTeamStore,
  usePermissions,
  usePermissionGroups,
  type RoleDef,
} from "@/store/team-store";
import { useAuthStore } from "@/store/auth-store";
import type { Permission, RoleTone } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export default function RolesPage() {
  const roles = useTeamStore((s) => s.roles);
  const members = useTeamStore((s) => s.members);
  const permissions = usePermissions();
  const groups = usePermissionGroups();
  const currentRoleId = useAuthStore((s) => s.role);
  const createRole = useTeamStore((s) => s.createRole);
  const updateRoleMeta = useTeamStore((s) => s.updateRoleMeta);
  const setRolePermissions = useTeamStore((s) => s.setRolePermissions);
  const toggleRoleDisabled = useTeamStore((s) => s.toggleRoleDisabled);
  const deleteRole = useTeamStore((s) => s.deleteRole);
  const canManage = useCanPerform("access.manage");

  const actor = roles.find((r) => r.id === currentRoleId)?.label ?? "Unknown";

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDef | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  const openCreate = () => {
    setEditing(undefined);
    setEditorOpen(true);
  };
  const openEdit = (role: RoleDef) => {
    setEditing(role);
    setEditorOpen(true);
  };

  const handleSave = (input: {
    label: string;
    description: string;
    tone: RoleTone;
    permissions: Permission[];
  }) => {
    if (editing) {
      updateRoleMeta(
        editing.id,
        editing.isBuiltIn
          ? { description: input.description, tone: input.tone }
          : { label: input.label, description: input.description, tone: input.tone },
        actor
      );
      setRolePermissions(editing.id, input.permissions, actor);
    } else {
      createRole({ ...input, actor });
    }
    setEditorOpen(false);
    setEditing(undefined);
  };

  const handleDelete = (role: RoleDef) => {
    const result = deleteRole(role.id, actor);
    if (!result.ok) showError(`${role.label}: ${result.reason}`);
  };
  const handleToggle = (role: RoleDef) => {
    const result = toggleRoleDisabled(role.id, actor);
    if (!result.ok) showError(`${role.label}: ${result.reason}`);
  };

  return (
    <>
      <PageHeader
        title="Roles"
        description={`${roles.length} role${roles.length === 1 ? "" : "s"} defined · ${roles.filter((r) => r.disabled).length} disabled.`}
        actions={
          <Can permission="access.manage">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> New role
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map((role) => {
            const count = members.filter((m) => m.role === role.id).length;
            const activeCount = members.filter((m) => m.role === role.id && m.status === "active").length;
            return (
              <div key={role.id} className={cn("premium-card p-5 flex flex-col", role.disabled && "opacity-70")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/60 shrink-0">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{role.label}</p>
                        <Badge tone={role.tone}>{role.isBuiltIn ? "built-in" : "custom"}</Badge>
                        {role.disabled && <Badge tone="danger">disabled</Badge>}
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{role.id}</p>
                    </div>
                  </div>
                </div>

                <p className="text-[11.5px] text-muted-foreground mt-3 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                  {role.description || "No description."}
                </p>

                <div className="mt-3 flex items-center gap-4 text-[10.5px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {count} member{count === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3 w-3" /> {role.permissions.length} permissions
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t space-y-1.5">
                  {groups.map((g) => {
                    const groupPerms = permissions.filter((p) => p.group === g.key);
                    if (groupPerms.length === 0) return null;
                    const granted = groupPerms.filter((p) => role.permissions.includes(p.id));
                    const pct = Math.round((granted.length / groupPerms.length) * 100);
                    return (
                      <div key={g.key}>
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="text-muted-foreground">{g.label}</span>
                          <span className="font-mono">{granted.length}/{groupPerms.length}</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted/60 mt-1 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-chart-4 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between gap-2">
                  {canManage ? (
                    <>
                      <button
                        onClick={() => openEdit(role)}
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent/50 flex-1 justify-center"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleToggle(role)}
                        disabled={role.id === "super_admin"}
                        title={
                          role.id === "super_admin"
                            ? "Super Admin cannot be disabled"
                            : role.disabled
                              ? "Enable role"
                              : activeCount > 0
                                ? `Reassign ${activeCount} active member(s) first`
                                : "Disable role"
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                          role.disabled
                            ? "hover:bg-success/10 hover:text-[color:var(--success)] hover:border-success/30"
                            : "hover:bg-warning/10 hover:text-[color:var(--warning)] hover:border-warning/30"
                        )}
                      >
                        {role.disabled ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => handleDelete(role)}
                        disabled={role.isBuiltIn || count > 0}
                        title={
                          role.isBuiltIn
                            ? "Built-in roles can't be deleted"
                            : count > 0
                              ? "Reassign members first"
                              : "Delete role"
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-[11px] font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground w-full justify-center py-1.5">
                      <Lock className="h-3 w-3" /> read-only
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {canManage && (
            <button
              onClick={openCreate}
              className="rounded-2xl border-2 border-dashed bg-card/30 hover:bg-accent/30 transition-all p-5 flex flex-col items-center justify-center text-center min-h-[260px] group"
            >
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/10 to-chart-4/10 flex items-center justify-center ring-1 ring-border/60 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-3 text-sm font-semibold">Create custom role</p>
              <p className="mt-1 text-[11px] text-muted-foreground max-w-[180px]">
                Define a tailored set of permissions for your team.
              </p>
            </button>
          )}
        </div>
      </PageBody>

      {editorOpen && (
        <RoleEditor
          mode={editing ? "edit" : "create"}
          initial={editing}
          onClose={() => {
            setEditorOpen(false);
            setEditing(undefined);
          }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
