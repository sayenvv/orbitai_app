"use client";

import { ShieldAlert, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useTeamStore } from "@/store/team-store";
import type { Permission } from "@/lib/rbac";

export function useHydrated() {
  const authHydrated = useAuthStore((s) => s.hydrated);
  const teamHydrated = useTeamStore((s) => s.hydrated);
  return authHydrated && teamHydrated;
}

export function useCanPerform(permission: Permission): boolean {
  const role = useAuthStore((s) => s.role);
  const hydrated = useHydrated();
  const roleDef = useTeamStore((s) => s.roles.find((r) => r.id === role));
  const permDef = useTeamStore((s) => s.permissions.find((p) => p.id === permission));
  if (!hydrated) return false;
  if (!roleDef || roleDef.disabled) return false;
  if (permDef?.disabled) return false;
  return roleDef.permissions.includes(permission);
}

export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const allowed = useCanPerform(permission);
  return <>{allowed ? children : fallback}</>;
}

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  const role = useAuthStore((s) => s.role);
  const roleDef = useTeamStore((s) => s.roles.find((r) => r.id === role));
  const permDef = useTeamStore((s) => s.permissions.find((p) => p.id === permission));
  const allowed = useCanPerform(permission);

  if (!hydrated) {
    return (
      <div className="p-8 space-y-3">
        <div className="h-6 w-48 rounded bg-muted/60 animate-pulse" />
        <div className="h-4 w-80 rounded bg-muted/40 animate-pulse" />
        <div className="h-32 w-full rounded-2xl bg-muted/30 animate-pulse" />
      </div>
    );
  }

  if (allowed) return <>{children}</>;

  const reason = !roleDef
    ? "Your role no longer exists. Contact an administrator."
    : roleDef.disabled
      ? `The "${roleDef.label}" role has been disabled.`
      : permDef?.disabled
        ? `The "${permDef.label}" permission has been disabled.`
        : `The "${roleDef.label}" role doesn't have access to this area.`;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="premium-card max-w-md p-8 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 ring-1 ring-warning/30 mb-4">
          {roleDef?.disabled || permDef?.disabled ? (
            <Lock className="h-6 w-6 text-warning" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-warning" />
          )}
        </div>
        <h2 className="text-base font-semibold">Access restricted</h2>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{reason}</p>
      </div>
    </div>
  );
}
