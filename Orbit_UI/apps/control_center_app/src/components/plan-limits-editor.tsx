"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import {
  controlApi,
  getApiErrorMessage,
  type ApiPlanLimit,
  type ApiPlanLimitPatch,
} from "@/lib/orbit-api";
import { FormAlert } from "@/components/form-alert";
import { Card, Section } from "@/components/ui/field";

function formatLimit(value: number | null): string {
  if (value == null) return "Unlimited";
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}K`;
  return String(value);
}

type DraftPlan = {
  label: string;
  tagline: string;
  features: string[];
  highlight: boolean;
  unlimited: boolean;
  tokenValue: string;
};

function toDraft(plan: ApiPlanLimit): DraftPlan {
  return {
    label: plan.label,
    tagline: plan.tagline,
    features: plan.features.length > 0 ? plan.features : [""],
    highlight: plan.highlight,
    unlimited: plan.token_limit == null,
    tokenValue: plan.token_limit == null ? "" : String(plan.token_limit_raw),
  };
}

function draftToPatch(draft: DraftPlan): ApiPlanLimitPatch {
  const features = draft.features.map((item) => item.trim()).filter(Boolean);
  const patch: ApiPlanLimitPatch = {
    label: draft.label.trim(),
    tagline: draft.tagline.trim(),
    features,
    highlight: draft.highlight,
  };

  if (draft.unlimited) {
    patch.token_limit = 0;
  } else {
    patch.token_limit = Number.parseInt(draft.tokenValue, 10);
  }

  return patch;
}

function draftsEqual(a: DraftPlan, b: DraftPlan): boolean {
  return (
    a.label === b.label &&
    a.tagline === b.tagline &&
    a.highlight === b.highlight &&
    a.unlimited === b.unlimited &&
    a.tokenValue === b.tokenValue &&
    a.features.map((item) => item.trim()).filter(Boolean).join("\n") ===
      b.features.map((item) => item.trim()).filter(Boolean).join("\n")
  );
}

export function PlanLimitsEditor() {
  const [plans, setPlans] = useState<ApiPlanLimit[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftPlan>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    controlApi
      .getPlanLimits()
      .then((data) => {
        if (cancelled) return;
        setPlans(data.data);
        setDrafts(Object.fromEntries(data.data.map((plan) => [plan.plan, toDraft(plan)])));
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load plans"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = useMemo(() => {
    return plans.some((plan) => {
      const draft = drafts[plan.plan];
      if (!draft) return false;
      return !draftsEqual(draft, toDraft(plan));
    });
  }, [drafts, plans]);

  const updateDraft = (planKey: string, patch: Partial<DraftPlan>) => {
    setDrafts((current) => ({
      ...current,
      [planKey]: { ...current[planKey], ...patch },
    }));
  };

  const updateFeature = (planKey: string, index: number, value: string) => {
    setDrafts((current) => {
      const draft = current[planKey];
      if (!draft) return current;
      const features = [...draft.features];
      features[index] = value;
      return { ...current, [planKey]: { ...draft, features } };
    });
  };

  const addFeature = (planKey: string) => {
    setDrafts((current) => {
      const draft = current[planKey];
      if (!draft) return current;
      return { ...current, [planKey]: { ...draft, features: [...draft.features, ""] } };
    });
  };

  const removeFeature = (planKey: string, index: number) => {
    setDrafts((current) => {
      const draft = current[planKey];
      if (!draft) return current;
      const features = draft.features.filter((_, i) => i !== index);
      return {
        ...current,
        [planKey]: { ...draft, features: features.length > 0 ? features : [""] },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    const updates: Record<string, ApiPlanLimitPatch> = {};
    for (const plan of plans) {
      const draft = drafts[plan.plan];
      if (!draft) continue;

      if (!draft.label.trim()) {
        setError(`Enter a display name for ${plan.label}.`);
        setSaving(false);
        return;
      }

      if (!draft.unlimited) {
        const parsed = Number.parseInt(draft.tokenValue, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          setError(`Enter a positive token limit for ${draft.label}, or mark it unlimited.`);
          setSaving(false);
          return;
        }
      }

      updates[plan.plan] = draftToPatch(draft);
    }

    try {
      const data = await controlApi.updatePlanLimits(updates);
      setPlans(data.data);
      setDrafts(Object.fromEntries(data.data.map((plan) => [plan.plan, toDraft(plan)])));
      setSuccess("Plans saved. The chat app pricing page will reflect these changes on next load.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save plans"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading plans...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {error && <FormAlert variant="error">{error}</FormAlert>}
      {success && <FormAlert variant="success">{success}</FormAlert>}

      <Card
        title="How plan configuration works"
        description="Each plan controls its display name, marketing copy, included features, monthly token limit, and whether it appears as the highlighted recommendation on the pricing page."
      />

      <div className="space-y-4">
        {plans.map((plan) => {
          const draft = drafts[plan.plan];
          if (!draft) return null;

          return (
            <Section key={plan.plan} title={`${draft.label || plan.label} plan`}>
              <div className="space-y-4 px-4 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Display name</span>
                    <input
                      type="text"
                      value={draft.label}
                      onChange={(e) => updateDraft(plan.plan, { label: e.target.value })}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Monthly token limit</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        step={1000}
                        disabled={draft.unlimited}
                        value={draft.tokenValue}
                        onChange={(e) => updateDraft(plan.plan, { tokenValue: e.target.value })}
                        placeholder={draft.unlimited ? "Unlimited" : "200000"}
                        className="rounded-lg border bg-background px-3 py-2 text-sm w-36 disabled:bg-muted/50 disabled:text-muted-foreground"
                      />
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={draft.unlimited}
                          onChange={(e) =>
                            updateDraft(plan.plan, {
                              unlimited: e.target.checked,
                              tokenValue: e.target.checked ? "" : draft.tokenValue,
                            })
                          }
                          className="rounded border"
                        />
                        Unlimited
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        Saved: {formatLimit(plan.token_limit)}
                      </span>
                    </div>
                  </div>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Tagline</span>
                  <input
                    type="text"
                    value={draft.tagline}
                    onChange={(e) => updateDraft(plan.plan, { tagline: e.target.value })}
                    placeholder="Short description shown on the pricing card"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.highlight}
                    onChange={(e) => updateDraft(plan.plan, { highlight: e.target.checked })}
                    className="rounded border"
                  />
                  Highlight as recommended plan on pricing page
                </label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-muted-foreground">Included in plan</span>
                    <button
                      type="button"
                      onClick={() => addFeature(plan.plan)}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-accent"
                    >
                      <Plus className="h-3 w-3" />
                      Add item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {draft.features.map((feature, index) => (
                      <div key={`${plan.plan}-feature-${index}`} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => updateFeature(plan.plan, index, e.target.value)}
                          placeholder="e.g. Priority support"
                          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeFeature(plan.plan, index)}
                          className="rounded-lg border p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label="Remove feature"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!isDirty || saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save plans
        </button>
      </div>
    </div>
  );
}
