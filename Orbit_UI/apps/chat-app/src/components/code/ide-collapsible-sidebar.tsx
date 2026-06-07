"use client";

import type { ReactNode } from "react";
import { PanelLeftClose, PanelRightClose } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SidebarTooltip } from "@/components/layout/sidebar-tooltip";
import {
  SIDEBAR_COLLAPSED_COLUMN_CLASS,
  SIDEBAR_ICON_SLOT_CLASS,
  SIDEBAR_NAV_GLYPH_CLASS,
} from "@/components/layout/sidebar-layout";
import { cn } from "@/lib/utils";

export const IDE_SIDEBAR_ICON_RAIL_WIDTH_PX = 52;

export type IdeSidebarTabConfig<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
};

type IdeCollapsibleSidebarProps<T extends string> = {
  side: "left" | "right";
  tabs: IdeSidebarTabConfig<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  children: ReactNode;
};

function IdeSidebarTopTabs<T extends string>({
  side,
  tabs,
  activeTab,
  onTabChange,
  onCollapse,
}: {
  side: "left" | "right";
  tabs: IdeSidebarTabConfig<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  onCollapse: () => void;
}) {
  const CollapseIcon = side === "left" ? PanelLeftClose : PanelRightClose;

  return (
    <div className="ide-sidebar-tabs flex shrink-0 items-end justify-between gap-1.5 border-b border-[color:var(--ide-border-subtle)] px-1.5 md:px-2">
      <div className="ide-sidebar-tab-strip flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto [scrollbar-width:thin]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <SidebarTooltip key={tab.id} label={tab.label} side="top">
              <button
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-label={tab.label}
                aria-selected={active}
                className={cn(
                  "ide-sidebar-tab flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-md",
                  active
                    ? "ide-sidebar-tab-active"
                    : "text-muted-foreground hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </SidebarTooltip>
          );
        })}
      </div>
      <SidebarTooltip label="Collapse sidebar" side="top">
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
          className={cn(
            "flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground",
          )}
        >
          <CollapseIcon className={SIDEBAR_NAV_GLYPH_CLASS} strokeWidth={1.75} />
        </button>
      </SidebarTooltip>
    </div>
  );
}

export function IdeCollapsibleSidebar<T extends string>({
  side,
  tabs,
  activeTab,
  onTabChange,
  collapsed,
  onCollapsedChange,
  children,
}: IdeCollapsibleSidebarProps<T>) {
  const tooltipSide = side === "left" ? "right" : "left";
  const CollapseIcon = side === "left" ? PanelLeftClose : PanelRightClose;

  const handleCollapsedTabClick = (tabId: T) => {
    onTabChange(tabId);
    onCollapsedChange(false);
  };

  if (collapsed) {
    return (
      <div
        className="ide-sidebar-icon-rail flex h-full min-h-0 w-full flex-col py-1.5"
        style={{ width: IDE_SIDEBAR_ICON_RAIL_WIDTH_PX }}
      >
        <div className={cn(SIDEBAR_COLLAPSED_COLUMN_CLASS, "gap-1")}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <SidebarTooltip key={tab.id} label={tab.label} side={tooltipSide}>
                <button
                  type="button"
                  onClick={() => handleCollapsedTabClick(tab.id)}
                  aria-label={tab.label}
                  aria-selected={active}
                  className={cn(
                    SIDEBAR_ICON_SLOT_CLASS,
                    "rounded-lg transition-colors",
                    active
                      ? "workspace-tab-active"
                      : "text-muted-foreground hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground",
                  )}
                >
                  <Icon className={SIDEBAR_NAV_GLYPH_CLASS} strokeWidth={1.75} />
                </button>
              </SidebarTooltip>
            );
          })}
        </div>

        <div className={cn(SIDEBAR_COLLAPSED_COLUMN_CLASS, "mt-auto gap-1 pb-1")}>
          <SidebarTooltip label="Expand sidebar" side={tooltipSide}>
            <button
              type="button"
              onClick={() => onCollapsedChange(false)}
              aria-label="Expand sidebar"
              className={cn(
                SIDEBAR_ICON_SLOT_CLASS,
                "rounded-lg text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground",
              )}
            >
              <CollapseIcon className={SIDEBAR_NAV_GLYPH_CLASS} strokeWidth={1.75} />
            </button>
          </SidebarTooltip>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <IdeSidebarTopTabs
        side={side}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onCollapse={() => onCollapsedChange(true)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
