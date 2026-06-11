"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, ListChecks, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlanReviewPayload = {
  prompt: string;
  plan?: string | null;
  discussion?: string | null;
  pendingAgent?: string | null;
};

type ClovopsPlanReviewCardProps = {
  review: PlanReviewPayload;
  onApprove?: () => void;
  approving?: boolean;
  className?: string;
};

function agentLabel(agentId?: string | null): string {
  if (!agentId) return "Planner";
  return agentId.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ClovopsPlanReviewCard({
  review,
  onApprove,
  approving = false,
  className,
}: ClovopsPlanReviewCardProps) {
  const [open, setOpen] = useState(true);
  const planBody = review.plan?.trim() || review.discussion?.trim() || "";
  const hasPlan = Boolean(planBody);

  return (
    <section className={cn("mt-1 w-full", className)} aria-label="Plan review">
      <div className="overflow-hidden rounded-lg border border-amber-500/25 bg-amber-500/[0.04]">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-amber-500/[0.06]"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-amber-600/80 dark:text-amber-400/80" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-amber-600/80 dark:text-amber-400/80" />
          )}
          <ListChecks className="h-3.5 w-3.5 shrink-0 text-amber-600/80 dark:text-amber-400/80" />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
            Review plan — {agentLabel(review.pendingAgent)}
          </span>
          <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
            Approval required
          </span>
        </button>

        {open ? (
          <div className="space-y-2 border-t border-amber-500/15 px-2.5 py-2.5">
            <p className="text-[11px] leading-snug text-muted-foreground">{review.prompt}</p>

            {hasPlan ? (
              <div className="overflow-hidden rounded-md border border-border/35 bg-background/60">
                <div className="border-b border-border/25 px-2.5 py-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Proposed plan
                  </p>
                </div>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap p-2.5 font-mono text-[11px] leading-relaxed text-foreground/85 [scrollbar-width:thin]">
                  {planBody}
                </pre>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/40 bg-muted/20 px-2.5 py-2">
                <p className="text-[11px] leading-snug text-muted-foreground">
                  No structured plan text was returned. Approve to continue, or describe the
                  changes you want below.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {onApprove ? (
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={approving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve plan
                </button>
              ) : null}
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                <MessageSquare className="h-3 w-3" />
                Or type feedback in the box below
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
