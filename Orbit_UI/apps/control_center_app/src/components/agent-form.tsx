"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, ArrowLeft, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { ICON_OPTIONS, COLOR_OPTIONS } from "@/lib/agent-options";

function iconKeyFor(initial: AgentInitial | undefined): string {
  if (!initial) return "Bot";
  if (initial.iconKey && ICON_OPTIONS.some((o) => o.key === initial.iconKey)) {
    return initial.iconKey;
  }
  return "Bot";
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type AgentInitial = {
  /** UUID — canonical reference. */
  id: string;
  /** URL-friendly slug. */
  slug: string;
  name: string;
  shortName: string;
  description: string;
  status: "active" | "draft";
  iconKey?: string;
  colorKey?: string;
};

type AgentFormProps = {
  mode: "create" | "edit";
  agent?: AgentInitial;
};

export function AgentForm({ mode, agent }: AgentFormProps) {
  const router = useRouter();
  const [name, setName] = useState(agent?.name ?? "");
  const [slug, setSlug] = useState(agent?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [shortName, setShortName] = useState(agent?.shortName ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [status, setStatus] = useState<AgentInitial["status"]>(agent?.status ?? "draft");
  const [iconKey, setIconKey] = useState<string>(iconKeyFor(agent));
  const [colorKey, setColorKey] = useState<string>(
    agent?.colorKey && COLOR_OPTIONS.some((c) => c.key === agent.colorKey) ? agent.colorKey : "indigo",
  );
  const [systemPrompt, setSystemPrompt] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const SelectedIcon = useMemo(
    () => ICON_OPTIONS.find((o) => o.key === iconKey)?.icon ?? Bot,
    [iconKey],
  );
  const selectedColor = useMemo(
    () => COLOR_OPTIONS.find((c) => c.key === colorKey) ?? COLOR_OPTIONS[0],
    [colorKey],
  );

  const slugValid = /^[a-z0-9-]{2,}$/.test(slug);
  const canSave = name.trim().length > 1 && slugValid;

  function handleNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function handleSave() {
    if (!canSave) return;
    // No backend persistence yet — stores into a local "draft" snapshot.
    const now = new Date();
    setSavedAt(now.toLocaleTimeString());
    if (typeof window !== "undefined") {
      const payload = {
        id: agent?.id,
        slug,
        name,
        shortName: shortName || name.split(" ")[0],
        description,
        status,
        iconKey,
        colorKey,
        gradient: selectedColor.gradient,
        systemPrompt,
        updatedAt: now.toISOString(),
      };
      const key = mode === "create" ? "admin:agents:drafts" : `admin:agents:edit:${agent?.id}`;
      try {
        if (mode === "create") {
          const raw = window.localStorage.getItem(key);
          const list = raw ? JSON.parse(raw) : [];
          list.push(payload);
          window.localStorage.setItem(key, JSON.stringify(list));
        } else {
          window.localStorage.setItem(key, JSON.stringify(payload));
        }
      } catch {
        // ignore quota errors
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/agents"
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to agents
        </Link>
        {savedAt && (
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
            <Check className="h-3 w-3" />
            Saved at {savedAt}
          </span>
        )}
      </div>

      {/* Preview card */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-card/40 p-5">
        <div className="flex items-center gap-4">
          <div
            className={`h-14 w-14 rounded-xl bg-gradient-to-br ${selectedColor.gradient} flex items-center justify-center shadow-md`}
          >
            <SelectedIcon className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight truncate">
              {name || "Untitled agent"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {description || "Add a short description to help users recognize this agent."}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                  (status === "active"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground")
                }
              >
                {status}
              </span>
              <code className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                {slug || "agent-slug"}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Identity */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Identity</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Basic information about this agent.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" required>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Trip Adviser"
              className="form-input"
            />
          </Field>
          <Field
            label="Slug"
            required
            hint={slug && !slugValid ? "Lowercase letters, numbers, and dashes only." : "Used in URLs."}
            error={!!slug && !slugValid}
          >
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="trip-adviser"
              className="form-input font-mono"
              disabled={mode === "edit"}
            />
          </Field>
          <Field label="Short name" hint="Compact label used in tight UI.">
            <input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="Trip"
              className="form-input"
            />
          </Field>
          <Field label="Status">
            <div className="flex rounded-lg border p-0.5 bg-muted/30 w-fit">
              {(["active", "draft"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={
                    "px-3 py-1 text-xs rounded-md transition-colors " +
                    (status === s
                      ? "bg-card shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One-line summary of what this agent does."
                rows={2}
                className="form-input resize-none"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Icon and accent color shown in cards and the rail.</p>
        </div>

        <Field label="Icon">
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-15 gap-2">
            {ICON_OPTIONS.map(({ key, icon: Icon }) => {
              const active = key === iconKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIconKey(key)}
                  title={key}
                  className={
                    "h-10 w-10 rounded-lg border flex items-center justify-center transition-all " +
                    (active
                      ? `bg-gradient-to-br ${selectedColor.gradient} text-white border-transparent shadow-sm`
                      : "bg-card hover:bg-accent text-muted-foreground hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Accent color">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {COLOR_OPTIONS.map((c) => {
              const active = c.key === colorKey;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColorKey(c.key)}
                  title={c.label}
                  className={
                    "h-10 rounded-lg bg-gradient-to-br shadow-sm transition-all " +
                    c.gradient +
                    (active ? " ring-2 ring-offset-2 ring-offset-card ring-primary" : " opacity-80 hover:opacity-100")
                  }
                />
              );
            })}
          </div>
        </Field>
      </section>

      {/* Behavior */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Behavior</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Starter system prompt — full model and tool settings live in Configuration & Tools tabs.
          </p>
        </div>
        <Field label="System prompt">
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant that..."
            rows={5}
            className="form-input font-mono text-[12px] resize-y"
          />
        </Field>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between sticky bottom-0 bg-background/95 backdrop-blur border-t -mx-6 px-6 py-3">
        <div>
          {mode === "edit" && (
            <button
              type="button"
              onClick={() => router.push("/agents")}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete agent
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/agents"
            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="h-3.5 w-3.5" />
            {mode === "create" ? "Create agent" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {children}
      {hint && (
        <span
          className={
            "block text-[10px] " + (error ? "text-destructive" : "text-muted-foreground/70")
          }
        >
          {hint}
        </span>
      )}
    </label>
  );
}
