"use client";

import { FileStack, Home, Loader2, Plus } from "lucide-react";
import {
  PhotoStudioNavMoreMenu,
  type PhotoStudioMoreMenuItem,
} from "../photo-studio/photo-studio-nav-more-menu";
import {
  DashboardTab,
  DocumentTab,
  SegmentedTabList,
  TabDivider,
} from "./project-planning-dashboard-ui";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export type ProjectPlanningWorkspaceTab = {
  id: string;
  title: string;
  draftId: string;
  projectId: string;
  hasUnsavedChanges?: boolean;
};

export type ProjectPlanningMoreMenuItem = PhotoStudioMoreMenuItem;

export type ProjectPlanningHeaderNavProps = {
  tabs: ProjectPlanningWorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  isPreparingNew?: boolean;
  homeSelected?: boolean;
  onHomeClick?: () => void;
  moreMenuItems?: ProjectPlanningMoreMenuItem[];
};

/** App shell navigation — Home control + document tabs for open projects. */
export function ProjectPlanningHeaderNav({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  isPreparingNew = false,
  homeSelected = false,
  onHomeClick,
  moreMenuItems = [],
}: ProjectPlanningHeaderNavProps) {
  return (
    <div className="flex min-h-9 min-w-0 flex-1 items-center gap-2 overflow-hidden">
      <SegmentedTabList aria-label="Studio views">
        <DashboardTab active={homeSelected} onClick={() => onHomeClick?.()}>
          <Home className="h-3.5 w-3.5 shrink-0" strokeWidth={homeSelected ? 2.25 : 2} />
          <span>Home</span>
        </DashboardTab>
        {moreMenuItems.length > 0 ? (
          <PhotoStudioNavMoreMenu items={moreMenuItems} />
        ) : null}
      </SegmentedTabList>

      <TabDivider />

      <div
        className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Open projects"
      >
        {tabs.map((tab) => {
          const selected = !homeSelected && tab.id === activeTabId;
          const label = tab.title.trim() || "Untitled project";

          return (
            <DocumentTab
              key={tab.id}
              active={selected}
              title={label}
              onClick={() => onSelectTab(tab.id)}
              onClose={() => onCloseTab(tab.id)}
            >
              <FileStack
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
                strokeWidth={2}
              />
              <span className="min-w-0 truncate">{label}</span>
              {tab.hasUnsavedChanges ? (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground"
                  title="Unsaved changes"
                  aria-label="Unsaved changes"
                />
              ) : null}
            </DocumentTab>
          );
        })}

        <button
          type="button"
          onClick={onNewTab}
          disabled={isPreparingNew}
          title="New project"
          aria-label="New project"
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-border/50 px-2.5 text-xs font-medium text-muted-foreground transition-colors",
            "hover:border-foreground/25 hover:bg-foreground/[0.04] hover:text-foreground disabled:opacity-40",
          )}
        >
          {isPreparingNew ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          )}
          <span className="hidden sm:inline">{tabs.length === 0 ? "New project" : "New"}</span>
        </button>
      </div>
    </div>
  );
}

/** @deprecated Use ProjectPlanningHeaderNav in the app shell top bar. */
export const ProjectPlanningWorkspaceChrome = ProjectPlanningHeaderNav;
