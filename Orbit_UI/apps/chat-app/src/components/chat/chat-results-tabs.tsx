"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { ChatJobCards } from "@/components/chat/chat-job-cards";
import { ChatPlaceCards } from "@/components/chat/chat-place-cards";
import { ChatSearchImages } from "@/components/chat/chat-search-images";
import { ChatWebSearchCards } from "@/components/chat/chat-web-search-cards";
import {
  buildResultTabs,
  type ResultTabId,
} from "@/lib/result-tabs-utils";
import { cn } from "@/lib/utils";
import type { AdaptiveCard, WebSearchImage } from "@/types";

type ChatResultsTabsProps = {
  cards?: AdaptiveCard[];
  images?: WebSearchImage[];
  className?: string;
  defaultTab?: ResultTabId;
  variant?: "inline" | "sheet";
};

export const ChatResultsTabs = memo(function ChatResultsTabs({
  cards,
  images,
  className,
  defaultTab,
  variant = "inline",
}: ChatResultsTabsProps) {
  const payload = useMemo(() => buildResultTabs(cards, images), [cards, images]);
  const tabs = payload?.tabs ?? [];
  const groups = payload?.groups;
  const allImages = payload?.allImages ?? [];

  const [activeTab, setActiveTab] = useState<ResultTabId>(defaultTab ?? "web");

  useEffect(() => {
    if (!tabs.length) return;
    if (defaultTab && tabs.some((tab) => tab.id === defaultTab)) {
      setActiveTab(defaultTab);
      return;
    }
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [activeTab, defaultTab, tabs]);

  if (!payload || !groups || !tabs.length) return null;

  const isSheet = variant === "sheet";
  const layout = isSheet ? "list" : "grid";
  const showTabBar = tabs.length > 1;
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  const renderPanel = (tabId: ResultTabId) => {
    if (tabId === "web") {
      return <ChatWebSearchCards cards={groups.web} hideHeader layout={layout} />;
    }
    if (tabId === "jobs") {
      return <ChatJobCards cards={groups.jobs} hideHeader layout={layout} />;
    }
    if (tabId === "places") {
      return <ChatPlaceCards cards={groups.places} hideHeader layout={layout} />;
    }
    if (tabId === "images") {
      return <ChatSearchImages images={allImages} hideHeader layout={layout} />;
    }
    return null;
  };

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      {showTabBar ? (
        <div className="shrink-0 px-4 py-3 md:px-5">
          <div
            className="glass-surface flex gap-1 overflow-x-auto rounded-xl p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Result collections"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all",
                    selected
                      ? "glass-chip text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-[var(--workspace-tab-inactive-bg-hover)]/70 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn("h-3.5 w-3.5", selected ? tab.accent : "opacity-70")}
                    strokeWidth={1.75}
                  />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                      selected ? `${tab.chipBg} ${tab.accent}` : "text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-b border-[color:var(--workspace-tab-border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <active.icon className={cn("h-3.5 w-3.5", active.accent)} strokeWidth={1.75} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {active.label}
            </p>
            <span className="glass-chip rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {active.count}
            </span>
          </div>
        </div>
      )}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]",
          isSheet ? "px-4 py-4 md:px-5" : "p-2 sm:p-3",
        )}
        role="tabpanel"
      >
        {renderPanel(showTabBar ? activeTab : tabs[0].id)}
      </div>
    </div>
  );
});
