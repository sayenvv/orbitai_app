"use client";

import { Loader2 } from "lucide-react";

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/60 ${className ?? ""}`} />;
}

export function PhotoStudioWorkspaceShimmer({ label = "Preparing workspace…" }: { label?: string }) {
  return (
    <div
      className="home-warm-canvas relative flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-busy="true"
      aria-label={label}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-foreground/[0.03] blur-3xl" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-primary/[0.04] blur-3xl" />
      </div>

      <div className="relative shrink-0 border-b border-border/30 bg-background/95 px-4 py-2.5 md:px-5">
        <div className="flex items-center gap-3">
          <ShimmerBlock className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <ShimmerBlock className="h-4 w-40 max-w-[60%]" />
            <ShimmerBlock className="h-3 w-28 max-w-[45%]" />
          </div>
          <ShimmerBlock className="hidden h-9 w-24 rounded-lg sm:block" />
          <ShimmerBlock className="hidden h-9 w-24 rounded-lg sm:block" />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[17rem] shrink-0 border-r border-border/30 p-3 lg:block">
          <ShimmerBlock className="mb-3 h-8 w-full rounded-lg" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <ShimmerBlock key={index} className="h-10 w-full rounded-lg" />
            ))}
          </div>
          <ShimmerBlock className="mt-4 h-28 w-full rounded-xl" />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-2xl space-y-4">
            <ShimmerBlock className="mx-auto aspect-square w-full max-w-md rounded-[1.75rem]" />
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span>{label}</span>
            </div>
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 border-l border-border/30 p-3 xl:block">
          <ShimmerBlock className="mb-3 h-8 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <ShimmerBlock key={index} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
