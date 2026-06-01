import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-muted/50 via-muted/80 to-muted/50 bg-[length:200%_100%]",
        className,
      )}
      style={{ animation: "skeleton-shimmer 1.5s ease-in-out infinite" }}
    />
  );
}

export function AssistantTextShimmer() {
  return (
    <div className="space-y-2.5" aria-hidden>
      <Skeleton className="h-3.5 w-[92%] rounded-full" />
      <Skeleton className="h-3.5 w-[76%] rounded-full" />
      <Skeleton className="h-3.5 w-[58%] rounded-full" />
    </div>
  );
}

export function AssistantReplyShimmer() {
  return (
    <div className="flex gap-3 py-1 sm:gap-4" aria-label="Assistant is responding">
      <Skeleton className="h-8 w-8 shrink-0 rounded-xl" />
      <div className="flex-1 rounded-2xl rounded-tl-md bg-muted/70 px-4 py-3 dark:bg-muted/45">
        <AssistantTextShimmer />
      </div>
    </div>
  );
}

export function ChatThreadShimmer() {
  return (
    <div className="w-full space-y-6 py-8">
      <div className="flex justify-end">
        <Skeleton className="h-12 w-[50%] rounded-[22px] rounded-br-md bg-primary/12 dark:bg-primary/20" />
      </div>
      <AssistantReplyShimmer />
      <div className="flex justify-end pt-2">
        <Skeleton className="h-10 w-[38%] rounded-[22px] rounded-br-md bg-primary/12 dark:bg-primary/20" />
      </div>
      <AssistantReplyShimmer />
    </div>
  );
}

export function SidebarRecentsShimmer({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-1 py-1" aria-hidden aria-label="Loading chat history">
      <Skeleton className="h-8 w-full rounded-full" />
      <SidebarRecentsRowsShimmer rows={rows} />
    </div>
  );
}

export function SidebarRecentsRowsShimmer({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 px-1 py-1" aria-hidden aria-label="Loading chats">
      <Skeleton className="h-2.5 w-12 rounded-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded-full" />
      ))}
    </div>
  );
}

export function ChatSideRailShimmer() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-3.5 w-[70%] rounded-full" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-[88%] rounded-full" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-2.5 w-16 rounded-full" />
        <Skeleton className="aspect-[2/1] w-full rounded-xl" />
        <Skeleton className="aspect-[2/1] w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-14 rounded-full" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function PhotoStudioLaunchShimmer() {
  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
      aria-busy="true"
      aria-label="Opening Photo Studio"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-violet-400/15 blur-3xl" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <Skeleton className="h-44 w-full rounded-[2rem] bg-gradient-to-br from-violet-200/40 via-fuchsia-200/30 to-cyan-200/40 md:h-52 dark:from-violet-900/30 dark:via-fuchsia-900/20 dark:to-cyan-900/25" />
          <div className="grid gap-3 lg:grid-cols-2">
            <Skeleton className="h-28 w-full rounded-[1.25rem] bg-violet-100/50 dark:bg-violet-950/20" />
            <Skeleton className="h-28 w-full rounded-[1.25rem] bg-cyan-100/50 dark:bg-cyan-950/20" />
          </div>
          <Skeleton className="h-36 w-full rounded-[1.35rem]" />
        </div>
      </div>
      <p className="relative pb-4 text-center text-xs font-medium text-muted-foreground">Opening Photo Studio…</p>
    </div>
  );
}

export function ResearchCompanionWorkspaceShimmer() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
      aria-busy="true"
      aria-label="Opening workspace"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <Skeleton className="h-44 w-full rounded-[2rem] md:h-52" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <div className="grid gap-3 lg:grid-cols-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        </div>
      </div>
      <p className="pb-4 text-center text-xs font-medium text-muted-foreground">Opening workspace…</p>
    </div>
  );
}
