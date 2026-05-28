"use client";

import { useMemo, useState } from "react";
import type { ToolDefinition } from "@/lib/tool-catalog";
import { Check, AlertCircle, Wrench, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  agentName: string;
  initialTools: ToolDefinition[];
};

const STARTER_TOOL: ToolDefinition = {
  name: "new_tool",
  description: "Describe what this tool does.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string" },
    },
    required: ["query"],
  },
  enabled: true,
};

export function ToolCatalogEditor({ agentName, initialTools }: Props) {
  const initialText = useMemo(() => JSON.stringify(initialTools, null, 2), [initialTools]);
  const [text, setText] = useState(initialText);
  const [savedText, setSavedText] = useState(initialText);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(text);
      if (!Array.isArray(value)) {
        return { ok: false as const, error: "Top-level value must be a JSON array of tools." };
      }
      const errors: string[] = [];
      value.forEach((t, i) => {
        if (typeof t !== "object" || t === null) errors.push(`tools[${i}] must be an object`);
        else {
          if (typeof t.name !== "string" || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t.name))
            errors.push(`tools[${i}].name must be a valid identifier`);
          if (typeof t.description !== "string")
            errors.push(`tools[${i}].description must be a string`);
          if (typeof t.parameters !== "object" || t.parameters === null)
            errors.push(`tools[${i}].parameters must be an object`);
        }
      });
      if (errors.length) return { ok: false as const, error: errors.join("\n") };
      return { ok: true as const, value: value as ToolDefinition[] };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [text]);

  const dirty = text !== savedText;

  const handleSave = () => {
    if (!parsed.ok) return;
    // In a real app, POST to the backend here.
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
    const next = [...parsed.value, STARTER_TOOL];
    setText(JSON.stringify(next, null, 2));
  };

  const toolNames = parsed.ok ? parsed.value.map((t) => t.name) : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
      <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2 bg-muted/40">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" />
            <span>{agentName} tool catalog (JSON)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAddStarter}
              disabled={!parsed.ok}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium hover:bg-accent disabled:opacity-50 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add tool
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
              <span>Valid JSON · {parsed.value.length} tools</span>
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
          Tools ({toolNames.length})
        </p>
        {parsed.ok ? (
          <ul className="space-y-1.5">
            {parsed.value.map((t) => (
              <li key={t.name} className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                    t.enabled === false ? "bg-muted-foreground/40" : "bg-emerald-500"
                  )}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-mono font-medium truncate">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{t.description}</p>
                </div>
              </li>
            ))}
            {parsed.value.length === 0 && (
              <li className="text-[11px] text-muted-foreground">No tools defined.</li>
            )}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground">Fix JSON errors to preview tools.</p>
        )}

        <div className="mt-5 rounded-lg bg-muted/40 p-3">
          <p className="text-[11px] font-semibold mb-1">Schema</p>
          <pre className="text-[10px] font-mono text-muted-foreground leading-snug whitespace-pre-wrap">{`[
  {
    "name": "tool_name",
    "description": "...",
    "parameters": {
      "type": "object",
      "properties": { ... },
      "required": [ ... ]
    },
    "enabled": true
  }
]`}</pre>
        </div>
      </aside>
    </div>
  );
}
