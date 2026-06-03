"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, MoreHorizontal, type LucideIcon } from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export type PhotoStudioMoreMenuItem = {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};

type PhotoStudioNavMoreMenuProps = {
  items: PhotoStudioMoreMenuItem[];
  active?: boolean;
  className?: string;
};

export function PhotoStudioNavMoreMenu({
  items,
  active = false,
  className,
}: PhotoStudioNavMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="More options"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Open, upload, and canvas import options"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all duration-150",
          open || active
            ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
            : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
        )}
      >
        <MoreHorizontal className="h-3.5 w-3.5 shrink-0" strokeWidth={open || active ? 2.25 : 2} />
        <span className="hidden sm:inline">More</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 opacity-60 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="More options"
          className="absolute left-0 top-[calc(100%+6px)] z-[120] w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border/50 bg-popover p-1 shadow-lg ring-1 ring-black/5"
        >
          <p className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Open & import
          </p>
          <ul className="flex flex-col gap-0.5 pb-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled || item.loading}
                    onClick={() => {
                      if (item.disabled || item.loading) return;
                      item.onClick();
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                      item.disabled || item.loading
                        ? "cursor-not-allowed opacity-45"
                        : "hover:bg-muted/70",
                    )}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      {item.loading ? (
                        <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-primary/40" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-foreground">
                        {item.loading ? "Working…" : item.label}
                      </span>
                      {item.description ? (
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
