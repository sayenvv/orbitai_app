"use client";

import { Lock, type LucideIcon } from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export type WorksheetTabId = string;

export type WorksheetNavItem = {
  id: WorksheetTabId;
  label: string;
  shortLabel: string;
  hint: string;
  icon: LucideIcon;
  available: boolean;
  badgeCount?: number;
};

type ResearchCompanionWorksheetNavbarProps = {
  activeTab: WorksheetTabId;
  tabs: WorksheetNavItem[];
  onSelectTab: (tab: WorksheetTabId) => void;
};

/** Full-width strip between the left sidebar and right tools panel. */
export function ResearchCompanionWorksheetNavbar({
  activeTab,
  tabs,
  onSelectTab,
}: ResearchCompanionWorksheetNavbarProps) {
  return (
    <div
      className="flex h-10 w-full min-w-0 items-center px-2 backdrop-blur-sm sm:px-3"
      role="presentation"
    >
      <nav
        className="inline-flex min-w-0 max-w-full flex-1 items-center overflow-x-auto rounded-lg border border-border/50 bg-muted/25 p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Worksheet views"
        role="tablist"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          const locked = !tab.available && tab.id !== "document";
          const showCount =
            tab.badgeCount && tab.badgeCount > 0 && tab.available && tab.id !== "document";

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={tab.label}
              title={
                locked
                  ? `${tab.hint} — upload a source and generate insights to unlock`
                  : tab.hint
              }
              onClick={() => onSelectTab(tab.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150",
                selected
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                locked && !selected && "opacity-70",
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  selected ? "text-primary" : "text-muted-foreground/90",
                )}
                strokeWidth={selected ? 2.25 : 2}
              />
              <span className="whitespace-nowrap">{tab.shortLabel}</span>
              {showCount ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums leading-none",
                    selected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/80 text-muted-foreground",
                  )}
                >
                  {tab.badgeCount! > 99 ? "99+" : tab.badgeCount}
                </span>
              ) : null}
              {locked ? (
                <Lock className="h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function isDocumentWorksheetTab(tabId: WorksheetTabId): boolean {
  return tabId === "document";
}
