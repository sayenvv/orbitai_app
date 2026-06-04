"use client";

import { useState } from "react";
import { ArtifactMarkdownPreview } from "./artifact-markdown";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

type EditorMode = "preview" | "edit" | "split";

const MODE_OPTIONS: Array<{ id: EditorMode; label: string }> = [
  { id: "preview", label: "Preview" },
  { id: "edit", label: "Edit" },
  { id: "split", label: "Split" },
];

export function ArtifactMarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [mode, setMode] = useState<EditorMode>("preview");

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Content</span>
        <div
          className="inline-flex rounded-lg border border-border/50 bg-muted/30 p-0.5"
          role="tablist"
          aria-label="Markdown editor mode"
        >
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={mode === option.id}
              onClick={() => setMode(option.id)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition",
                mode === option.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "preview" ? (
        <div className="min-h-[20rem] rounded-xl border border-border/50 bg-card/50 p-5 md:p-6">
          <ArtifactMarkdownPreview content={value} />
        </div>
      ) : null}

      {mode === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={18}
          spellCheck
          className="min-h-[20rem] w-full resize-y rounded-xl border border-border/50 bg-background p-4 font-mono text-sm leading-relaxed outline-none focus:border-primary/40"
          aria-label="Markdown source"
        />
      ) : null}

      {mode === "split" ? (
        <div className="grid min-h-[20rem] gap-3 lg:grid-cols-2">
          <div className="flex min-h-0 flex-col">
            <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Source
            </span>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[18rem] flex-1 resize-y rounded-xl border border-border/50 bg-background p-4 font-mono text-sm leading-relaxed outline-none focus:border-primary/40"
              aria-label="Markdown source"
            />
          </div>
          <div className="flex min-h-0 flex-col">
            <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Preview
            </span>
            <div className="min-h-[18rem] flex-1 overflow-y-auto rounded-xl border border-border/50 bg-card/50 p-4 md:p-5">
              <ArtifactMarkdownPreview content={value} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
