"use client";

import { use, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentHeader, IdBadge } from "@/components/agent-header";
import { Section, Row } from "@/components/ui/field";
import { FormAlert } from "@/components/form-alert";
import { useControlAgent } from "@/hooks/use-control-agents";
import { controlApi, getApiErrorMessage, type ApiControlConfiguration } from "@/lib/orbit-api";

type DraftConfig = {
  model: string;
  temperature: string;
  maxTokens: string;
  systemPrompt: string;
};

function toDraft(config: ApiControlConfiguration): DraftConfig {
  return {
    model: config.model,
    temperature: String(config.temperature),
    maxTokens: String(config.max_tokens),
    systemPrompt: config.system_prompt,
  };
}

function draftToPatch(draft: DraftConfig) {
  return {
    model: draft.model.trim(),
    temperature: Number.parseFloat(draft.temperature),
    max_tokens: Number.parseInt(draft.maxTokens, 10),
    system_prompt: draft.systemPrompt.trim(),
  };
}

export function AgentConfigurationEditor({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { data: agent, isLoading: agentLoading, error: agentError } = useControlAgent(agentId);

  const [draft, setDraft] = useState<DraftConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    setConfigLoading(true);
    setError("");
    controlApi
      .getConfiguration(agentId)
      .then((config) => {
        if (!cancelled) setDraft(toDraft(config));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Could not load configuration."));
        }
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 5000);
    return () => window.clearTimeout(timer);
  }, [success]);

  async function handleSave() {
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const patch = draftToPatch(draft);
    if (!patch.model) {
      setError("Model is required.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(patch.temperature)) {
      setError("Temperature must be a number.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(patch.max_tokens) || patch.max_tokens < 1) {
      setError("Max tokens must be a positive number.");
      setSaving(false);
      return;
    }
    if (!patch.system_prompt) {
      setError("System prompt is required.");
      setSaving(false);
      return;
    }

    try {
      const saved = await controlApi.updateConfiguration(agentId, patch);
      setDraft(toDraft(saved));
      setSuccess("Configuration saved.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save configuration."));
    } finally {
      setSaving(false);
    }
  }

  const loading = agentLoading || configLoading;

  if (loading) {
    return (
      <>
        <PageHeader title="Configuration" description="Loading…" />
        <PageBody>
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading configuration…
          </div>
        </PageBody>
      </>
    );
  }

  if (agentError || !agent || !draft) {
    return (
      <>
        <PageHeader title="Configuration" description="Agent not found" />
        <PageBody>
          <FormAlert variant="error" title="Could not load">
            {error || getApiErrorMessage(agentError, "This agent may have been removed.")}
          </FormAlert>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${agent.name} · Configuration`}
        description="Model, prompts, and runtime behaviour for this agent."
        actions={
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? "Saving…" : "Save changes"}
          </button>
        }
      />
      <PageBody>
        {success && (
          <FormAlert variant="success" title="Saved" className="mb-4">
            {success}
          </FormAlert>
        )}
        {error && (
          <FormAlert variant="error" title="Error" className="mb-4">
            {error}
          </FormAlert>
        )}

        <AgentHeader
          icon={agent.icon}
          gradient={agent.color}
          name={agent.name}
          subtitle={agent.description}
          trailing={
            agent.slug === "clovai" ? (
              <IdBadge label="Role" value="Default chat" />
            ) : (
              <IdBadge label="Agent ID" value={agent.id.slice(0, 8)} />
            )
          }
        />

        <div className="max-w-3xl space-y-4">
          <Section title="Model">
            <Row label="Model">
              <input
                value={draft.model}
                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                className="w-56 rounded-lg border bg-background px-3 py-1.5 text-sm"
                placeholder="gpt-4o-mini"
              />
            </Row>
            <Row label="Temperature">
              <input
                type="number"
                value={draft.temperature}
                onChange={(e) => setDraft({ ...draft, temperature: e.target.value })}
                step={0.1}
                min={0}
                max={2}
                className="w-24 rounded-lg border bg-background px-3 py-1.5 text-sm"
              />
            </Row>
            <Row label="Max tokens">
              <input
                type="number"
                value={draft.maxTokens}
                onChange={(e) => setDraft({ ...draft, maxTokens: e.target.value })}
                min={1}
                className="w-24 rounded-lg border bg-background px-3 py-1.5 text-sm"
              />
            </Row>
          </Section>

          <Section title="System prompt">
            <div className="p-4">
              <textarea
                value={draft.systemPrompt}
                onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
                rows={8}
                className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={`You are ${agent.name}. …`}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Chat provider (Ollama, OpenAI, Azure) is set per subscription plan in{" "}
                <a href="/plan-limits" className="font-medium text-primary hover:underline">
                  Subscription plans
                </a>
                .
              </p>
            </div>
          </Section>
        </div>
      </PageBody>
    </>
  );
}
