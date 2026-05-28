export type Role = string;
export type Permission = string;

export type RoleTone = "success" | "violet" | "warning" | "info" | "neutral" | "danger";

export const ROLE_TONES: RoleTone[] = ["success", "violet", "warning", "info", "neutral", "danger"];

export type PermissionGroupKey = string;

export type SeedPermission = {
  id: string;
  label: string;
  group: PermissionGroupKey;
};

export type SeedGroup = {
  key: PermissionGroupKey;
  label: string;
};

export const SEED_PERMISSION_GROUPS: SeedGroup[] = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "conversations", label: "Conversations" },
  { key: "billing", label: "Billing" },
  { key: "system", label: "System" },
];

export const SEED_PERMISSIONS: SeedPermission[] = [
  { id: "dashboard.view", label: "View dashboard", group: "overview" },
  { id: "activity.view", label: "View activity feed", group: "overview" },
  { id: "users.view", label: "View users", group: "users" },
  { id: "users.invite", label: "Invite new users", group: "users" },
  { id: "users.export", label: "Export user data", group: "users" },
  { id: "users.suspend", label: "Suspend users", group: "users" },
  { id: "conversations.view", label: "View conversations", group: "conversations" },
  { id: "subscriptions.view", label: "View subscriptions", group: "billing" },
  { id: "subscriptions.manage", label: "Manage subscriptions", group: "billing" },
  { id: "payments.view", label: "View payments", group: "billing" },
  { id: "payments.export", label: "Export payments", group: "billing" },
  { id: "payments.refund", label: "Issue refunds", group: "billing" },
  { id: "settings.view", label: "View settings", group: "system" },
  { id: "settings.manage", label: "Manage settings", group: "system" },
  { id: "access.view", label: "View access control", group: "system" },
  { id: "access.manage", label: "Manage roles & members", group: "system" },
  { id: "notifications.view", label: "View notifications", group: "system" },
  { id: "notifications.send", label: "Send custom notifications", group: "system" },
  { id: "reports.view", label: "View reports", group: "system" },
  { id: "logs.view", label: "View system logs", group: "system" },
  { id: "health.view", label: "View user health & issues", group: "system" },
];

export const SEED_PERMISSION_IDS: Permission[] = SEED_PERMISSIONS.map((p) => p.id);

export function slugifyRoleId(label: string): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
  return base || `role_${Math.random().toString(36).slice(2, 7)}`;
}

export function slugifyPermissionId(group: string, label: string): string {
  const tail = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
  return `${group}.${tail || Math.random().toString(36).slice(2, 6)}`;
}
