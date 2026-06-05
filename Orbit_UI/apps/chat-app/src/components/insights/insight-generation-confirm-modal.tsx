"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Layers,
  Map,
  MessageCircleQuestion,
  Sparkles,
  Tags,
  X,
} from "lucide-react";
import {
  DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES,
  RESEARCH_COMPANION_INSIGHT_OPTIONS,
  type ResearchCompanionGeneratableInsightType,
} from "@orbit/clovai-apps";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "rc-selected-insight-types";

const INSIGHT_ICONS = {
  summary: FileText,
  keywords: Tags,
  concepts: Layers,
  evidence: Map,
  questions: MessageCircleQuestion,
} as const;

function readStoredSelection(): ResearchCompanionGeneratableInsightType[] {
  if (typeof window === "undefined") return [...DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES];
    const allowed = new Set<string>(DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES);
    const selected = parsed.filter(
      (value): value is ResearchCompanionGeneratableInsightType =>
        typeof value === "string" && allowed.has(value),
    );
    return selected.length > 0 ? selected : [...DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES];
  } catch {
    return [...DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES];
  }
}

function writeStoredSelection(types: ResearchCompanionGeneratableInsightType[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
}

type InsightGenerationConfirmModalProps = {
  open: boolean;
  sourceName?: string | null;
  confirming?: boolean;
  mode?: "initial" | "additional";
  lockedTypes?: ResearchCompanionGeneratableInsightType[];
  initialSelection?: ResearchCompanionGeneratableInsightType[];
  onClose: () => void;
  onConfirm: (types: ResearchCompanionGeneratableInsightType[]) => void;
};

export function InsightGenerationConfirmModal({
  open,
  sourceName,
  confirming = false,
  mode = "initial",
  lockedTypes,
  initialSelection,
  onClose,
  onConfirm,
}: InsightGenerationConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<ResearchCompanionGeneratableInsightType[]>(() =>
    readStoredSelection(),
  );

  const lockedSet = useMemo(() => new Set(lockedTypes ?? []), [lockedTypes]);
  const isAdditional = mode === "additional";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const locked = lockedTypes ?? [];
    const lockedIds = new Set(locked);

    if (isAdditional) {
      const pending =
        initialSelection?.filter((type) => !lockedIds.has(type)) ??
        DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES.filter((type) => !lockedIds.has(type));
      setSelected([...locked, ...pending]);
      return;
    }

    setSelected(readStoredSelection());
  }, [open, initialSelection, isAdditional, lockedTypes]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !confirming) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [confirming, onClose, open]);

  const totalCount = RESEARCH_COMPANION_INSIGHT_OPTIONS.length;
  const selectedCount = selected.length;
  const newSelection = useMemo(
    () => selected.filter((type) => !lockedSet.has(type)),
    [lockedSet, selected],
  );
  const newSelectionCount = newSelection.length;
  const allSelected = selectedCount === totalCount;

  const selectedOptions = useMemo(
    () => RESEARCH_COMPANION_INSIGHT_OPTIONS.filter((option) => selected.includes(option.id)),
    [selected],
  );

  const pendingOptions = useMemo(
    () => RESEARCH_COMPANION_INSIGHT_OPTIONS.filter((option) => newSelection.includes(option.id)),
    [newSelection],
  );

  const toggleType = (type: ResearchCompanionGeneratableInsightType, checked: boolean) => {
    if (lockedSet.has(type)) return;
    setSelected((current) => {
      if (checked) {
        if (current.includes(type)) return current;
        return [...current, type];
      }
      const removable = current.filter((item) => !lockedSet.has(item));
      if (removable.length === 1 && removable[0] === type) return current;
      return current.filter((item) => item !== type);
    });
  };

  const handleSelectAll = () => {
    setSelected([...DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES]);
  };

  const handleClearAll = () => {
    const locked = lockedTypes ?? [];
    const firstPending =
      DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES.find((type) => !lockedSet.has(type)) ??
      RESEARCH_COMPANION_INSIGHT_OPTIONS[0].id;
    setSelected([...locked, firstPending]);
  };

  const handleConfirm = () => {
    const typesToGenerate = isAdditional ? newSelection : selected;
    if (typesToGenerate.length === 0) return;
    if (!isAdditional) writeStoredSelection(selected);
    onConfirm(typesToGenerate);
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10004] flex items-center justify-center bg-background/75 px-4 backdrop-blur-md">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close insight generation dialog"
        onClick={() => {
          if (!confirming) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insight-confirm-title"
        className="glass-surface glass-modal glass-composer relative flex max-h-[min(42rem,92vh)] w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem]"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

        <div className="border-b border-border/30 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Clovai Insights
                </p>
                <h2
                  id="insight-confirm-title"
                  className="mt-1 text-xl font-semibold tracking-tight text-foreground"
                >
                  {isAdditional ? "Generate additional insights" : "Generate AI insights"}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {isAdditional
                    ? "Already generated insights stay locked. Choose any missing types to add now."
                    : "Select the insight types to generate. You can choose more than one."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={confirming}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/30 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {sourceName?.trim() && (
            <div className="glass-chip mt-4 inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs font-medium text-foreground">{sourceName.trim()}</span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Insight types</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isAdditional
                  ? `${newSelectionCount} new · ${lockedSet.size} already generated`
                  : `${selectedCount} of ${totalCount} selected`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={confirming || allSelected}
                onClick={handleSelectAll}
                className="rounded-lg border border-border/40 bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Select all
              </button>
              <button
                type="button"
                disabled={confirming || (isAdditional ? newSelectionCount <= 1 : selectedCount <= 1)}
                onClick={handleClearAll}
                className="rounded-lg border border-border/40 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {RESEARCH_COMPANION_INSIGHT_OPTIONS.map((option) => {
              const isLocked = lockedSet.has(option.id);
              const isSelected = selected.includes(option.id);
              const Icon = INSIGHT_ICONS[option.id];
              const isLastPending = isSelected && !isLocked && newSelectionCount === 1;

              return (
                <label
                  key={option.id}
                  className={cn(
                    "group flex items-start gap-3.5 rounded-2xl border px-4 py-3.5 transition-all",
                    isLocked
                      ? "cursor-default border-border/35 bg-muted/20 opacity-90"
                      : "cursor-pointer",
                    !isLocked &&
                      (isSelected
                        ? "border-primary/25 bg-primary/[0.035] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                        : "border-border/45 bg-background/60 hover:border-border/70 hover:bg-background"),
                    confirming && "cursor-not-allowed opacity-70",
                    isLastPending && !isLocked && "cursor-default",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={confirming || isLocked || isLastPending}
                    onChange={(event) => toggleType(option.id, event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 rounded-[4px] border-border/70 accent-primary focus:ring-2 focus:ring-primary/25 focus:ring-offset-0 disabled:cursor-not-allowed"
                  />
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                      isLocked
                        ? "bg-muted/60 text-muted-foreground"
                        : isSelected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/50 text-muted-foreground group-hover:bg-muted/70",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="flex items-center gap-2">
                      <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                      {isLocked && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          Generated
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-border/35 bg-muted/20 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {isAdditional ? "Will generate now" : "Selected for generation"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(isAdditional ? pendingOptions : selectedOptions).map((option) => (
                <span
                  key={option.id}
                  className="inline-flex items-center rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-[11px] font-semibold text-primary"
                >
                  {option.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/30 bg-muted/10 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {isAdditional
              ? "Select at least one missing insight type to continue."
              : "At least one insight type is required."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={confirming}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border/35 bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming || (isAdditional ? newSelectionCount === 0 : selectedCount === 0)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {confirming
                ? "Starting…"
                : isAdditional
                  ? `Generate ${newSelectionCount} additional insight${newSelectionCount === 1 ? "" : "s"}`
                  : `Generate ${selectedCount} insight${selectedCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
