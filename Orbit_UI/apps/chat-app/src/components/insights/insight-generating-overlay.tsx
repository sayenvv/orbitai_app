"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Brain, FileText, Layers, Loader2, Sparkles } from "lucide-react";
import { StudySectionLabel } from "@/components/insights/insights-shell";

const STEPS = [
  { icon: FileText, label: "Reading your document" },
  { icon: Sparkles, label: "Extracting key insights" },
  { icon: Layers, label: "Building flashcards & Q&A" },
  { icon: Brain, label: "Preparing study view" },
] as const;

type InsightGeneratingOverlayProps = {
  sourceName?: string | null;
};

export function InsightGeneratingOverlay({ sourceName }: InsightGeneratingOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % STEPS.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10005] flex items-center justify-center overflow-hidden bg-background/92 backdrop-blur-md">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="aurora opacity-60" />
        <div className="grid-dots absolute inset-0 opacity-30" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/[0.07] to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-sm px-6">
        <div className="overflow-hidden rounded-3xl border border-border/45 bg-card/80 p-8 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] backdrop-blur-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>

          <StudySectionLabel className="mt-6 block text-center">
            AI insights
          </StudySectionLabel>
          <h2 className="mt-2 text-center text-base font-semibold tracking-tight text-foreground">
            Building your study toolkit
          </h2>
          {sourceName && (
            <p className="mt-1.5 truncate text-center text-xs text-muted-foreground">
              {sourceName}
            </p>
          )}

          <div className="mt-8 space-y-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === stepIndex;
              return (
                <div
                  key={step.label}
                  className={
                    isActive
                      ? "flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.05] px-3.5 py-2.5"
                      : "flex items-center gap-3 rounded-xl px-3.5 py-2 opacity-45"
                  }
                >
                  <div
                    className={
                      isActive
                        ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12"
                        : "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/40"
                    }
                  >
                    {isActive ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-foreground">{step.label}</span>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
            This usually takes a moment. You&apos;ll land in the full study view when ready.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
