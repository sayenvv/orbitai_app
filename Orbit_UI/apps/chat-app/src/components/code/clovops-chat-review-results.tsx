"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ApiCodeWorkspaceAgentReview } from "@/lib/orbit-api";
import { cn } from "@/lib/utils";

type ClovopsChatReviewResultsProps = {
  reviews: ApiCodeWorkspaceAgentReview[];
  className?: string;
};

export function ClovopsChatReviewResults({ reviews, className }: ClovopsChatReviewResultsProps) {
  if (!reviews.length) return null;

  return (
    <section className={cn("w-full space-y-2 pl-11 sm:pl-12", className)} aria-label="Code review">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
        Review
      </p>
      {reviews.map((review) => (
        <div
          key={`${review.fileId}-${review.filePath}`}
          className={cn(
            "rounded-lg border px-3 py-2.5",
            review.passed
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-destructive/25 bg-destructive/5",
          )}
        >
          <div className="flex items-start gap-2">
            {review.passed ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground">
                {review.filePath}
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                  {review.passed ? "Passed" : "Needs fixes"}
                </span>
              </p>
              {review.issues.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {review.issues.map((issue, index) => (
                    <li
                      key={`${issue.line}-${index}`}
                      className="text-[12px] leading-snug text-muted-foreground"
                    >
                      Line {issue.line}: {issue.message}
                    </li>
                  ))}
                </ul>
              )}
              {review.summary ? (
                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground">
                  {review.summary}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
