"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ShieldCheck, AlertTriangle, Lock } from "lucide-react";
import { ROLE_TONES, type Permission, type RoleTone } from "@/lib/rbac";
import {
  usePermissions,
  usePermissionGroups,
  type RoleDef,
} from "@/store/team-store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE_SWATCH: Record<RoleTone, string> = {
  success: "bg-success",
  violet: "bg-chart-4",
  warning: "bg-warning",
  info: "bg-primary",
  neutral: "bg-muted-foreground/50",
  danger: "bg-destructive",
};

export type RoleEditorMode = "create" | "edit";

export function RoleEditor({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: RoleEditorMode;
  initial?: RoleDef;
  onClose: () => void;
  onSave: (input: {
    label: string;
    description: string;
    tone: RoleTone;
    permissions: Permission[];
  }) => void;
}) {
  const allPerms = usePermissions();
  const groups = usePermissionGroups();
  const [label, setLabel] = useState(initial?.label ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tone, setTone] = useState<RoleTone>(initial?.tone ?? "info");
  const [permissions, setPermissions] = useState<Permission[]>(initial?.permissions ?? []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const permsByGroup = useMemo(() => {
    return groups.map((g) => ({
      ...g,
      perms: allPerms.filter((p) => p.group === g.key),
    }));
  }, [allPerms, groups]);

  const enabledIds = useMemo(() => allPerms.filter((p) => !p.disabled).map((p) => p.id), [allPerms]);

  const toggle = (id: Permission) => {
    setPermissions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleGroup = (ids: Permission[]) => {
    const allOn = ids.every((p) => permissions.includes(p));
    setPermissions((prev) =>
      allOn ? prev.filter((p) => !ids.includes(p)) : Array.from(new Set([...prev, ...ids]))
    );
  };

  const selectAll = () => setPermissions([...enabledIds]);
  const clearAll = () => setPermissions([]);

  const valid = label.trim().length > 1;
  const isLocked = mode === "edit" && initial?.isBuiltIn === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
      <div className="premium-card w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15 flex items-center justify-center ring-1 ring-border/60">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                {mode === "create" ? "Create role" : `Edit role · ${initial?.label}`}
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Define a role label, color tone, and the permissions it grants.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 inline-flex items-center justify-center rounded-lg hover:bg-accent/50">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {isLocked && (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Built-in role. Name/identifier are locked; description, tone, and permissions remain editable.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-medium">Role name</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isLocked}
                placeholder="e.g. Finance Analyst"
                className="mt-1 w-full rounded-lg border bg-background/70 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
              />
              {mode === "create" && label && (
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  id: {label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "—"}
                </p>
              )}
            </label>
            <label className="block">
              <span className="text-[11px] font-medium">Tone</span>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                {ROLE_TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={cn(
                      "h-7 px-2 rounded-lg border text-[10.5px] font-medium flex items-center gap-1.5 transition-all",
                      tone === t ? "border-primary ring-2 ring-ring/30 bg-accent/30" : "hover:bg-accent/40"
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full", TONE_SWATCH[t])} />
                    {t}
                  </button>
                ))}
              </div>
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] font-medium">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What this role is allowed to do, in plain language."
              className="mt-1 w-full rounded-lg border bg-background/70 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <p className="text-[12px] font-semibold">Permissions</p>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">
                  {permissions.length} of {enabledIds.length} active permissions granted
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={selectAll} className="rounded-lg border px-2 py-1 text-[10.5px] hover:bg-accent/50">Select all</button>
                <button onClick={clearAll} className="rounded-lg border px-2 py-1 text-[10.5px] hover:bg-accent/50">Clear</button>
              </div>
            </div>

            <div className="rounded-xl border divide-y overflow-hidden">
              {permsByGroup.map((g) => {
                if (g.perms.length === 0) return null;
                const enabledPermIds = g.perms.filter((p) => !p.disabled).map((p) => p.id);
                const allOn = enabledPermIds.length > 0 && enabledPermIds.every((p) => permissions.includes(p));
                const someOn = enabledPermIds.some((p) => permissions.includes(p));
                return (
                  <div key={g.key} className="px-4 py-3 bg-background/40">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-foreground">
                        {g.label}
                      </p>
                      <button
                        onClick={() => toggleGroup(enabledPermIds)}
                        disabled={enabledPermIds.length === 0}
                        className={cn(
                          "text-[10.5px] font-medium px-2 py-0.5 rounded-md transition-colors disabled:opacity-40",
                          allOn
                            ? "bg-primary/10 text-primary"
                            : someOn
                              ? "bg-warning/10 text-[color:var(--warning)]"
                              : "bg-muted text-muted-foreground hover:bg-accent/50"
                        )}
                      >
                        {allOn ? "All" : someOn ? "Partial" : "None"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {g.perms.map((p) => {
                        const checked = permissions.includes(p.id);
                        const disabled = p.disabled;
                        return (
                          <label
                            key={p.id}
                            title={disabled ? "Permission is disabled globally" : undefined}
                            className={cn(
                              "flex items-start gap-2 rounded-lg px-2.5 py-2 transition-colors",
                              disabled
                                ? "bg-muted/30 opacity-60 cursor-not-allowed"
                                : checked
                                  ? "bg-primary/5 ring-1 ring-primary/20 cursor-pointer"
                                  : "hover:bg-accent/40 cursor-pointer"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggle(p.id)}
                              className="mt-0.5 h-3.5 w-3.5 accent-primary cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5 text-[11.5px] font-medium leading-tight">
                                {p.label}
                                {disabled && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                                {!p.isBuiltIn && (
                                  <span className="text-[9px] font-medium px-1 py-0 rounded bg-primary/10 text-primary">custom</span>
                                )}
                              </span>
                              <span className="block text-[10px] font-mono text-muted-foreground mt-0.5">
                                {p.id}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t bg-background/40 px-6 py-3 flex items-center justify-between gap-3">
          <Badge tone={permissions.length === 0 ? "neutral" : "info"}>
            {permissions.length} permission{permissions.length === 1 ? "" : "s"} selected
          </Badge>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-[11.5px] font-medium hover:bg-accent/50"
            >
              Cancel
            </button>
            <button
              disabled={!valid}
              onClick={() => onSave({ label: label.trim(), description: description.trim(), tone, permissions })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mode === "create" ? "Create role" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
