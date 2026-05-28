"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  SEED_PERMISSIONS,
  SEED_PERMISSION_GROUPS,
  SEED_PERMISSION_IDS,
  slugifyRoleId,
  slugifyPermissionId,
  type Permission,
  type Role,
  type RoleTone,
} from "@/lib/rbac";

export type MemberStatus = "active" | "invited" | "suspended";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  avatarColor: string;
  joinedAt: string;
  lastActiveAt: string;
};

export type RoleDef = {
  id: Role;
  label: string;
  description: string;
  tone: RoleTone;
  isBuiltIn: boolean;
  disabled: boolean;
  permissions: Permission[];
  createdAt: string;
};

export type PermissionDef = {
  id: Permission;
  label: string;
  group: string;
  isBuiltIn: boolean;
  disabled: boolean;
  createdAt: string;
};

export type PermissionGroupDef = {
  key: string;
  label: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action:
    | "role_changed"
    | "member_created"
    | "member_invited"
    | "member_suspended"
    | "member_reactivated"
    | "member_removed"
    | "role_created"
    | "role_updated"
    | "role_permissions_changed"
    | "role_deleted"
    | "role_disabled"
    | "role_enabled"
    | "permission_created"
    | "permission_updated"
    | "permission_disabled"
    | "permission_enabled"
    | "permission_deleted";
  targetId: string;
  targetName: string;
  actorRole?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  meta?: {
    from?: Role;
    to?: Role;
    fromLabel?: string;
    toLabel?: string;
    added?: Permission[];
    removed?: Permission[];
    targetEmail?: string;
    targetRole?: string;
    note?: string;
  };
};

const SUPER_ADMIN_PERMS = [...SEED_PERMISSION_IDS];
const ADMIN_PERMS: Permission[] = [
  "dashboard.view","activity.view","users.view","users.invite","users.export","users.suspend",
  "conversations.view","subscriptions.view","subscriptions.manage","payments.view","payments.export",
  "settings.view","access.view","notifications.view","notifications.send","reports.view","logs.view","health.view",
];
const BILLING_PERMS: Permission[] = [
  "dashboard.view","activity.view","subscriptions.view","subscriptions.manage",
  "payments.view","payments.export","payments.refund","users.view","notifications.view","reports.view",
];
const SUPPORT_PERMS: Permission[] = ["dashboard.view","activity.view","users.view","conversations.view","notifications.view","notifications.send","health.view"];
const VIEWER_PERMS: Permission[] = ["dashboard.view","activity.view"];

const SEED_ROLES: RoleDef[] = [
  { id: "super_admin", label: "Super Admin", description: "Full access — every page, every action.", tone: "warning", isBuiltIn: true, disabled: false, permissions: SUPER_ADMIN_PERMS, createdAt: "2024-01-01T00:00:00Z" },
  { id: "admin", label: "Admin", description: "Manage users, billing and operations.", tone: "info", isBuiltIn: true, disabled: false, permissions: ADMIN_PERMS, createdAt: "2024-01-01T00:00:00Z" },
  { id: "billing", label: "Billing Manager", description: "Payments, subscriptions and revenue reporting.", tone: "violet", isBuiltIn: true, disabled: false, permissions: BILLING_PERMS, createdAt: "2024-01-01T00:00:00Z" },
  { id: "support", label: "Support Agent", description: "View users and conversations to assist customers.", tone: "success", isBuiltIn: true, disabled: false, permissions: SUPPORT_PERMS, createdAt: "2024-01-01T00:00:00Z" },
  { id: "viewer", label: "Read-only Viewer", description: "Dashboard and activity only — no mutations.", tone: "neutral", isBuiltIn: true, disabled: false, permissions: VIEWER_PERMS, createdAt: "2024-01-01T00:00:00Z" },
];

const SEED_PERMISSION_DEFS: PermissionDef[] = SEED_PERMISSIONS.map((p) => ({
  id: p.id,
  label: p.label,
  group: p.group,
  isBuiltIn: true,
  disabled: false,
  createdAt: "2024-01-01T00:00:00Z",
}));

const SEED_MEMBERS: TeamMember[] = [
  { id: "tm_001", name: "Operations Lead", email: "ops@orbit.ai", role: "super_admin", status: "active", avatarColor: "from-primary to-chart-4", joinedAt: "2024-01-08T09:00:00Z", lastActiveAt: "2026-05-28T08:14:00Z" },
  { id: "tm_002", name: "Priya Raman", email: "priya.raman@orbit.ai", role: "admin", status: "active", avatarColor: "from-blue-500 to-indigo-600", joinedAt: "2024-03-12T09:00:00Z", lastActiveAt: "2026-05-27T17:42:00Z" },
  { id: "tm_003", name: "Marcus Chen", email: "marcus.chen@orbit.ai", role: "billing", status: "active", avatarColor: "from-emerald-500 to-teal-600", joinedAt: "2024-05-04T09:00:00Z", lastActiveAt: "2026-05-28T07:02:00Z" },
  { id: "tm_004", name: "Sofia Almeida", email: "sofia.almeida@orbit.ai", role: "support", status: "active", avatarColor: "from-violet-500 to-fuchsia-600", joinedAt: "2024-06-19T09:00:00Z", lastActiveAt: "2026-05-28T06:55:00Z" },
  { id: "tm_005", name: "Liam Patel", email: "liam.patel@orbit.ai", role: "support", status: "active", avatarColor: "from-amber-500 to-orange-600", joinedAt: "2024-09-02T09:00:00Z", lastActiveAt: "2026-05-27T22:18:00Z" },
  { id: "tm_006", name: "Hannah Weiss", email: "hannah.weiss@orbit.ai", role: "viewer", status: "invited", avatarColor: "from-rose-500 to-pink-600", joinedAt: "2026-05-22T09:00:00Z", lastActiveAt: "2026-05-22T09:00:00Z" },
  { id: "tm_007", name: "Diego Hernandez", email: "diego.h@orbit.ai", role: "admin", status: "suspended", avatarColor: "from-slate-500 to-zinc-700", joinedAt: "2024-02-15T09:00:00Z", lastActiveAt: "2026-04-10T11:30:00Z" },
];

const SEED_AUDIT: AuditEntry[] = [
  { id: "au_001", at: "2026-05-28T07:48:00Z", actor: "Operations Lead", actorRole: "Super Admin", action: "role_permissions_changed", targetId: "billing", targetName: "Billing Manager", ip: "10.42.18.7", userAgent: "Chrome 138 · macOS 15", sessionId: "sess_8f3a91", meta: { added: ["payments.refund"], removed: [], note: "Granted refund authority ahead of EU rollout." } },
  { id: "au_002", at: "2026-05-27T16:05:00Z", actor: "Priya Raman", actorRole: "Admin", action: "permission_disabled", targetId: "users.export", targetName: "Export user list", ip: "10.42.18.22", userAgent: "Edge 137 · Windows 11", sessionId: "sess_2bc104", meta: { note: "Temporarily blocked while SOC2 review is in progress." } },
  { id: "au_003", at: "2026-05-25T14:22:00Z", actor: "Operations Lead", actorRole: "Super Admin", action: "role_changed", targetId: "tm_003", targetName: "Marcus Chen", ip: "10.42.18.7", userAgent: "Chrome 138 · macOS 15", sessionId: "sess_8f3a91", meta: { from: "admin", to: "billing", fromLabel: "Admin", toLabel: "Billing Manager", targetEmail: "marcus.chen@orbit.ai" } },
  { id: "au_004", at: "2026-05-24T10:11:00Z", actor: "Operations Lead", actorRole: "Super Admin", action: "role_created", targetId: "finance_reviewer", targetName: "Finance Reviewer", ip: "10.42.18.7", userAgent: "Chrome 138 · macOS 15", sessionId: "sess_8f3a91", meta: { note: "Read-only role for quarterly close." } },
  { id: "au_005", at: "2026-05-22T09:00:00Z", actor: "Priya Raman", actorRole: "Admin", action: "member_invited", targetId: "tm_006", targetName: "Hannah Weiss", ip: "10.42.18.22", userAgent: "Edge 137 · Windows 11", sessionId: "sess_2bc104", meta: { targetEmail: "hannah.weiss@orbit.ai", targetRole: "Read-only Viewer" } },
  { id: "au_006", at: "2026-05-20T13:40:00Z", actor: "Operations Lead", actorRole: "Super Admin", action: "permission_created", targetId: "reports.schedule", targetName: "Schedule reports", ip: "10.42.18.7", userAgent: "Chrome 138 · macOS 15", sessionId: "sess_8f3a91" },
  { id: "au_007", at: "2026-05-15T08:55:00Z", actor: "Priya Raman", actorRole: "Admin", action: "member_reactivated", targetId: "tm_005", targetName: "Liam Patel", ip: "10.42.18.22", userAgent: "Edge 137 · Windows 11", sessionId: "sess_2bc104", meta: { note: "Returned from leave." } },
  { id: "au_008", at: "2026-04-10T11:30:00Z", actor: "Operations Lead", actorRole: "Super Admin", action: "member_suspended", targetId: "tm_007", targetName: "Diego Hernandez", ip: "10.42.18.7", userAgent: "Chrome 138 · macOS 15", sessionId: "sess_8f3a91", meta: { note: "Off-boarding pending HR review.", targetEmail: "diego.h@orbit.ai" } },
];

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-fuchsia-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
];

const nowIso = () => new Date().toISOString();
const genId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
const diff = <T,>(a: T[], b: T[]): T[] => a.filter((x) => !b.includes(x));

type TeamState = {
  members: TeamMember[];
  roles: RoleDef[];
  permissions: PermissionDef[];
  groups: PermissionGroupDef[];
  audit: AuditEntry[];
  hydrated: boolean;
  setHydrated: (v: boolean) => void;

  inviteMember: (input: { name: string; email: string; role: Role; actor: string }) => { ok: boolean; reason?: string };
  createMember: (input: { name: string; email: string; role: Role; status: MemberStatus; actor: string }) => { ok: boolean; reason?: string; id?: string };
  changeRole: (id: string, role: Role, actor: string) => void;
  suspendMember: (id: string, actor: string) => void;
  reactivateMember: (id: string, actor: string) => void;
  removeMember: (id: string, actor: string) => void;

  createRole: (input: { label: string; description: string; tone: RoleTone; permissions: Permission[]; actor: string }) => Role | null;
  updateRoleMeta: (id: Role, patch: { label?: string; description?: string; tone?: RoleTone }, actor: string) => void;
  setRolePermissions: (id: Role, permissions: Permission[], actor: string) => void;
  toggleRoleDisabled: (id: Role, actor: string) => { ok: boolean; reason?: string };
  deleteRole: (id: Role, actor: string) => { ok: boolean; reason?: string };

  createPermission: (input: { label: string; group: string; actor: string }) => Permission | null;
  updatePermissionLabel: (id: Permission, label: string, actor: string) => void;
  togglePermissionDisabled: (id: Permission, actor: string) => void;
  deletePermission: (id: Permission, actor: string) => { ok: boolean; reason?: string };
};

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      members: SEED_MEMBERS,
      roles: SEED_ROLES,
      permissions: SEED_PERMISSION_DEFS,
      groups: SEED_PERMISSION_GROUPS,
      audit: SEED_AUDIT,
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      inviteMember: ({ name, email, role, actor }) => {
        const trimmedEmail = email.trim().toLowerCase();
        if (get().members.some((m) => m.email.toLowerCase() === trimmedEmail)) {
          return { ok: false, reason: "A member with that email already exists." };
        }
        const id = genId("tm");
        const member: TeamMember = {
          id, name: name.trim(), email: email.trim(), role,
          status: "invited",
          avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          joinedAt: nowIso(), lastActiveAt: nowIso(),
        };
        const entry: AuditEntry = { id: genId("au"), at: nowIso(), actor, action: "member_invited", targetId: id, targetName: member.name };
        set({ members: [member, ...get().members], audit: [entry, ...get().audit] });
        return { ok: true };
      },
      createMember: ({ name, email, role, status, actor }) => {
        const trimmedEmail = email.trim().toLowerCase();
        if (!name.trim() || !trimmedEmail) {
          return { ok: false, reason: "Name and email are required." };
        }
        if (get().members.some((m) => m.email.toLowerCase() === trimmedEmail)) {
          return { ok: false, reason: "A member with that email already exists." };
        }
        const roleDef = get().roles.find((r) => r.id === role);
        if (!roleDef) return { ok: false, reason: "Selected role no longer exists." };
        if (roleDef.disabled) return { ok: false, reason: "Cannot assign a disabled role." };
        const id = genId("tm");
        const member: TeamMember = {
          id, name: name.trim(), email: email.trim(), role, status,
          avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          joinedAt: nowIso(), lastActiveAt: nowIso(),
        };
        const entry: AuditEntry = {
          id: genId("au"), at: nowIso(), actor,
          action: status === "invited" ? "member_invited" : "member_created",
          targetId: id, targetName: member.name,
        };
        set({ members: [member, ...get().members], audit: [entry, ...get().audit] });
        return { ok: true, id };
      },
      changeRole: (id, role, actor) => {
        const member = get().members.find((m) => m.id === id);
        if (!member || member.role === role) return;
        const roles = get().roles;
        const fromLabel = roles.find((r) => r.id === member.role)?.label;
        const toLabel = roles.find((r) => r.id === role)?.label;
        const entry: AuditEntry = {
          id: genId("au"), at: nowIso(), actor, action: "role_changed", targetId: id, targetName: member.name,
          meta: { from: member.role, to: role, fromLabel, toLabel },
        };
        set({
          members: get().members.map((m) => (m.id === id ? { ...m, role } : m)),
          audit: [entry, ...get().audit],
        });
      },
      suspendMember: (id, actor) => {
        const member = get().members.find((m) => m.id === id);
        if (!member || member.status === "suspended") return;
        const entry: AuditEntry = { id: genId("au"), at: nowIso(), actor, action: "member_suspended", targetId: id, targetName: member.name };
        set({
          members: get().members.map((m) => (m.id === id ? { ...m, status: "suspended" } : m)),
          audit: [entry, ...get().audit],
        });
      },
      reactivateMember: (id, actor) => {
        const member = get().members.find((m) => m.id === id);
        if (!member) return;
        const entry: AuditEntry = { id: genId("au"), at: nowIso(), actor, action: "member_reactivated", targetId: id, targetName: member.name };
        set({
          members: get().members.map((m) => (m.id === id ? { ...m, status: "active" } : m)),
          audit: [entry, ...get().audit],
        });
      },
      removeMember: (id, actor) => {
        const member = get().members.find((m) => m.id === id);
        if (!member) return;
        const entry: AuditEntry = { id: genId("au"), at: nowIso(), actor, action: "member_removed", targetId: id, targetName: member.name };
        set({
          members: get().members.filter((m) => m.id !== id),
          audit: [entry, ...get().audit],
        });
      },

      createRole: ({ label, description, tone, permissions, actor }) => {
        const trimmedLabel = label.trim();
        if (!trimmedLabel) return null;
        const existing = get().roles;
        let id = slugifyRoleId(trimmedLabel);
        const base = id;
        let suffix = 2;
        while (existing.some((r) => r.id === id)) id = `${base}_${suffix++}`;
        const role: RoleDef = {
          id, label: trimmedLabel, description: description.trim(), tone,
          isBuiltIn: false, disabled: false, permissions, createdAt: nowIso(),
        };
        const entry: AuditEntry = { id: genId("au"), at: nowIso(), actor, action: "role_created", targetId: id, targetName: role.label };
        set({ roles: [...existing, role], audit: [entry, ...get().audit] });
        return id;
      },
      updateRoleMeta: (id, patch, actor) => {
        const role = get().roles.find((r) => r.id === id);
        if (!role) return;
        const next: RoleDef = {
          ...role,
          label: (patch.label ?? role.label).trim() || role.label,
          description: (patch.description ?? role.description).trim(),
          tone: patch.tone ?? role.tone,
        };
        const unchanged = next.label === role.label && next.description === role.description && next.tone === role.tone;
        if (unchanged) return;
        const entry: AuditEntry = { id: genId("au"), at: nowIso(), actor, action: "role_updated", targetId: id, targetName: next.label };
        set({
          roles: get().roles.map((r) => (r.id === id ? next : r)),
          audit: [entry, ...get().audit],
        });
      },
      setRolePermissions: (id, permissions, actor) => {
        const role = get().roles.find((r) => r.id === id);
        if (!role) return;
        const added = diff(permissions, role.permissions);
        const removed = diff(role.permissions, permissions);
        if (added.length === 0 && removed.length === 0) return;
        const entry: AuditEntry = {
          id: genId("au"), at: nowIso(), actor, action: "role_permissions_changed", targetId: id, targetName: role.label,
          meta: { added, removed },
        };
        set({
          roles: get().roles.map((r) => (r.id === id ? { ...r, permissions } : r)),
          audit: [entry, ...get().audit],
        });
      },
      toggleRoleDisabled: (id, actor) => {
        const role = get().roles.find((r) => r.id === id);
        if (!role) return { ok: false, reason: "Role not found." };
        if (!role.disabled && role.id === "super_admin") {
          return { ok: false, reason: "The Super Admin role cannot be disabled." };
        }
        if (!role.disabled) {
          const inUse = get().members.some((m) => m.role === id && m.status === "active");
          if (inUse) return { ok: false, reason: "Reassign active members before disabling." };
        }
        const next = !role.disabled;
        const entry: AuditEntry = {
          id: genId("au"), at: nowIso(), actor,
          action: next ? "role_disabled" : "role_enabled",
          targetId: id, targetName: role.label,
        };
        set({
          roles: get().roles.map((r) => (r.id === id ? { ...r, disabled: next } : r)),
          audit: [entry, ...get().audit],
        });
        return { ok: true };
      },
      deleteRole: (id, actor) => {
        const role = get().roles.find((r) => r.id === id);
        if (!role) return { ok: false, reason: "Role not found." };
        if (role.isBuiltIn) return { ok: false, reason: "Built-in roles cannot be deleted." };
        const inUse = get().members.some((m) => m.role === id);
        if (inUse) return { ok: false, reason: "Reassign members before deleting." };
        const entry: AuditEntry = { id: genId("au"), at: nowIso(), actor, action: "role_deleted", targetId: id, targetName: role.label };
        set({
          roles: get().roles.filter((r) => r.id !== id),
          audit: [entry, ...get().audit],
        });
        return { ok: true };
      },

      createPermission: ({ label, group, actor }) => {
        const trimmed = label.trim();
        if (!trimmed) return null;
        const existing = get().permissions;
        let id = slugifyPermissionId(group, trimmed);
        const base = id;
        let suffix = 2;
        while (existing.some((p) => p.id === id)) id = `${base}_${suffix++}`;
        const perm: PermissionDef = {
          id, label: trimmed, group, isBuiltIn: false, disabled: false, createdAt: nowIso(),
        };
        const entry: AuditEntry = { id: genId("au"), at: nowIso(), actor, action: "permission_created", targetId: id, targetName: perm.label };
        set({ permissions: [...existing, perm], audit: [entry, ...get().audit] });
        return id;
      },
      updatePermissionLabel: (id, label, actor) => {
        const perm = get().permissions.find((p) => p.id === id);
        const next = label.trim();
        if (!perm || !next || perm.label === next) return;
        const entry: AuditEntry = { id: genId("au"), at: nowIso(), actor, action: "permission_updated", targetId: id, targetName: next };
        set({
          permissions: get().permissions.map((p) => (p.id === id ? { ...p, label: next } : p)),
          audit: [entry, ...get().audit],
        });
      },
      togglePermissionDisabled: (id, actor) => {
        const perm = get().permissions.find((p) => p.id === id);
        if (!perm) return;
        const next = !perm.disabled;
        const entry: AuditEntry = {
          id: genId("au"), at: nowIso(), actor,
          action: next ? "permission_disabled" : "permission_enabled",
          targetId: id, targetName: perm.label,
        };
        set({
          permissions: get().permissions.map((p) => (p.id === id ? { ...p, disabled: next } : p)),
          audit: [entry, ...get().audit],
        });
      },
      deletePermission: (id, actor) => {
        const perm = get().permissions.find((p) => p.id === id);
        if (!perm) return { ok: false, reason: "Permission not found." };
        if (perm.isBuiltIn) return { ok: false, reason: "Built-in permissions cannot be deleted (disable instead)." };
        const usingRoles = get().roles.filter((r) => r.permissions.includes(id));
        if (usingRoles.length > 0) {
          return { ok: false, reason: `Remove from ${usingRoles.length} role(s) first.` };
        }
        const entry: AuditEntry = { id: genId("au"), at: nowIso(), actor, action: "permission_deleted", targetId: id, targetName: perm.label };
        set({
          permissions: get().permissions.filter((p) => p.id !== id),
          audit: [entry, ...get().audit],
        });
        return { ok: true };
      },
    }),
    {
      name: "orbit-admin-team",
      version: 6,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

export function useRoles(): RoleDef[] {
  return useTeamStore((s) => s.roles);
}
export function useRoleDef(id: Role): RoleDef | undefined {
  return useTeamStore((s) => s.roles.find((r) => r.id === id));
}
export function usePermissions(): PermissionDef[] {
  return useTeamStore((s) => s.permissions);
}
export function useActivePermissions(): PermissionDef[] {
  return useTeamStore((s) => s.permissions.filter((p) => !p.disabled));
}
export function usePermissionGroups(): PermissionGroupDef[] {
  return useTeamStore((s) => s.groups);
}
