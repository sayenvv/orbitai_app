"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { COLOR_OPTIONS } from "@/lib/agent-options";
import { cn } from "@/lib/utils";
import { controlApi, getApiErrorMessage, type ApiControlTheme } from "@/lib/orbit-api";
import { FormAlert } from "@/components/form-alert";

type Props = {
  agentId: string;
  initialTheme: ApiControlTheme;
};

const PRESETS = COLOR_OPTIONS.map((c) => ({
  id: c.key,
  name: c.label,
  color: c.gradient,
}));

export function ThemeEditor({ agentId, initialTheme }: Props) {
  const [theme, setTheme] = useState(initialTheme);
  const [savedTheme, setSavedTheme] = useState(initialTheme);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dirty = JSON.stringify(theme) !== JSON.stringify(savedTheme);

  async function selectPreset(colorKey: string) {
    setTheme((prev) => ({ ...prev, color_key: colorKey }));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await controlApi.updateAgentTheme(agentId, theme);
      setTheme(saved);
      setSavedTheme(saved);
      setSuccess("Theme saved.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save theme."));
    } finally {
      setSaving(false);
    }
  }

  const tokenRows = [
    { label: "Border radius", key: "border_radius" as const },
    { label: "Density", key: "density" as const },
    { label: "Font (sans)", key: "font_sans" as const },
    { label: "Bubble style", key: "bubble_style" as const },
    { label: "Dark mode", key: "dark_mode" as const },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <FormAlert variant="error" title="Save failed">
          {error}
        </FormAlert>
      )}
      {success && (
        <FormAlert variant="success" title="Saved">
          {success}
        </FormAlert>
      )}

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Color Preset
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {PRESETS.map((p) => {
            const isCurrent = theme.color_key === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => void selectPreset(p.id)}
                className={cn(
                  "rounded-xl border bg-card p-4 text-left hover:shadow-sm transition-shadow",
                  isCurrent && "ring-2 ring-primary",
                )}
              >
                <div className={cn("h-16 w-full rounded-lg bg-gradient-to-br mb-3 shadow-inner", p.color)} />
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isCurrent ? "Current" : "primary scale"}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="max-w-3xl">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Tokens
        </h2>
        <div className="rounded-xl border bg-card divide-y">
          {tokenRows.map((row) => (
            <div key={row.key} className="flex items-center justify-between px-4 py-3 gap-4">
              <span className="text-sm">{row.label}</span>
              <input
                value={theme[row.key]}
                onChange={(e) =>
                  setTheme((prev) => ({
                    ...prev,
                    [row.key]: e.target.value,
                  }))
                }
                className="w-40 rounded-md border bg-background px-2 py-1 text-[11px] font-mono text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save theme
        </button>
      </div>
    </div>
  );
}
