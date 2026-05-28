"use client";

import { useMemo, useState } from "react";
import { Check, AlertCircle, LayoutTemplate, Plus } from "lucide-react";
import type { AdaptiveCardDefinition } from "@/lib/data";
import { cn } from "@/lib/utils";

type Props = {
  agentName: string;
  initialCards: AdaptiveCardDefinition[];
};

const STARTER_CARD: AdaptiveCardDefinition = {
  name: "New Card",
  description: "Describe what this card is used for.",
  payload: {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "Hello, world!", weight: "Bolder", size: "Medium" },
    ],
  },
};

type ParseResult =
  | { ok: true; value: AdaptiveCardDefinition[] }
  | { ok: false; error: string };

function validate(text: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!Array.isArray(value)) {
    return { ok: false, error: "Top-level value must be a JSON array of card definitions." };
  }
  const errors: string[] = [];
  value.forEach((card, i) => {
    if (typeof card !== "object" || card === null) {
      errors.push(`cards[${i}] must be an object`);
      return;
    }
    const c = card as Record<string, unknown>;
    if (typeof c.name !== "string" || c.name.trim() === "")
      errors.push(`cards[${i}].name must be a non-empty string`);
    if (typeof c.description !== "string")
      errors.push(`cards[${i}].description must be a string`);
    if (typeof c.payload !== "object" || c.payload === null)
      errors.push(`cards[${i}].payload must be an object`);
    else {
      const p = c.payload as Record<string, unknown>;
      if (p.type !== "AdaptiveCard")
        errors.push(`cards[${i}].payload.type must equal "AdaptiveCard"`);
      if (!Array.isArray(p.body))
        errors.push(`cards[${i}].payload.body must be an array`);
    }
  });
  if (errors.length) return { ok: false, error: errors.join("\n") };
  return { ok: true, value: value as AdaptiveCardDefinition[] };
}

export function AdaptiveCardEditor({ agentName, initialCards }: Props) {
  const initialText = useMemo(() => JSON.stringify(initialCards, null, 2), [initialCards]);
  const [text, setText] = useState(initialText);
  const [savedText, setSavedText] = useState(initialText);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const parsed = useMemo(() => validate(text), [text]);
  const dirty = text !== savedText;

  const handleSave = () => {
    if (!parsed.ok) return;
    const pretty = JSON.stringify(parsed.value, null, 2);
    setText(pretty);
    setSavedText(pretty);
    setSavedAt(new Date());
  };

  const handleFormat = () => {
    if (!parsed.ok) return;
    setText(JSON.stringify(parsed.value, null, 2));
  };

  const handleReset = () => setText(savedText);

  const handleAddStarter = () => {
    if (!parsed.ok) return;
    const next = [...parsed.value, STARTER_CARD];
    setText(JSON.stringify(next, null, 2));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
      <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2 bg-muted/40">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span>{agentName} adaptive cards (JSON)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAddStarter}
              disabled={!parsed.ok}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium hover:bg-accent disabled:opacity-50 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add card
            </button>
            <button
              onClick={handleFormat}
              disabled={!parsed.ok}
              className="rounded-md border px-2 py-1 text-[10px] font-medium hover:bg-accent disabled:opacity-50 transition-colors"
            >
              Format
            </button>
            <button
              onClick={handleReset}
              disabled={!dirty}
              className="rounded-md border px-2 py-1 text-[10px] font-medium hover:bg-accent disabled:opacity-50 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!parsed.ok || !dirty}
              className="rounded-md bg-primary text-primary-foreground px-2.5 py-1 text-[10px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="font-mono text-[12px] leading-relaxed p-4 min-h-[480px] w-full bg-background focus:outline-none resize-y"
        />

        <div
          className={cn(
            "flex items-center gap-2 border-t px-3 py-2 text-[11px]",
            parsed.ok
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive bg-destructive/5"
          )}
        >
          {parsed.ok ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Valid JSON · {parsed.value.length} cards</span>
              {savedAt && !dirty && (
                <span className="ml-auto text-muted-foreground">
                  Saved {savedAt.toLocaleTimeString()}
                </span>
              )}
              {dirty && <span className="ml-auto text-amber-600 dark:text-amber-400">Unsaved changes</span>}
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <pre className="whitespace-pre-wrap font-mono text-[11px]">{parsed.error}</pre>
            </>
          )}
        </div>
      </div>

      <aside className="rounded-xl border bg-card p-4 h-fit">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Cards ({parsed.ok ? parsed.value.length : 0})
        </p>
        {parsed.ok ? (
          <ul className="space-y-1.5">
            {parsed.value.map((c, i) => (
              <li key={c.id ?? `${c.name}-${i}`} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0 bg-emerald-500" />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{c.description}</p>
                </div>
              </li>
            ))}
            {parsed.value.length === 0 && (
              <li className="text-[11px] text-muted-foreground">No cards defined.</li>
            )}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground">Fix JSON errors to preview cards.</p>
        )}

        <div className="mt-5 rounded-lg bg-muted/40 p-3">
          <p className="text-[11px] font-semibold mb-1">Schema</p>
          <pre className="text-[10px] font-mono text-muted-foreground leading-snug whitespace-pre-wrap">{`[
  {
    "name": "Card name",
    "description": "...",
    "payload": {
      "type": "AdaptiveCard",
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "version": "1.5",
      "body": [ ... ],
      "actions": [ ... ]
    }
  }
]`}</pre>
          <a
            href="https://adaptivecards.io/designer/"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-[10px] text-primary hover:underline"
          >
            Open Adaptive Cards Designer ↗
          </a>
        </div>
      </aside>
    </div>
  );
}
