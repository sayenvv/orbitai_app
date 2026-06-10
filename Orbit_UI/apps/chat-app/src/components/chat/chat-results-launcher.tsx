"use client";

import { ChevronRight, PanelTop } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChatResultsStackedDeck } from "@/components/chat/chat-results-stacked-deck";
import { ChatResultsTabs } from "@/components/chat/chat-results-tabs";
import {
  buildResultTabs,
  type ResultTabId,
} from "@/lib/result-tabs-utils";
import { cn } from "@/lib/utils";
import type { AdaptiveCard, WebSearchImage } from "@/types";

const SHEET_DISMISS_THRESHOLD_PX = 100;

type ChatResultsLauncherProps = {
  cards?: AdaptiveCard[];
  images?: WebSearchImage[];
  className?: string;
};

export const ChatResultsLauncher = memo(function ChatResultsLauncher({
  cards,
  images,
  className,
}: ChatResultsLauncherProps) {
  const payload = useMemo(() => buildResultTabs(cards, images), [cards, images]);
  const tabs = payload?.tabs ?? [];
  const groups = payload?.groups;
  const allImages = payload?.allImages ?? [];

  const [mounted, setMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ResultTabId | undefined>();
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [sheetDragging, setSheetDragging] = useState(false);

  const touchStartYRef = useRef(0);
  const sheetDragStartYRef = useRef(0);
  const sheetDragOffsetRef = useRef(0);
  const sheetDraggingRef = useRef(false);
  const sheetDragHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSheetDragOffset(0);
    setSheetDragging(false);
    sheetDragOffsetRef.current = 0;
    sheetDraggingRef.current = false;
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    const handle = sheetDragHandleRef.current;
    if (!handle) return;

    const onDragStart = (clientY: number) => {
      sheetDragStartYRef.current = clientY;
      sheetDraggingRef.current = true;
      setSheetDragging(true);
    };

    const onDragMove = (clientY: number) => {
      if (!sheetDraggingRef.current) return;
      const delta = clientY - sheetDragStartYRef.current;
      if (delta <= 0) {
        sheetDragOffsetRef.current = 0;
        setSheetDragOffset(0);
        return;
      }
      sheetDragOffsetRef.current = delta;
      setSheetDragOffset(delta);
    };

    const onDragEnd = () => {
      if (!sheetDraggingRef.current) return;
      sheetDraggingRef.current = false;
      setSheetDragging(false);
      if (sheetDragOffsetRef.current >= SHEET_DISMISS_THRESHOLD_PX) {
        closeSheet();
        return;
      }
      sheetDragOffsetRef.current = 0;
      setSheetDragOffset(0);
    };

    const onTouchStart = (event: TouchEvent) => {
      onDragStart(event.touches[0]?.clientY ?? 0);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!sheetDraggingRef.current) return;
      onDragMove(event.touches[0]?.clientY ?? 0);
      if (sheetDragOffsetRef.current > 0) {
        event.preventDefault();
      }
    };

    const onTouchEnd = () => onDragEnd();

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      onDragStart(event.clientY);
      handle.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!sheetDraggingRef.current || !handle.hasPointerCapture(event.pointerId)) return;
      onDragMove(event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!handle.hasPointerCapture(event.pointerId)) return;
      handle.releasePointerCapture(event.pointerId);
      onDragEnd();
    };

    handle.addEventListener("touchstart", onTouchStart, { passive: true });
    handle.addEventListener("touchmove", onTouchMove, { passive: false });
    handle.addEventListener("touchend", onTouchEnd);
    handle.addEventListener("touchcancel", onTouchEnd);
    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);

    return () => {
      handle.removeEventListener("touchstart", onTouchStart);
      handle.removeEventListener("touchmove", onTouchMove);
      handle.removeEventListener("touchend", onTouchEnd);
      handle.removeEventListener("touchcancel", onTouchEnd);
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("pointercancel", onPointerUp);
    };
  }, [sheetOpen, closeSheet]);

  if (!payload || !tabs.length || !groups) return null;

  const totalCount = tabs.reduce((sum, tab) => sum + tab.count, 0);

  const openSheet = (tabId?: ResultTabId) => {
    setActiveTab(tabId ?? tabs[0]?.id);
    setSheetDragOffset(0);
    setSheetDragging(false);
    sheetDragOffsetRef.current = 0;
    sheetDraggingRef.current = false;
    setSheetOpen(true);
  };

  const peek = (
    <div
      className={cn(
        "glass-surface glass-card glass-composer relative w-full overflow-hidden rounded-2xl",
        className,
      )}
      onTouchStart={(event) => {
        touchStartYRef.current = event.touches[0]?.clientY ?? 0;
      }}
      onTouchEnd={(event) => {
        const endY = event.changedTouches[0]?.clientY ?? 0;
        if (touchStartYRef.current - endY > 48) {
          openSheet();
        }
      }}
    >
      <span className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-primary/70" aria-hidden />

      <button
        type="button"
        onClick={() => openSheet()}
        className="flex w-full items-center gap-2 px-4 py-2.5 pl-5 text-left transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)]/80"
      >
        <span className="glass-icon-well flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
          <PanelTop className="h-3.5 w-3.5 text-foreground/80" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold tracking-[-0.01em] text-foreground">
            Sources & results
          </span>
          <span className="text-[10px] text-muted-foreground">
            {totalCount} result{totalCount === 1 ? "" : "s"}
          </span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" strokeWidth={1.75} />
      </button>

      <ChatResultsStackedDeck
        groups={groups}
        allImages={allImages}
        tabs={tabs}
        onOpen={(tabId) => openSheet(tabId)}
      />
    </div>
  );

  const sheet =
    mounted && sheetOpen
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col justify-end md:items-center md:justify-center md:p-10">
            <div
              aria-hidden
              className="absolute inset-0 bg-black/55 backdrop-blur-[3px] animate-in fade-in duration-200"
              style={{
                opacity: sheetDragOffset > 0 ? Math.max(0.2, 1 - sheetDragOffset / 320) : undefined,
              }}
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-label="Research panel"
              className={cn(
                "glass-surface glass-modal relative z-10 flex w-full flex-col overflow-hidden",
                "max-h-[min(92dvh,800px)] rounded-t-[1.25rem]",
                !sheetDragging && sheetDragOffset === 0 && "animate-in slide-in-from-bottom duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                "md:max-w-3xl md:rounded-2xl md:fade-in md:zoom-in-[0.98]",
              )}
              style={{
                transform: sheetDragOffset > 0 ? `translateY(${sheetDragOffset}px)` : undefined,
                transition: sheetDragging ? "none" : "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
              }}
            >
              <div
                ref={sheetDragHandleRef}
                className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
                aria-label="Drag down to close"
              >
                <div className="flex flex-col items-center pt-3 md:pt-4">
                  <span className="glass-chip h-1 w-11 rounded-full bg-foreground/15" />
                </div>

                <div className="flex items-center gap-3 px-5 pb-4 pt-3 md:px-6">
                  <span className="glass-icon-well flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <PanelTop className="h-4 w-4 text-foreground/80" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                      Research panel
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Drag down to close · {totalCount} source{totalCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden border-t border-[color:var(--workspace-tab-border)] safe-bottom">
                <ChatResultsTabs
                  key={activeTab ?? "default"}
                  cards={cards}
                  images={images}
                  defaultTab={activeTab}
                  variant="sheet"
                  className="h-full max-h-[calc(92dvh-7.75rem)] md:max-h-[min(70dvh,620px)]"
                />
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const desktopPanel = (
    <div className="glass-surface glass-card hidden overflow-hidden rounded-2xl md:block">
      <div className="flex items-center gap-3 border-b border-[color:var(--workspace-tab-border)] px-4 py-3">
        <span className="glass-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <PanelTop className="h-4 w-4 text-foreground/80" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">Research panel</p>
          <p className="text-[11px] text-muted-foreground">
            {totalCount} source{totalCount === 1 ? "" : "s"} across {tabs.length} collection
            {tabs.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <ChatResultsTabs cards={cards} images={images} variant="inline" />
    </div>
  );

  return (
    <>
      <div className="md:hidden">{peek}</div>
      {desktopPanel}
      {sheet}
    </>
  );
});
