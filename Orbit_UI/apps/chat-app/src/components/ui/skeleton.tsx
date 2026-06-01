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

export function ResearchCompanionWorkspaceShimmer() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
      aria-busy="true"
      aria-label="Opening workspace"
    >
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
        <Skeleton className="h-4 w-40 rounded-full" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div className="hidden w-44 shrink-0 space-y-2 md:block">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[4.75rem] w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="min-h-0 flex-1 rounded-xl" />
        <div className="hidden w-64 shrink-0 space-y-2 lg:block">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
      <p className="pb-4 text-center text-xs font-medium text-muted-foreground">Opening workspace…</p>
    </div>
  );
}
