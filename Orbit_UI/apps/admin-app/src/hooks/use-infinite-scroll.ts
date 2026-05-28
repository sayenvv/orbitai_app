"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Incrementally reveals items from an array as the user scrolls, by observing
 * a sentinel element placed at the end of the rendered list. Use the returned
 * `sentinelRef` on a small <div /> right after your `.map()` output.
 *
 * Resets back to `step` items whenever `items` changes (e.g. filter/search/sort).
 */
export function useInfiniteScroll<T>(
  items: T[],
  options: { step?: number; root?: HTMLElement | null; rootMargin?: string } = {}
) {
  const { step = 20, root = null, rootMargin = "240px" } = options;
  const [visibleCount, setVisibleCount] = useState(step);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset when underlying list changes
  useEffect(() => {
    setVisibleCount(step);
  }, [items, step]);

  const visible = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisibleCount((c) => Math.min(c + step, items.length));
          }
        }
      },
      { root, rootMargin, threshold: 0 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, items.length, root, rootMargin, step]);

  return {
    visible,
    sentinelRef,
    hasMore,
    total: items.length,
    visibleCount: Math.min(visibleCount, items.length),
    reset: () => setVisibleCount(step),
    loadMore: () => setVisibleCount((c) => Math.min(c + step, items.length)),
  };
}
