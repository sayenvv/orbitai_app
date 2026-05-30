"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  UserCircle2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  Key,
  Smartphone,
  Bell,
  Globe,
  Clock,
  Save,
  Camera,
  CheckCircle2,
  LogOut,
  Activity,
  Eye,
  EyeOff,
  AlertTriangle,
  Trash2,
  Copy,
  Plus,
  ChevronRight,
  Building2,
  Crown,
  Languages,
  Palette,
} from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import { useRoles } from "@/store/team-store";
import { initials } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger" | "violet" | "neutral";

type TabId = "general" | "notifications" | "security" | "sessions" | "api";

const TABS: { id: TabId; label: string; icon: typeof UserCircle2 }[] = [
  { id: "general", label: "General", icon: UserCircle2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "sessions", label: "Sessions", icon: Smartphone },
  { id: "api", label: "API tokens", icon: Key },
];

export default function ProfilePage() {
  const roleId = useAuthStore((s) => s.role);
  const roles = useRoles();
  const roleDef = useMemo(() => roles.find((r) => r.id === roleId) ?? roles[0], [roles, roleId]);

  const [tab, setTab] = useState<TabId>("general");
  const [toast, setToast] = useState<string | null>(null);

  // General
  const [displayName, setDisplayName] = useState("Avery Quinn");
  const [email] = useState("avery.quinn@orbit.ai");
  const [phone, setPhone] = useState("+1 (415) 555-0192");
  const [title, setTitle] = useState("Head of Platform Operations");
  const [department, setDepartment] = useState("Platform");
  const [location, setLocation] = useState("San Francisco, CA");
  const [bio, setBio] = useState("Running point on access, billing & reliability for Clovai. Reach out anytime in #ops or via email.");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [language, setLanguage] = useState("English (US)");
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  // Notifications
  const [emailDigest, setEmailDigest] = useState<"realtime" | "daily" | "weekly" | "off">("daily");
  const [notif, setNotif] = useState({
    security: { email: true, inapp: true, sms: true },
    billing: { email: true, inapp: true, sms: false },
    system: { email: false, inapp: true, sms: false },
    member: { email: true, inapp: true, sms: false },
    report: { email: true, inapp: false, sms: false },
  });

  // Security
  const [twoFA, setTwoFA] = useState(true);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  // Sessions
  type SessionRow = { id: string; device: string; browser: string; ip: string; location: string; lastActive: string; current: boolean };
  const [sessions, setSessions] = useState<SessionRow[]>([
    { id: "s1", device: "MacBook Pro 16\"", browser: "Chrome 132", ip: "73.118.42.18", location: "San Francisco, CA · US", lastActive: "Active now", current: true },
    { id: "s2", device: "iPhone 16 Pro", browser: "Safari iOS 18", ip: "73.118.42.18", location: "San Francisco, CA · US", lastActive: "12 min ago", current: false },
    { id: "s3", device: "Windows desktop", browser: "Edge 129", ip: "98.142.11.220", location: "Austin, TX · US", lastActive: "Yesterday, 18:42", current: false },
    { id: "s4", device: "Linux server", browser: "Firefox 128", ip: "165.227.88.4", location: "New York, NY · US", lastActive: "3 days ago", current: false },
  ]);

  // API tokens
  type TokenRow = { id: string; label: string; prefix: string; scopes: string[]; createdAt: string; lastUsed: string };
  const [tokens, setTokens] = useState<TokenRow[]>([
    { id: "tok_001", label: "CI deploy", prefix: "orb_live_8f2…d41a", scopes: ["read:users", "read:logs"], createdAt: "Mar 14, 2026", lastUsed: "2h ago" },
    { id: "tok_002", label: "Billing exporter", prefix: "orb_live_2c9…77bd", scopes: ["read:billing", "export:payments"], createdAt: "Jan 02, 2026", lastUsed: "Yesterday" },
  ]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  return (
    <>
      <PageHeader
        title="Profile"
        description="Manage your personal info, notification preferences and account security."
        actions={
          <button
            onClick={() => flash("Signed out (demo).")}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        }
      />
      <PageBody className="space-y-4">
        {toast && (
          <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-[12px] text-[color:var(--success)] inline-flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {toast}
          </div>
        )}

        {/* Hero card */}
        <div className="premium-card overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/25 via-chart-4/25 to-chart-2/25 relative">
            <button
              onClick={() => flash("Cover photo updated.")}
              className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-background/70 backdrop-blur px-2 py-1 text-[10.5px] font-medium border hover:bg-background"
            >
              <Camera className="h-3 w-3" />
              Change cover
            </button>
          </div>
          <div className="px-5 pb-5 -mt-10">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div className="flex items-end gap-4">
                <div className="relative">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-chart-4 ring-4 ring-background flex items-center justify-center text-lg font-bold text-white shadow-lg">
                    {initials(displayName)}
                  </div>
                  <button
                    onClick={() => flash("Avatar updated.")}
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background border shadow-md flex items-center justify-center hover:bg-accent"
                    title="Change avatar"
                  >
                    <Camera className="h-3 w-3" />
                  </button>
                  <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-[color:var(--success)] ring-2 ring-background" />
                </div>
                <div className="pb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-lg font-semibold">{displayName}</h2>
                    {roleDef && (
                      <Badge tone={roleDef.tone as Tone}>
                        <span className="inline-flex items-center gap-1">
                          <Crown className="h-2.5 w-2.5" />
                          {roleDef.label}
                        </span>
                      </Badge>
                    )}
                    <Badge tone="success">Active</Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{title} · {department}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{email}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</span>
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Joined Aug 14, 2024</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/access/audit"
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <Activity className="h-3.5 w-3.5" />
                  My activity
                </Link>
                <button
                  onClick={() => flash("Profile saved.")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save changes
                </button>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <Stat icon={Activity} label="Sessions (30d)" value="142" tone="info" />
              <Stat icon={ShieldCheck} label="2FA" value={twoFA ? "Enabled" : "Disabled"} tone={twoFA ? "success" : "danger"} />
              <Stat icon={Key} label="API tokens" value={String(tokens.length)} tone="violet" />
              <Stat icon={Clock} label="Last sign-in" value="Active now" tone="success" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="premium-card p-1 inline-flex flex-wrap gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-medium transition-colors ${
                  active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "general" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Section title="Personal information" description="How you appear across the admin app." className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Display name">
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Email" hint="Used for sign-in and critical alerts.">
                  <input value={email} readOnly className={`${inputCls} bg-muted/30 cursor-not-allowed`} />
                </Field>
                <Field label="Phone">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Job title">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Department">
                  <div className="relative">
                    <Building2 className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={department} onChange={(e) => setDepartment(e.target.value)} className={`${inputCls} pl-8`} />
                  </div>
                </Field>
                <Field label="Location">
                  <div className="relative">
                    <MapPin className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={location} onChange={(e) => setLocation(e.target.value)} className={`${inputCls} pl-8`} />
                  </div>
                </Field>
              </div>
              <Field label="Bio" hint={`${bio.length}/280`}>
                <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} rows={3} className={`${inputCls} resize-none`} />
              </Field>
            </Section>

            <Section title="Preferences" description="Personalize your admin experience.">
              <Field label="Timezone">
                <div className="relative">
                  <Clock className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={`${inputCls} pl-8`}>
                    <option>America/Los_Angeles</option>
                    <option>America/New_York</option>
                    <option>Europe/London</option>
                    <option>Europe/Berlin</option>
                    <option>Asia/Tokyo</option>
                    <option>Asia/Kolkata</option>
                    <option>Australia/Sydney</option>
                  </select>
                </div>
              </Field>
              <Field label="Language">
                <div className="relative">
                  <Languages className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className={`${inputCls} pl-8`}>
                    <option>English (US)</option>
                    <option>English (UK)</option>
                    <option>Français</option>
                    <option>Deutsch</option>
                    <option>日本語</option>
                    <option>हिन्दी</option>
                  </select>
                </div>
              </Field>
              <Field label="Theme">
                <div className="grid grid-cols-3 gap-1.5">
                  {(["system", "light", "dark"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`rounded-md border px-2 py-1.5 text-[11px] capitalize ${
                        theme === t ? "bg-accent ring-1 ring-primary/40" : "bg-background hover:bg-accent/50"
                      }`}
                    >
                      <Palette className="h-3 w-3 inline mr-1" />
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Density">
                <div className="grid grid-cols-2 gap-1.5">
                  {(["comfortable", "compact"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDensity(d)}
                      className={`rounded-md border px-2 py-1.5 text-[11px] capitalize ${
                        density === d ? "bg-accent ring-1 ring-primary/40" : "bg-background hover:bg-accent/50"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>
          </div>
        )}

        {tab === "notifications" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Section title="Delivery" description="How often you want updates summarized." className="lg:col-span-1">
              <div className="space-y-1.5">
                {(["realtime", "daily", "weekly", "off"] as const).map((d) => (
                  <label
                    key={d}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer text-[12px] ${
                      emailDigest === d ? "bg-accent ring-1 ring-primary/40" : "bg-background hover:bg-accent/40"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input type="radio" name="digest" checked={emailDigest === d} onChange={() => setEmailDigest(d)} className="accent-primary" />
                      <span className="capitalize font-medium">
                        {d === "off" ? "Off — no email" : `${d} digest`}
                      </span>
                    </span>
                    <span className="text-[10.5px] text-muted-foreground">
                      {d === "realtime" && "Every event"}
                      {d === "daily" && "Once a day"}
                      {d === "weekly" && "Mondays"}
                      {d === "off" && "—"}
                    </span>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Notification matrix" description="Toggle which categories reach which channels." className="lg:col-span-2">
              <div className="overflow-x-auto">
                <table className="w-full text-[11.5px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="font-medium py-2 pr-2">Category</th>
                      <th className="font-medium py-2 px-2 text-center">Email</th>
                      <th className="font-medium py-2 px-2 text-center">In-app</th>
                      <th className="font-medium py-2 px-2 text-center">SMS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(Object.keys(notif) as (keyof typeof notif)[]).map((cat) => (
                      <tr key={cat}>
                        <td className="py-2 pr-2 capitalize font-medium">{cat}</td>
                        {(["email", "inapp", "sms"] as const).map((ch) => (
                          <td key={ch} className="py-2 px-2 text-center">
                            <Toggle
                              checked={notif[cat][ch]}
                              onChange={(v) => setNotif((p) => ({ ...p, [cat]: { ...p[cat], [ch]: v } }))}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => flash("Notification preferences saved.")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save preferences
                </button>
              </div>
            </Section>
          </div>
        )}

        {tab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Password" description="Use a strong, unique password.">
              <Field label="Current password">
                <div className="relative">
                  <input type={showCurrent ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} className={`${inputCls} pr-9`} placeholder="••••••••" />
                  <button onClick={() => setShowCurrent((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" type="button">
                    {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </Field>
              <Field label="New password">
                <div className="relative">
                  <input type={showNew ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} className={`${inputCls} pr-9`} placeholder="At least 12 characters" />
                  <button onClick={() => setShowNew((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" type="button">
                    {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <PasswordStrength value={next} />
              </Field>
              <Field label="Confirm new password">
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} placeholder="Re-enter new password" />
                {confirm && next && confirm !== next && (
                  <p className="text-[10.5px] text-destructive mt-1 inline-flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" /> Passwords don&apos;t match
                  </p>
                )}
              </Field>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (!current || !next || next !== confirm) return;
                    setCurrent(""); setNext(""); setConfirm("");
                    flash("Password updated.");
                  }}
                  disabled={!current || !next || next !== confirm || next.length < 12}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Update password
                </button>
              </div>
            </Section>

            <Section title="Two-factor authentication" description="Add a second layer of protection at sign-in.">
              <div className={`rounded-xl border p-3 flex items-start gap-3 ${twoFA ? "bg-success/5 border-success/30" : "bg-warning/5 border-warning/30"}`}>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${twoFA ? "bg-success/15 text-[color:var(--success)]" : "bg-warning/15 text-[color:var(--warning)]"}`}>
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold">{twoFA ? "Authenticator app enabled" : "2FA is disabled"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {twoFA
                      ? "We'll ask for a 6-digit code from your authenticator on every new sign-in."
                      : "We strongly recommend enabling 2FA — it blocks ~99% of account compromises."}
                  </p>
                </div>
                <Toggle checked={twoFA} onChange={(v) => { setTwoFA(v); flash(v ? "2FA enabled." : "2FA disabled."); }} />
              </div>
              <Field label="Backup codes" hint="Save these somewhere safe — they're shown once.">
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                  {["4F3A-91KQ","B72X-PD08","Z9HW-44LR","M2CV-QY7T","8GTE-J19N","WX0P-6BAS"].map((c) => (
                    <div key={c} className="rounded-md border bg-background/60 px-2 py-1.5 flex items-center justify-between">
                      <span>{c}</span>
                      <button onClick={() => { navigator.clipboard?.writeText(c); flash("Code copied."); }} className="text-muted-foreground hover:text-foreground">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </Field>
              <Field label="Recovery email">
                <input defaultValue="avery.personal@gmail.com" className={inputCls} />
              </Field>
            </Section>
          </div>
        )}

        {tab === "sessions" && (
          <Section title="Active sessions" description="Devices currently signed in to your Orbit Admin account.">
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li key={s.id} className={`rounded-lg border p-3 flex items-center gap-3 ${s.current ? "ring-1 ring-primary/30 bg-primary/5" : ""}`}>
                  <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[12.5px] font-semibold">{s.device}</p>
                      {s.current && <Badge tone="success">This device</Badge>}
                    </div>
                    <p className="text-[10.5px] text-muted-foreground mt-0.5">
                      {s.browser} · {s.location} · IP {s.ip}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10.5px] text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> {s.lastActive}
                    </p>
                    {!s.current && (
                      <button
                        onClick={() => { setSessions((p) => p.filter((x) => x.id !== s.id)); flash("Session revoked."); }}
                        className="mt-1 inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[10.5px] font-medium text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" /> Revoke
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setSessions((p) => p.filter((s) => s.current)); flash("All other sessions signed out."); }}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out everywhere else
              </button>
            </div>
          </Section>
        )}

        {tab === "api" && (
          <Section
            title="API tokens"
            description="Use tokens to authenticate scripts and integrations on your behalf."
            actions={
              <button
                onClick={() => {
                  const id = `tok_${Math.random().toString(36).slice(2, 8)}`;
                  setTokens((p) => [
                    { id, label: "New token", prefix: `orb_live_${Math.random().toString(36).slice(2, 5)}…${Math.random().toString(36).slice(2, 6)}`, scopes: ["read:users"], createdAt: "Just now", lastUsed: "Never" },
                    ...p,
                  ]);
                  flash("Token created — copy it now, it won't be shown again.");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                Generate token
              </button>
            }
          >
            {tokens.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Key className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">No API tokens yet</p>
                <p className="text-[11px] text-muted-foreground mt-1">Generate one to start using the Orbit Admin API.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60 rounded-lg border overflow-hidden">
                {tokens.map((t) => (
                  <li key={t.id} className="p-3 flex items-center gap-3 hover:bg-accent/40">
                    <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Key className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold">{t.label}</p>
                      <p className="text-[10.5px] text-muted-foreground font-mono">{t.prefix}</p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {t.scopes.map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
                      </div>
                    </div>
                    <div className="text-right text-[10.5px] text-muted-foreground shrink-0">
                      <p>Created {t.createdAt}</p>
                      <p>Last used {t.lastUsed}</p>
                    </div>
                    <button
                      onClick={() => { setTokens((p) => p.filter((x) => x.id !== t.id)); flash("Token revoked."); }}
                      className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[10.5px] font-medium text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" /> Revoke
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {/* Danger zone */}
      </PageBody>
    </>
  );
}

/* ---------------- helpers ---------------- */

const inputCls = "w-full rounded-lg border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40";

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: string; tone: Tone }) {
  const t: Record<Tone, string> = {
    info: "from-info/15 to-info/5 text-info",
    success: "from-success/15 to-success/5 text-[color:var(--success)]",
    warning: "from-warning/15 to-warning/5 text-[color:var(--warning)]",
    danger: "from-destructive/15 to-destructive/5 text-destructive",
    violet: "from-chart-4/15 to-chart-4/5 text-chart-4",
    neutral: "from-muted/40 to-muted/10 text-muted-foreground",
  };
  return (
    <div className="rounded-xl border bg-background/60 p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${t[tone]} flex items-center justify-center ring-1 ring-border/40`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold leading-tight truncate">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, description, children, className, actions }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={`premium-card p-4 space-y-4 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold">{title}</h3>
          {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium">{label}</label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-muted"
      }`}
      aria-checked={checked}
      role="switch"
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow ring-1 ring-border/40 transition-transform ${
        checked ? "translate-x-4" : "translate-x-0.5"
      }`} />
    </button>
  );
}

function PasswordStrength({ value }: { value: string }) {
  const score = (() => {
    let s = 0;
    if (value.length >= 12) s++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s++;
    if (/[0-9]/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return s;
  })();
  if (!value) return null;
  const labels = ["Very weak", "Weak", "Okay", "Good", "Strong"];
  const colors = ["bg-destructive", "bg-destructive", "bg-[color:var(--warning)]", "bg-info", "bg-[color:var(--success)]"];
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${colors[score]} transition-all`} style={{ width: `${(score / 4) * 100}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground w-16 text-right">{labels[score]}</span>
    </div>
  );
}
