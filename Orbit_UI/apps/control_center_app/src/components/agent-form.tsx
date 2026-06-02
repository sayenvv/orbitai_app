"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, ArrowLeft, Check, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { ICON_OPTIONS, COLOR_OPTIONS, isKnownAgentIconKey, isKnownAgentColorKey } from "@/lib/agent-options";
import { AgentListingIcon } from "@orbit/ui";
import {
  controlApi,
  toAgentCreateBody,
  toAgentUpdateBody,
  ApiError,
} from "@/lib/orbit-api";
import {
  validateAgentForm,
  hasFieldErrors,
  apiErrorToFieldErrors,
  type AgentFieldErrors,
} from "@/lib/agent-validation";
import { FormAlert } from "@/components/form-alert";
import { cn } from "@/lib/utils";

function iconKeyFor(initial: AgentInitial | undefined): string {
  if (!initial) return "Bot";
  if (initial.iconKey && isKnownAgentIconKey(initial.iconKey)) {
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
  /** One-time banner after redirect from create flow. */
  flashSuccess?: string;
};

type TouchedFields = Partial<Record<keyof AgentFieldErrors, boolean>>;

export function AgentForm({ mode, agent, flashSuccess }: AgentFormProps) {
  const router = useRouter();
  const [name, setName] = useState(agent?.name ?? "");
  const [slug, setSlug] = useState(agent?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [shortName, setShortName] = useState(agent?.shortName ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [status, setStatus] = useState<AgentInitial["status"]>(agent?.status ?? "draft");
  const [iconKey, setIconKey] = useState<string>(iconKeyFor(agent));
  const [colorKey, setColorKey] = useState<string>(
    agent?.colorKey && isKnownAgentColorKey(agent.colorKey) ? agent.colorKey : "indigo",
  );
  const [systemPrompt, setSystemPrompt] = useState("");
  const [configLoading, setConfigLoading] = useState(mode === "edit");
  const [configLoadError, setConfigLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(flashSuccess ?? null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AgentFieldErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [submitted, setSubmitted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!flashSuccess) return;
    router.replace(window.location.pathname, { scroll: false });
  }, [flashSuccess, router]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 6000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (mode !== "edit" || !agent?.id) return;
    setConfigLoading(true);
    setConfigLoadError(null);
    controlApi
      .getConfiguration(agent.id)
      .then((cfg) => setSystemPrompt(cfg.system_prompt))
      .catch(() => setConfigLoadError("Could not load system prompt. You can still save other changes."))
      .finally(() => setConfigLoading(false));
  }, [mode, agent?.id]);

  const SelectedIcon = useMemo(
    () => ICON_OPTIONS.find((o) => o.key === iconKey)?.icon ?? Bot,
    [iconKey],
  );
  const selectedColor = useMemo(
    () => COLOR_OPTIONS.find((c) => c.key === colorKey) ?? COLOR_OPTIONS[0],
    [colorKey],
  );

  const formValues = {
    name,
    slug,
    shortName,
    description,
    systemPrompt,
  };

  function showFieldError(key: keyof AgentFieldErrors): string | undefined {
    if (!submitted && !touched[key]) return undefined;
    return fieldErrors[key];
  }

  function touchField(key: keyof AgentFieldErrors) {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const errors = validateAgentForm(formValues, { mode });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      if (errors[key]) next[key] = errors[key];
      return next;
    });
  }

  function handleNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
    if (submitted || touched.name) {
      const errors = validateAgentForm({ ...formValues, name: v }, { mode });
      setFieldErrors((prev) => ({ ...prev, name: errors.name }));
    }
  }

  async function handleSave() {
    if (saving) return;
    setSubmitted(true);
    setSuccessMessage(null);

    const errors = validateAgentForm(formValues, { mode });
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        shortName: (shortName.trim() || name.trim().split(" ")[0]) ?? "",
        description: description.trim(),
        status,
        iconKey,
        colorKey,
      };

      if (mode === "create") {
        const created = await controlApi.createAgent(
          toAgentCreateBody({ slug, ...body }),
        );
        if (systemPrompt.trim()) {
          await controlApi.updateConfiguration(created.id, {
            system_prompt: systemPrompt.trim(),
          });
        }
        await queryClient.invalidateQueries({ queryKey: ["control", "agents"] });
        router.push(`/agents/${created.id}/edit?created=1`);
        return;
      }

      if (!agent?.id) return;
      await controlApi.updateAgent(agent.id, toAgentUpdateBody(body));
      if (systemPrompt.trim()) {
        await controlApi.updateConfiguration(agent.id, {
          system_prompt: systemPrompt.trim(),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["control", "agents"] });
      await queryClient.invalidateQueries({ queryKey: ["control", "agents", agent.id] });
      setFieldErrors({});
      setSuccessMessage("Changes saved successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(apiErrorToFieldErrors(err.message, err.status));
      } else {
        setFieldErrors({ form: "Save failed. Try again." });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!agent?.id || deleting) return;
    if (!window.confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await controlApi.deleteAgent(agent.id);
      await queryClient.invalidateQueries({ queryKey: ["control", "agents"] });
      router.push("/agents");
    } catch (err) {
      setFieldErrors({
        form: err instanceof ApiError ? err.message : "Delete failed. Try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const validationSummary =
    submitted && hasFieldErrors(fieldErrors) ? "Fix the highlighted fields before saving." : null;

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
      </div>

      {successMessage && (
        <FormAlert variant="success" title="Success">
          {successMessage}
        </FormAlert>
      )}

      {fieldErrors.form && (
        <FormAlert variant="error" title="Could not save">
          {fieldErrors.form}
        </FormAlert>
      )}

      {validationSummary && !fieldErrors.form && (
        <FormAlert variant="error" title="Validation failed">
          {validationSummary}
        </FormAlert>
      )}

      {configLoadError && (
        <FormAlert variant="info" title="Configuration">
          {configLoadError}
        </FormAlert>
      )}

      {/* Preview card */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-card/40 p-5">
        <div className="flex items-center gap-4">
          <AgentListingIcon
            iconKey={iconKey}
            colorKey={colorKey}
            size="lg"
            className="h-14 w-14 rounded-xl shadow-md"
          />
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
          <Field label="Name" required error={showFieldError("name")}>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => touchField("name")}
              placeholder="e.g. Trip Adviser"
              className={inputClass(showFieldError("name"))}
              aria-invalid={Boolean(showFieldError("name"))}
            />
          </Field>
          <Field
            label="Slug"
            required
            hint={mode === "edit" ? "Slug cannot be changed after creation." : "Used in URLs."}
            error={showFieldError("slug")}
          >
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              onBlur={() => touchField("slug")}
              placeholder="trip-adviser"
              className={cn(inputClass(showFieldError("slug")), "font-mono")}
              disabled={mode === "edit"}
              aria-invalid={Boolean(showFieldError("slug"))}
            />
          </Field>
          <Field label="Short name" hint="Compact label used in tight UI." error={showFieldError("shortName")}>
            <input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              onBlur={() => touchField("shortName")}
              placeholder="Trip"
              className={inputClass(showFieldError("shortName"))}
              aria-invalid={Boolean(showFieldError("shortName"))}
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
            <Field label="Description" error={showFieldError("description")}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => touchField("description")}
                placeholder="One-line summary of what this agent does."
                rows={2}
                className={cn(inputClass(showFieldError("description")), "resize-none")}
                aria-invalid={Boolean(showFieldError("description"))}
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
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {ICON_OPTIONS.map(({ key, icon: Icon, label }) => {
              const active = key === iconKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIconKey(key)}
                  title={label}
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
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2">
            {COLOR_OPTIONS.map((c) => {
              const active = c.key === colorKey;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColorKey(c.key)}
                  title={c.label}
                  style={{ background: c.gradientCss }}
                  className={
                    "h-10 rounded-lg shadow-sm transition-all " +
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
        <Field label="System prompt" error={showFieldError("systemPrompt")}>
          {configLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading system prompt…
            </div>
          ) : (
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              onBlur={() => touchField("systemPrompt")}
              placeholder="You are a helpful assistant that..."
              rows={5}
              className={cn(inputClass(showFieldError("systemPrompt")), "font-mono text-[12px] resize-y")}
              aria-invalid={Boolean(showFieldError("systemPrompt"))}
            />
          )}
        </Field>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between sticky bottom-0 bg-background/95 backdrop-blur border-t -mx-6 px-6 py-3">
        <div>
          {mode === "edit" && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
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
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create agent"
                : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function inputClass(error?: string) {
  return cn(
    "form-input",
    error && "border-destructive focus-visible:ring-destructive/30",
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
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {children}
      {error ? (
        <span className="block text-[10px] text-destructive">{error}</span>
      ) : hint ? (
        <span className="block text-[10px] text-muted-foreground/70">{hint}</span>
      ) : null}
    </label>
  );
}
