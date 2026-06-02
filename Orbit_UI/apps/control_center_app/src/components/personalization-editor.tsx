"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/field";
import { FormAlert } from "@/components/form-alert";
import type { Personalization } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  controlApi,
  getApiErrorMessage,
  mapControlPersonalization,
  toPersonalizationApiBody,
} from "@/lib/orbit-api";
import { IdBadge } from "@/components/agent-header";

const TONE_OPTIONS = ["Friendly", "Concise", "Formal", "Playful", "Empathetic"];
const LENGTH_OPTIONS = ["Short", "Medium", "Long"];
const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "Hindi"];

type Props = {
  agentId: string;
  agentName: string;
  initial: Personalization;
};

export function PersonalizationEditor({ agentId, agentName, initial }: Props) {
  const [personalization, setPersonalization] = useState(initial);
  const [greeting, setGreeting] = useState(initial.greeting);
  const [avatar, setAvatar] = useState(initial.avatarEmoji);
  const [promptsText, setPromptsText] = useState(initial.quickPrompts.join("\n"));
  const [tone, setTone] = useState(initial.tone);
  const [length, setLength] = useState(initial.responseLength);
  const [language, setLanguage] = useState(initial.language ?? "English");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const quickPrompts = promptsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    try {
      const saved = await controlApi.updateAgentPersonalization(
        agentId,
        toPersonalizationApiBody({
          greeting: greeting.trim(),
          avatarEmoji: avatar.trim() || "🤖",
          quickPrompts: quickPrompts.length ? quickPrompts : ["How can I help?"],
          tone,
          responseLength: length,
          language,
        }),
      );
      const mapped = mapControlPersonalization(saved);
      setPersonalization(mapped);
      setGreeting(mapped.greeting);
      setAvatar(mapped.avatarEmoji);
      setPromptsText(mapped.quickPrompts.join("\n"));
      setTone(mapped.tone);
      setLength(mapped.responseLength);
      setLanguage(mapped.language ?? "English");
      setSuccess("Personalization saved.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save personalization."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Greeting and tone for <span className="font-medium text-foreground">{agentName}</span>.
        </p>
        <IdBadge label="Personalization ID" value={personalization.id} />
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
        <Card title="Greeting" description="Shown on first open">
          <input
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </Card>

        <Card title="Avatar emoji" description="Quick visual identifier">
          <input
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            className="w-24 rounded-lg border bg-background px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </Card>

        <Card title="Quick prompts" description="Suggestions shown above the chat input">
          <textarea
            value={promptsText}
            onChange={(e) => setPromptsText(e.target.value)}
            rows={6}
            className="w-full rounded-lg border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </Card>

        <Card title="Tone" description="Default response style">
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs hover:bg-accent transition-colors",
                  t === tone && "bg-accent text-accent-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Response length" description="Token budget guide for replies">
          <select
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {LENGTH_OPTIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Card>

        <Card title="Language" description="Preferred reply language">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Card>
      </div>

      <div className="flex justify-end max-w-4xl">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save personalization
        </button>
      </div>
    </div>
  );
}
