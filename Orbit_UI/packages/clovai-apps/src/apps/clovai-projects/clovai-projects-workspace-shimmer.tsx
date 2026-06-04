"use client";

export function ClovaiProjectsWorkspaceShimmer({ label = "Loading workspace…" }: { label?: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-background px-6 py-12">
      <div className="h-10 w-10 animate-pulse rounded-full bg-primary/15 ring-4 ring-primary/10" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex w-full max-w-md flex-col gap-2">
        <div className="h-3 animate-pulse rounded-md bg-muted/80" />
        <div className="h-3 w-4/5 animate-pulse rounded-md bg-muted/60" />
        <div className="h-3 w-3/5 animate-pulse rounded-md bg-muted/50" />
      </div>
    </div>
  );
}
