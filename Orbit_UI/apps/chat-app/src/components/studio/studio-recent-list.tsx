"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";

import { formatStudioRecentTime } from "@/lib/studio-recent-plans";
import { cn } from "@/lib/utils";

export type StudioRecentItem = {
  id: string;
  title: string;
  openedAt: number;
  statusLabel: string;
  statusTone?: "default" | "success" | "warning" | "muted";
};

export function StudioRecentList({
  title,
  items,
  emptyLabel,
  icon: Icon,
  onSelect,
  disabled = false,
}: {
  title: string;
  items: StudioRecentItem[];
  emptyLabel: string;
  icon: LucideIcon;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  if (items.length === 0) {
    return (
      <section className="studio-recent-panel mt-8">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {title}
          </p>
        </div>
        <div className="border-t border-border/50 px-4 py-5 text-center">
          <span className="mx-auto mb-2 flex size-8 items-center justify-center rounded-lg border border-border/60 bg-muted/25 text-muted-foreground">
            <Icon className="size-3.5" strokeWidth={1.75} />
          </span>
          <p className="text-[12px] text-muted-foreground">{emptyLabel}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="studio-recent-panel mt-8">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
        <span className="rounded-full bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {items.length}
        </span>
      </div>

      <ul className="divide-y divide-border/40 border-t border-border/50">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(item.id)}
              className="studio-recent-row group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/55 bg-background/80 text-muted-foreground transition-colors group-hover:border-border group-hover:text-foreground">
                <Icon className="size-3.5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-foreground">
                  {item.title}
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span
                    className={cn(
                      "studio-recent-status",
                      item.statusTone === "success" && "studio-recent-status-success",
                      item.statusTone === "warning" && "studio-recent-status-warning",
                      item.statusTone === "muted" && "studio-recent-status-muted",
                    )}
                  >
                    {item.statusLabel}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80">
                    {formatStudioRecentTime(item.openedAt)}
                  </span>
                </span>
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
