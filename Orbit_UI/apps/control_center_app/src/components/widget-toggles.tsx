"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Widget } from "@/lib/data";
import { cn } from "@/lib/utils";
import { controlApi, getApiErrorMessage } from "@/lib/orbit-api";
import { FormAlert } from "@/components/form-alert";

type Props = {
  agentId: string;
  widgets: Widget[];
  initialEnabledIds: string[];
};

export function WidgetToggles({ agentId, widgets, initialEnabledIds }: Props) {
  const [enabledIds, setEnabledIds] = useState<Set<string>>(() => new Set(initialEnabledIds));
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(initialEnabledIds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dirty =
    enabledIds.size !== savedIds.size ||
    [...enabledIds].some((id) => !savedIds.has(id));

  function toggle(widgetId: string) {
    setEnabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(widgetId)) next.delete(widgetId);
      else next.add(widgetId);
      return next;
    });
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await controlApi.updateAgentWidgets(agentId, [...enabledIds]);
      const next = new Set(response.enabled_widget_ids);
      setEnabledIds(next);
      setSavedIds(next);
      setSuccess("Widget settings saved.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save widgets."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
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

      <div className="rounded-xl border bg-card">
        {widgets.map((w, i) => {
          const Wicon = w.icon;
          const enabled = enabledIds.has(w.id);
          return (
            <div
              key={w.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                i !== widgets.length - 1 && "border-b",
              )}
            >
              <div className="h-9 w-9 rounded-lg bg-accent/60 flex items-center justify-center">
                <Wicon className="h-4 w-4 text-foreground/80" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none">{w.name}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{w.description}</p>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                {w.key}
              </span>
              <button
                type="button"
                aria-label={`Toggle ${w.name}`}
                aria-pressed={enabled}
                onClick={() => toggle(w.id)}
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  enabled ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                    enabled ? "left-[18px]" : "left-0.5",
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save widgets
        </button>
      </div>
    </div>
  );
}
