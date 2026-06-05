"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import {
  X,
  User,
  Mail,
  Shield,
  Calendar,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogOut,
} from "lucide-react";
import { authApi, mapApiUser } from "@/lib/orbit-api";
import { useServerLogout } from "@/hooks/use-auth";
import { useTokenUsage } from "@/hooks/use-token-usage";
import { TokenUsageMeter } from "@/components/token-usage-meter";

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

export function ProfilePanel({ open, onClose }: ProfilePanelProps) {
  const user = useAuthStore((state) => state.user);
  const handleSignOut = useServerLogout();
  const { usage, loading: usageLoading } = useTokenUsage();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  useEffect(() => {
    if (open) {
      setSuccessMsg("");
      setErrorMsg("");
    }
  }, [open]);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  const isDirty = name.trim() !== (user?.name || "");

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === user?.name) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const data = await authApi.updateProfile(name.trim());
      useAuthStore.getState().setUser(mapApiUser(data));
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }, [name, user?.name]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-x safe-top safe-bottom">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="glass-surface glass-composer glass-modal relative mx-auto flex w-full max-w-xl max-h-[min(85dvh,640px)] flex-col rounded-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-semibold">Account Settings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage your profile and preferences</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-accent transition-colors text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Profile Banner */}
        <div className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--workspace-tab-active-bg)] to-[color-mix(in_oklab,var(--workspace-tab-active-bg)_65%,var(--foreground)_35%)] shadow-[var(--workspace-tab-shadow)] ring-1 ring-[var(--workspace-tab-border)]">
                <span className="text-lg font-bold text-[var(--workspace-tab-active-fg)]">{initials}</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-card flex items-center justify-center">
                <CheckCircle2 className="h-2.5 w-2.5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold truncate">{user?.name || "User"}</h3>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                  <Shield className="h-2.5 w-2.5" />
                  {user?.role === "admin" ? "Admin" : "Student"}
                </span>
                {memberSince && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-2.5 w-2.5" />
                    Since {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b shrink-0">
          {[
            { id: "profile" as const, label: "Profile", icon: User },
            { id: "security" as const, label: "Security", icon: KeyRound },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "profile" && (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="profile-name" className="text-sm font-medium">
                    Full Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="glass-input flex h-10 w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none transition-shadow"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="profile-email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="profile-email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="flex h-10 w-full rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed pr-8"
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Contact support to change your email</p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-3">
                  <p className="text-sm font-medium">Monthly usage</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(usage?.plan ?? "free").charAt(0).toUpperCase()}
                    {(usage?.plan ?? "free").slice(1)} plan
                  </p>
                </div>
                <TokenUsageMeter usage={usage} loading={usageLoading} compact />
              </div>

              {/* Account info */}
              <div className="rounded-lg border divide-y">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Email Verification</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                      user?.emailVerified
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {user?.emailVerified ? (
                      <><CheckCircle2 className="h-3 w-3" /> Verified</>
                    ) : (
                      <><AlertCircle className="h-3 w-3" /> Pending</>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Account ID</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {user?.id?.slice(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Messages */}
              {successMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">{successMsg}</p>
                </div>
              )}
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{errorMsg}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !isDirty}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === "security" && (
            <div className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Password</label>
                  <input
                    type="password"
                    className="glass-input flex h-10 w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none transition-shadow"
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <input
                    type="password"
                    className="glass-input flex h-10 w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none transition-shadow"
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <input
                    type="password"
                    className="glass-input flex h-10 w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none transition-shadow"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
                >
                  <KeyRound className="h-4 w-4" />
                  Update Password
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t px-6 py-4">
          <button
            type="button"
            onClick={() => {
              void handleSignOut().then(onClose);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
