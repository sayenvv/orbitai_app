"use client";

import { useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronRight } from "lucide-react";
import type { ApiCodeWorkspaceAgentReview } from "@/lib/orbit-api";
import { cn } from "@/lib/utils";

type ClovopsChatReviewResultsProps = {
  reviews: ApiCodeWorkspaceAgentReview[];
  className?: string;
};

export function ClovopsChatReviewResults({ reviews, className }: ClovopsChatReviewResultsProps) {
  const [open, setOpen] = useState(true);

  if (!reviews.length) return null;

  const failed = reviews.filter((review) => !review.passed).length;

  return (
    <section className={cn("mt-1 w-full", className)} aria-label="Code review">
      <div className="overflow-hidden rounded-lg border border-border/35 bg-muted/10">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-muted/20"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          )}
          <span className="text-[12px] text-muted-foreground">
            Review · {reviews.length - failed} passed
            {failed > 0 ? `, ${failed} need fixes` : ""}
          </span>
        </button>

        {open ? (
          <ul className="border-t border-border/25 px-1 py-1">
            {reviews.map((review, index) => (
              <li
                key={`${review.fileId}-${review.filePath}`}
                className={cn(index > 0 && "border-t border-border/20")}
              >
                <div className="flex items-start gap-2.5 px-2 py-1.5">
                  <div className="mt-0.5 flex w-3.5 shrink-0 justify-center">
                    {review.passed ? (
                      <Check className="h-3.5 w-3.5 text-muted-foreground/70" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-destructive/90" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[11px] text-foreground/85">{review.filePath}</p>
                    {review.issues.length > 0 ? (
                      <ul className="mt-1 space-y-0.5">
                        {review.issues.map((issue, issueIndex) => (
                          <li
                            key={`${issue.line}-${issueIndex}`}
                            className="text-[11px] leading-snug text-muted-foreground/80"
                          >
                            L{issue.line}: {issue.message}
                          </li>
                        ))}
                      </ul>
                    ) : review.summary ? (
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground/80">{review.summary}</p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
