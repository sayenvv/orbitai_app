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
    <div className="flex gap-4 py-1" aria-label="Assistant is responding">
      <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
      <div className="flex-1 pt-0.5">
        <AssistantTextShimmer />
      </div>
    </div>
  );
}

export function ChatThreadShimmer() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-[45%] rounded-2xl rounded-br-sm" />
      </div>
      <AssistantReplyShimmer />
    </div>
  );
}

export function SidebarRecentsShimmer({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 px-1 py-1" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded-full" />
      ))}
    </div>
  );
}
