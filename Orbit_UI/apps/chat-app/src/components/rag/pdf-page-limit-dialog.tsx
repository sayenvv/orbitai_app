"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, Sparkles, X } from "lucide-react";
import type { ApiPdfInspect } from "@/lib/orbit-api";
import { registerPdfPageLimitHandler } from "@/lib/pdf-page-limit";
import { cn } from "@/lib/utils";

type PendingConfirm = {
  info: ApiPdfInspect;
  resolve: (allowed: boolean) => void;
};

function formatPlanLabel(plan: string): string {
  if (!plan) return "Free";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function PageLimitStats({ info }: { info: ApiPdfInspect }) {
  const indexedPercent = Math.round((info.pages_indexed / info.total_pages) * 100);

  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-background/80 px-3 py-2.5 border border-border/40">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Document
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{info.total_pages}</p>
          <p className="text-[11px] text-muted-foreground">total pages</p>
        </div>
        <div className="rounded-lg bg-primary/5 px-3 py-2.5 border border-primary/15">
          <p className="text-[10px] font-medium uppercase tracking-wider text-primary/80">
            Will index
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-primary">
            {info.pages_indexed}
          </p>
          <p className="text-[11px] text-muted-foreground">on {formatPlanLabel(info.plan)}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Coverage</span>
          <span className="font-medium tabular-nums">{indexedPercent}% of document</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.58_0.20_330)] transition-all"
            style={{ width: `${Math.min(indexedPercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function PdfPageLimitDialogHost() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    registerPdfPageLimitHandler(
      (info) =>
        new Promise<boolean>((resolve) => {
          setPending({ info, resolve });
        }),
    );
    return () => registerPdfPageLimitHandler(null);
  }, []);

  const close = (allowed: boolean) => {
    pending?.resolve(allowed);
    setPending(null);
  };

  if (!pending) return null;

  const { info } = pending;
  const planLabel = formatPlanLabel(info.plan);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
        onClick={() => close(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-limit-title"
        aria-describedby="pdf-limit-description"
        className={cn(
          "glass-surface glass-modal glass-composer relative w-full max-w-[420px] overflow-hidden rounded-2xl",
          "animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-amber-500/10 via-primary/5 to-transparent"
        />

        <button
          type="button"
          onClick={() => close(false)}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative px-6 pb-6 pt-7">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 shadow-sm">
              <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Upload limit
            </p>
            <h2 id="pdf-limit-title" className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
              Partial indexing on {planLabel}
            </h2>
            <p id="pdf-limit-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This PDF is larger than your plan allows. We&apos;ll index the first{" "}
              <span className="font-medium text-foreground">{info.page_limit} pages</span> for chat —
              the rest won&apos;t be searchable until you upgrade.
            </p>
          </div>

          <div className="mt-5">
            <PageLimitStats info={info} />
          </div>

          <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Need the full document?</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Upgrade for unlimited page indexing, higher token limits, and priority models.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            <Link
              href="/plans"
              onClick={() => close(false)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] hover:bg-primary/90"
            >
              View upgrade options
              <ArrowUpRight className="h-4 w-4 opacity-90" />
            </Link>

            <button
              type="button"
              onClick={() => close(true)}
              className="w-full rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
            >
              Continue with {info.pages_indexed} pages
            </button>

            <button
              type="button"
              onClick={() => close(false)}
              className="w-full py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
