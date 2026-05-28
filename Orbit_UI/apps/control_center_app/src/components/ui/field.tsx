import { cn } from "@/lib/utils";

/**
 * Bordered card with a small uppercase header and divider rows.
 * Used across configuration, widgets, themes, etc.
 */
export function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      <div className="border-b px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

/** Label-on-the-left / control-on-the-right row inside a `Section`. */
export function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

/** Standalone titled card (no divided rows). */
export function Card({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <p className="text-sm font-semibold tracking-tight">{title}</p>
      {description && (
        <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">{description}</p>
      )}
      {children}
    </div>
  );
}

/** iOS-style toggle row that lives inside a `Section`. */
export function Toggle({
  label,
  defaultOn,
}: {
  label: string;
  defaultOn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        aria-label={`Toggle ${label}`}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          defaultOn ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            defaultOn ? "left-[18px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}
