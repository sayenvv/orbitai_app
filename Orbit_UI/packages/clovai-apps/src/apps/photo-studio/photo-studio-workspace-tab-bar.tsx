"use client";

import { CircleHelp, Home, LayoutTemplate, Loader2, Plus, X, type LucideIcon } from "lucide-react";
import { PhotoStudioNavMoreMenu, type PhotoStudioMoreMenuItem } from "./photo-studio-nav-more-menu";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export type PhotoStudioWorkspaceTab = {
  id: string;
  title: string;
  workspaceId: string | null;
  assetId: string | null;
  assetName: string | null;
  draftId: string;
  hasUnsavedChanges?: boolean;
};

type PhotoStudioWorkspaceChromeProps = {
  tabs: PhotoStudioWorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  isPreparingNew?: boolean;
  homeSelected?: boolean;
  onHomeClick?: () => void;
  moreMenuItems?: PhotoStudioMoreMenuItem[];
  onOpenHelp?: () => void;
};

export function PhotoStudioWorkspaceChrome({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  isPreparingNew = false,
  homeSelected = false,
  onHomeClick,
  moreMenuItems = [],
  onOpenHelp,
}: PhotoStudioWorkspaceChromeProps) {
  return (
    <header className="relative z-[110] shrink-0 border-b border-border/40 bg-card/80 backdrop-blur-md">
      <div className="flex h-11 items-stretch gap-0 px-3 sm:px-4">
        {/* Primary navigation */}
        <nav
          className="flex shrink-0 items-center"
          aria-label="Clovai Canvas navigation"
        >
          <div className="inline-flex items-center rounded-lg border border-border/50 bg-muted/25 p-0.5">
            <button
              type="button"
              aria-label="Home"
              title="Projects and recent work"
              onClick={onHomeClick}
              className={cn(
                "relative flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all duration-150",
                homeSelected
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              <Home className="h-3.5 w-3.5 shrink-0" strokeWidth={homeSelected ? 2.25 : 2} />
              <span className="hidden sm:inline">Home</span>
            </button>
            {moreMenuItems.length > 0 ? (
              <PhotoStudioNavMoreMenu items={moreMenuItems} />
            ) : null}
          </div>
        </nav>

        <div className="mx-3 hidden h-5 w-px shrink-0 self-center bg-border/50 sm:block" aria-hidden />

        {/* Workspace tabs */}
        {tabs.length > 0 ? (
          <div
            className="flex min-w-0 flex-1 items-stretch overflow-hidden"
            role="tablist"
            aria-label="Open workspaces"
          >
            <div className="flex min-w-0 flex-1 items-stretch gap-0.5 py-1.5 pr-0.5">
              {tabs.map((tab) => {
                const selected = tab.id === activeTabId;
                const label = tab.title.trim() || "Untitled";

                return (
                  <div
                    key={tab.id}
                    role="presentation"
                    className={cn(
                      "group relative flex h-8 min-w-0 items-stretch transition-[flex-grow,flex-basis,max-width] duration-200 ease-out",
                      selected
                        ? "z-10 max-w-[min(240px,38%)] flex-[0_1_200px]"
                        : "max-w-[min(140px,22%)] flex-[1_1_56px] hover:flex-[1_1_72px]",
                    )}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      title={label}
                      onClick={() => onSelectTab(tab.id)}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-1.5 rounded-md border py-0 text-left font-medium transition-colors duration-150",
                        selected
                          ? "border-border/50 bg-background px-2.5 pr-7 text-[13px] text-foreground shadow-sm"
                          : "border-transparent bg-transparent px-2 pr-6 text-[11px] text-muted-foreground hover:border-border/30 hover:bg-muted/40 hover:text-foreground",
                      )}
                    >
                      <LayoutTemplate
                        className={cn(
                          "shrink-0",
                          selected ? "h-3.5 w-3.5 text-primary" : "h-3 w-3 text-muted-foreground/80",
                        )}
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span className="min-w-0 truncate">{label}</span>
                      {tab.hasUnsavedChanges ? (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          title="Unsaved changes"
                          aria-label="Unsaved changes"
                        />
                      ) : null}
                    </button>
                    <button
                      type="button"
                      aria-label={`Close ${label}`}
                      title={`Close ${label}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                      className={cn(
                        "absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md transition-colors",
                        "text-muted-foreground hover:bg-muted hover:text-foreground",
                        selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <X className="h-3 w-3" strokeWidth={2.25} />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={onNewTab}
                disabled={isPreparingNew}
                title="New workspace"
                aria-label="New workspace"
                className={cn(
                  "ml-0.5 flex h-8 w-8 shrink-0 flex-none items-center justify-center rounded-md border border-dashed border-border/50",
                  "text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/5 hover:text-primary",
                  "disabled:cursor-wait disabled:opacity-50",
                )}
              >
                {isPreparingNew ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />
                ) : (
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        {/* Help */}
        <div className="flex shrink-0 items-center pl-2">
          <button
            type="button"
            onClick={() => onOpenHelp?.()}
            disabled={!onOpenHelp}
            title="Help"
            aria-label="Help"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CircleHelp className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
