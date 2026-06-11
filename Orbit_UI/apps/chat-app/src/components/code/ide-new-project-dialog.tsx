"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  DEFAULT_CODE_WORKSPACE_TEMPLATE_ID,
  type CodeWorkspaceProjectTemplate,
} from "@/lib/code-workspace-templates";
import { cn } from "@/lib/utils";

type IdeNewProjectDialogProps = {
  open: boolean;
  creating?: boolean;
  templates: CodeWorkspaceProjectTemplate[];
  defaultTemplateId?: string;
  onClose: () => void;
  onCreate: (title: string, templateId: string) => void;
};

export function IdeNewProjectDialog({
  open,
  creating = false,
  templates,
  defaultTemplateId = DEFAULT_CODE_WORKSPACE_TEMPLATE_ID,
  onClose,
  onCreate,
}: IdeNewProjectDialogProps) {
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) ?? templates[0],
    [templateId, templates],
  );

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setTemplateId(defaultTemplateId);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [defaultTemplateId, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creating) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [creating, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-label="Close dialog"
        disabled={creating}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="glass-surface relative w-full max-w-md rounded-2xl border border-border/50 p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="new-project-title" className="text-[15px] font-semibold text-foreground">
              New project
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Choose a starter template or begin with an empty workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(title.trim() || "Untitled project", templateId);
          }}
        >
          <label className="block text-[12px] font-medium text-muted-foreground">
            Project name
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled project"
              disabled={creating}
              className={cn(
                "glass-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-[14px] text-foreground outline-none",
                "placeholder:text-muted-foreground/50 disabled:opacity-60",
              )}
            />
          </label>

          <label className="mt-4 block text-[12px] font-medium text-muted-foreground">
            Starter template
            <select
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              disabled={creating || templates.length === 0}
              className={cn(
                "glass-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-[14px] text-foreground outline-none",
                "disabled:opacity-60",
              )}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>

          {selectedTemplate ? (
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">
              {selectedTemplate.description}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
