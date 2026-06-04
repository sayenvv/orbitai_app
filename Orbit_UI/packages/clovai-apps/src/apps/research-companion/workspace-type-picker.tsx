"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  DEFAULT_WORKSPACE_TYPE_ID,
  RESEARCH_COMPANION_WORKSPACE_TYPES,
  type ResearchCompanionWorkspaceTypeDefinition,
  type ResearchCompanionWorkspaceTypeId,
} from "./workspace-types";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const accentCardClass: Record<
  ResearchCompanionWorkspaceTypeDefinition["accentKey"],
  string
> = {
  emerald:
    "border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 hover:border-emerald-300 dark:border-emerald-500/25 dark:from-emerald-950/30 dark:via-background dark:to-teal-950/20",
  teal: "border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/60 hover:border-teal-300 dark:border-teal-500/25 dark:from-teal-950/30 dark:via-background dark:to-cyan-950/20",
  cyan: "border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 via-white to-sky-50/60 hover:border-cyan-300 dark:border-cyan-500/25 dark:from-cyan-950/30 dark:via-background dark:to-sky-950/20",
  violet:
    "border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/60 hover:border-violet-300 dark:border-violet-500/25 dark:from-violet-950/30 dark:via-background dark:to-indigo-950/20",
  amber:
    "border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 hover:border-amber-300 dark:border-amber-500/25 dark:from-amber-950/30 dark:via-background dark:to-orange-950/20",
  rose: "border-rose-200/70 bg-gradient-to-br from-rose-50/90 via-white to-pink-50/60 hover:border-rose-300 dark:border-rose-500/25 dark:from-rose-950/30 dark:via-background dark:to-pink-950/20",
};

const accentIconClass: Record<ResearchCompanionWorkspaceTypeDefinition["accentKey"], string> = {
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25",
  teal: "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25",
  cyan: "bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/25",
  violet: "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25",
  amber: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25",
  rose: "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25",
};

type WorkspaceTypePickerProps = {
  selectedId?: ResearchCompanionWorkspaceTypeId | null;
  onSelect: (typeId: ResearchCompanionWorkspaceTypeId) => void;
  compact?: boolean;
};

export function WorkspaceTypePicker({
  selectedId,
  onSelect,
  compact = false,
}: WorkspaceTypePickerProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "sm:grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3",
      )}
      role="listbox"
      aria-label="Workspace type"
    >
      {RESEARCH_COMPANION_WORKSPACE_TYPES.map((type) => {
        const Icon = type.icon;
        const selected = selectedId === type.id;
        return (
          <button
            key={type.id}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSelect(type.id)}
            className={cn(
              "group relative flex w-full flex-col rounded-[1.15rem] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5",
              accentCardClass[type.accentKey],
              selected && "ring-2 ring-primary/30",
            )}
          >
            {selected ? (
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            ) : null}
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                accentIconClass[type.accentKey],
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="mt-3 text-sm font-semibold text-foreground">{type.label}</span>
            <span className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {type.description}
            </span>
            <span className="mt-3 flex flex-wrap gap-1.5">
              {type.highlights.slice(0, compact ? 2 : 4).map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </span>
            <span className="mt-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {type.worksheetTabs.length} workspace views
            </span>
          </button>
        );
      })}
    </div>
  );
}

type WorkspaceTypePickerModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (typeId: ResearchCompanionWorkspaceTypeId) => void;
};

export function WorkspaceTypePickerModal({
  open,
  title = "Choose workspace type",
  description = "This shapes your worksheet tabs, guidance, and deliverables. You can open another type in a new tab anytime.",
  confirmLabel = "Create workspace",
  onClose,
  onConfirm,
}: WorkspaceTypePickerModalProps) {
  const [pending, setPending] = useState<ResearchCompanionWorkspaceTypeId>(DEFAULT_WORKSPACE_TYPE_ID);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-type-picker-title"
    >
      <div className="flex max-h-[min(90vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl">
        <div className="shrink-0 border-b border-border/40 px-5 py-4 md:px-6">
          <h2 id="workspace-type-picker-title" className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6">
          <WorkspaceTypePicker
            selectedId={pending}
            onSelect={setPending}
          />
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border/40 px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border/40 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(pending)}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
