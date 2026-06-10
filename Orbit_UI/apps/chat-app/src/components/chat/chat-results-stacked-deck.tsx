"use client";

import { memo } from "react";
import {
  buildCollapsedPreviewItems,
  countCollapsedPreviewItems,
  COLLAPSED_PREVIEW_LIMIT,
  type CollapsedResultItem,
  type ResultTab,
  type ResultTabId,
} from "@/lib/result-tabs-utils";
import type { AdaptiveCardGroups } from "@/lib/adaptive-card-partition";
import { cn } from "@/lib/utils";
import type { WebSearchImage } from "@/types";

const STACK_LAYERS = COLLAPSED_PREVIEW_LIMIT;
const LAYER_OFFSET_PX = 10;
const CARD_HEIGHT_PX = 64;

type ChatResultsStackedDeckProps = {
  groups: AdaptiveCardGroups;
  allImages: WebSearchImage[];
  tabs: ResultTab[];
  onOpen: (tabId?: ResultTabId) => void;
  className?: string;
};

const StackedCardFace = memo(function StackedCardFace({
  item,
  tab,
  isFront,
}: {
  item: CollapsedResultItem;
  tab: ResultTab;
  isFront: boolean;
}) {
  const Icon = tab.icon;

  if (!isFront) {
    return (
      <div className="flex h-full items-center gap-2 px-3" aria-hidden>
        <span className={cn("glass-icon-well flex h-6 w-6 shrink-0 items-center justify-center rounded-md", tab.chipBg)}>
          <Icon className={cn("h-3 w-3 opacity-70", tab.accent)} strokeWidth={1.75} />
        </span>
        <span className="truncate text-[10px] font-medium text-muted-foreground/80">
          {item.title}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center gap-3 px-3.5">
      <span className={cn("glass-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tab.chipBg)}>
        <Icon className={cn("h-4 w-4", tab.accent)} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="glass-chip inline-block rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {tab.shortLabel}
        </span>
        <span className="mt-1 block truncate text-[12px] font-semibold leading-snug text-foreground">
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
          {item.subtitle}
        </span>
      </span>
    </div>
  );
});

export const ChatResultsStackedDeck = memo(function ChatResultsStackedDeck({
  groups,
  allImages,
  tabs,
  onOpen,
  className,
}: ChatResultsStackedDeckProps) {
  const previewItems = buildCollapsedPreviewItems(groups, allImages, STACK_LAYERS);
  const totalCount = countCollapsedPreviewItems(groups, allImages);
  const tabById = Object.fromEntries(tabs.map((tab) => [tab.id, tab])) as Record<
    ResultTabId,
    ResultTab
  >;

  if (!previewItems.length) return null;

  const frontItem = previewItems[0];
  const frontTab = tabById[frontItem.tabId];
  const stackHeight =
    CARD_HEIGHT_PX + Math.max(0, previewItems.length - 1) * LAYER_OFFSET_PX;
  const extraCount = Math.max(0, totalCount - 1);

  return (
    <button
      type="button"
      onClick={() => onOpen(frontItem.tabId)}
      className={cn(
        "relative w-full border-t border-[color:var(--workspace-tab-border)] px-4 py-3 text-left transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)]/60",
        className,
      )}
      aria-label={`Open ${totalCount} search results`}
    >
      <div className="relative mx-auto w-full max-w-full" style={{ height: stackHeight }}>
        {[...previewItems].reverse().map((item, reverseIndex) => {
          const layerIndex = previewItems.length - 1 - reverseIndex;
          const layersBehind = layerIndex;
          const isFront = layersBehind === 0;
          const tab = tabById[item.tabId];
          if (!tab) return null;

          return (
            <div
              key={item.key}
              className={cn(
                "results-glass-card glass-card absolute inset-x-0 overflow-hidden rounded-xl",
                isFront && "results-glass-card-interactive",
              )}
              style={{
                top: layersBehind * LAYER_OFFSET_PX,
                height: CARD_HEIGHT_PX,
                transform: `scale(${1 - layersBehind * 0.028})`,
                transformOrigin: "top center",
                zIndex: reverseIndex,
                opacity: isFront ? 1 : 0.5 + (previewItems.length - layersBehind) * 0.1,
              }}
            >
              <StackedCardFace item={item} tab={tab} isFront={isFront} />
            </div>
          );
        })}
      </div>

      {extraCount > 0 && frontTab ? (
        <span className={cn("glass-chip absolute bottom-4 right-6 z-20 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums", frontTab.accent)}>
          +{extraCount} more
        </span>
      ) : null}
    </button>
  );
});
