"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Minimize2,
  PanelRight,
  PanelRightClose,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { RenderTask } from "pdfjs-dist";
import { isPdfRenderCancelled, renderPdfPageToCanvas } from "@/lib/pdfjs";
import { searchPdfDocument, type PdfSearchRect } from "@/lib/pdf-search";
import { cn } from "@/lib/utils";
import { usePdfDocument } from "@/components/rag/pdf-document-provider";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const RESIZE_DEBOUNCE_MS = 120;
const SEARCH_DEBOUNCE_MS = 300;
const STAGE_PADDING_X = 48;
const STAGE_PADDING_Y = 48;

function ViewerToolButton({
  label,
  onClick,
  disabled,
  active,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-transparent px-2 text-sm transition-all duration-200",
        active
          ? "border-border/30 bg-foreground text-background"
          : "text-muted-foreground hover:border-border/30 hover:bg-muted/70 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-35 hover:border-transparent hover:bg-transparent hover:text-muted-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ViewerToolbarDivider() {
  return <span className="mx-0.5 h-5 w-1 shrink-0" aria-hidden="true" />;
}

type PdfPageCanvasProps = {
  page: number;
  targetWidth?: number;
  fitContainer?: boolean;
  zoom?: number;
  highlightRects?: PdfSearchRect[];
  className?: string;
  canvasClassName?: string;
};

export function PdfPageCanvas({
  page,
  targetWidth = 56,
  fitContainer = false,
  zoom = 1,
  highlightRects = [],
  className,
  canvasClassName,
}: PdfPageCanvasProps) {
  const { document, loading, error } = usePdfDocument();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const renderGenerationRef = useRef(0);
  const resizeTimerRef = useRef<number | null>(null);
  const fitScaleRef = useRef(1);
  const layoutSizeRef = useRef({ width: 0, height: 0 });
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [hasRendered, setHasRendered] = useState(false);
  const [renderScale, setRenderScale] = useState(1);
  const [displayScale, setDisplayScale] = useState({ x: 1, y: 1 });

  const syncDisplayScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return;
    setDisplayScale({
      x: canvas.clientWidth / canvas.width,
      y: canvas.clientHeight / canvas.height,
    });
  }, []);

  useLayoutEffect(() => {
    syncDisplayScale();
  }, [hasRendered, renderScale, zoom, highlightRects.length, syncDisplayScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      syncDisplayScale();
    });
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [hasRendered, syncDisplayScale]);

  useEffect(() => {
    fitScaleRef.current = 1;
    layoutSizeRef.current = { width: 0, height: 0 };
  }, [page, document]);

  useEffect(() => {
    if (!document) return;

    let active = true;

    const render = async () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const generation = ++renderGenerationRef.current;

      try {
        setRendering(true);
        setRenderError("");

        const containerWidth = fitContainer
          ? Math.max(container.clientWidth - STAGE_PADDING_X, targetWidth)
          : targetWidth;
        const containerHeight = fitContainer
          ? Math.max(container.clientHeight - STAGE_PADDING_Y, 0)
          : 0;

        const pdfPage = await document.getPage(page);
        if (!active || generation !== renderGenerationRef.current || !canvasRef.current) return;

        const baseViewport = pdfPage.getViewport({ scale: 1 });

        let scale: number;
        if (fitContainer) {
          const layoutChanged =
            Math.abs(containerWidth - layoutSizeRef.current.width) >= 8 ||
            Math.abs(containerHeight - layoutSizeRef.current.height) >= 8;

          if (layoutChanged || fitScaleRef.current <= 0) {
            const scaleByWidth = containerWidth / baseViewport.width;
            const scaleByHeight =
              containerHeight > 0 ? containerHeight / baseViewport.height : scaleByWidth;
            fitScaleRef.current = Math.min(scaleByWidth, scaleByHeight);
            layoutSizeRef.current = { width: containerWidth, height: containerHeight };
          }

          scale = fitScaleRef.current * zoom;
        } else {
          scale = (targetWidth / baseViewport.width) * zoom;
        }

        await renderPdfPageToCanvas(document, page, canvasRef.current, {
          scale,
          activeTask: renderTaskRef,
        });

        if (!active || generation !== renderGenerationRef.current) return;
        setRenderScale(scale);
        setHasRendered(true);
      } catch (err) {
        if (!active || generation !== renderGenerationRef.current) return;
        if (isPdfRenderCancelled(err)) return;
        setRenderError(err instanceof Error ? err.message : "Could not render page");
        setHasRendered(false);
      } finally {
        if (active && generation === renderGenerationRef.current) {
          setRendering(false);
        }
      }
    };

    setHasRendered(false);

    const scheduleRender = () => {
      window.requestAnimationFrame(() => {
        if (active) void render();
      });
    };

    scheduleRender();

    const debouncedScheduleRender = () => {
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = window.setTimeout(() => {
        resizeTimerRef.current = null;
        scheduleRender();
      }, RESIZE_DEBOUNCE_MS);
    };

    if (!fitContainer) {
      return () => {
        active = false;
        renderGenerationRef.current += 1;
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }
      };
    }

    const container = containerRef.current;
    if (!container) {
      return () => {
        active = false;
        renderGenerationRef.current += 1;
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }
        if (resizeTimerRef.current !== null) {
          window.clearTimeout(resizeTimerRef.current);
        }
      };
    }

    const observer = new ResizeObserver(() => {
      debouncedScheduleRender();
    });
    observer.observe(container);

    return () => {
      active = false;
      renderGenerationRef.current += 1;
      observer.disconnect();
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [document, page, targetWidth, fitContainer, zoom]);

  const isZoomed = fitContainer && zoom !== 1;
  const showLoader = loading || rendering || (!hasRendered && !renderError && !error);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative",
        fitContainer
          ? "rc-pdf-stage h-full w-full overflow-auto p-6 md:p-10"
          : "flex h-full w-full items-center justify-center",
        className,
      )}
    >
      {showLoader && (
        <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px]">
          <div className="flex items-center gap-2.5 rounded-full bg-background/90 px-4 py-2 backdrop-blur-md">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Rendering page…</span>
          </div>
        </div>
      )}

      {(error || renderError) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="rounded-2xl bg-background/95 p-6 backdrop-blur-md">
            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/70" />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{error || renderError}</p>
          </div>
        </div>
      )}

      <div
        className={cn(
          fitContainer && "mx-auto flex min-h-full min-w-full items-center justify-center",
        )}
      >
        <div className="relative inline-block shrink-0">
          <canvas
            ref={canvasRef}
            className={cn(
              fitContainer
                ? cn(
                    "rc-doc-page block rounded-sm bg-white",
                    isZoomed ? "h-auto w-auto max-w-none" : "h-auto max-h-full max-w-full",
                    !hasRendered && "opacity-0",
                  )
                : "block max-h-full max-w-full rounded-md object-contain",
              canvasClassName,
            )}
          />

          {hasRendered &&
            highlightRects.map((rect, index) => (
              <span
                key={`${page}-highlight-${index}`}
                className="pointer-events-none absolute rounded-[2px] bg-amber-400/50 ring-1 ring-amber-500/70"
                style={{
                  left: rect.x * renderScale * displayScale.x,
                  top: rect.y * renderScale * displayScale.y,
                  width: rect.width * renderScale * displayScale.x,
                  height: rect.height * renderScale * displayScale.y,
                }}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

type PdfPageViewerProps = {
  page: number;
  totalPages: number;
  documentTitle: string;
  onPageChange: (page: number) => void;
  toolsExpanded?: boolean;
  onToggleTools?: () => void;
};

export type PdfPageViewerParts = {
  chrome: ReactNode;
  body: ReactNode;
};

function usePdfPageViewerState({
  page,
  totalPages,
  documentTitle,
  onPageChange,
  toolsExpanded,
  onToggleTools,
}: PdfPageViewerProps) {
  const { document } = usePdfDocument();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(1);
  const [toolbarExpanded, setToolbarExpanded] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof searchPdfDocument>>>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);

  useEffect(() => {
    setZoom(1);
  }, [page]);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!document || !debouncedQuery) {
      setMatches([]);
      setActiveMatchIndex(-1);
      setSearchError("");
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    setSearchError("");

    searchPdfDocument(document, debouncedQuery)
      .then((results) => {
        if (!active) return;
        setMatches(results);
        if (results.length > 0) {
          setActiveMatchIndex(0);
          onPageChange(results[0].page);
        } else {
          setActiveMatchIndex(-1);
        }
      })
      .catch((err) => {
        if (!active) return;
        setSearchError(err instanceof Error ? err.message : "Search failed");
        setMatches([]);
        setActiveMatchIndex(-1);
      })
      .finally(() => {
        if (active) setSearching(false);
      });

    return () => {
      active = false;
    };
  }, [document, debouncedQuery, onPageChange]);

  const goToMatch = useCallback(
    (index: number) => {
      if (matches.length === 0) return;
      const normalized = ((index % matches.length) + matches.length) % matches.length;
      const match = matches[normalized];
      setActiveMatchIndex(normalized);
      onPageChange(match.page);
    },
    [matches, onPageChange],
  );

  const goToNextMatch = useCallback(() => {
    if (activeMatchIndex < 0) {
      goToMatch(0);
      return;
    }
    goToMatch(activeMatchIndex + 1);
  }, [activeMatchIndex, goToMatch]);

  const goToPreviousMatch = useCallback(() => {
    if (activeMatchIndex < 0) {
      goToMatch(matches.length - 1);
      return;
    }
    goToMatch(activeMatchIndex - 1);
  }, [activeMatchIndex, goToMatch, matches.length]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    setMatches([]);
    setActiveMatchIndex(-1);
    setSearchError("");
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    clearSearch();
  }, [clearSearch]);

  const toggleSearch = useCallback(() => {
    setSearchOpen((open) => {
      if (open) clearSearch();
      return !open;
    });
  }, [clearSearch]);

  const collapseToolbar = useCallback(() => {
    setToolbarExpanded(false);
    setSearchOpen(false);
    clearSearch();
  }, [clearSearch]);

  const expandToolbar = useCallback(() => {
    setToolbarExpanded(true);
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((current) => Math.min(ZOOM_MAX, Number((current + ZOOM_STEP).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((current) => Math.max(ZOOM_MIN, Number((current - ZOOM_STEP).toFixed(2))));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const zoomLabel = `${Math.round(zoom * 100)}%`;
  const activeMatch = activeMatchIndex >= 0 ? matches[activeMatchIndex] : null;
  const activeHighlights =
    activeMatch && activeMatch.page === page ? activeMatch.rects : [];

  const chrome = (
    <div className="rc-viewer-chrome w-full shrink-0 bg-white px-4 py-2 backdrop-blur-xl dark:bg-background md:px-5">
      <div className="flex w-full items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {documentTitle}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              <span>
                Page {page} of {totalPages}
              </span>
              {!toolbarExpanded && zoom !== 1 && (
                <span className="rounded-md bg-muted/80 px-1.5 py-0.5 font-medium tabular-nums text-foreground">
                  {zoomLabel}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {toolbarExpanded ? (
            <>
              <div className="flex items-center rounded-xl border border-border/30 bg-muted/30 p-0.5">
                <ViewerToolButton label="Zoom out" onClick={zoomOut} disabled={zoom <= ZOOM_MIN}>
                  <ZoomOut className="h-4 w-4" />
                </ViewerToolButton>
                <button
                  type="button"
                  onClick={resetZoom}
                  className="inline-flex h-8 min-w-[3.25rem] items-center justify-center rounded-lg border border-transparent px-2 text-[11px] font-semibold tabular-nums text-foreground transition-colors hover:border-border/30 hover:bg-muted/70"
                  aria-label="Reset zoom"
                  title="Reset zoom"
                >
                  {zoomLabel}
                </button>
                <ViewerToolButton label="Zoom in" onClick={zoomIn} disabled={zoom >= ZOOM_MAX}>
                  <ZoomIn className="h-4 w-4" />
                </ViewerToolButton>
              </div>

              <ViewerToolbarDivider />

              <div className="flex items-center rounded-xl border border-border/30 bg-muted/30 p-0.5">
                <ViewerToolButton label="Search in document" onClick={toggleSearch} active={searchOpen}>
                  <Search className="h-4 w-4" />
                </ViewerToolButton>
                <ViewerToolButton label="Collapse toolbar" onClick={collapseToolbar}>
                  <Minimize2 className="h-3.5 w-3.5" />
                </ViewerToolButton>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={expandToolbar}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/30 bg-muted/30 px-3.5 text-xs font-semibold text-foreground transition-all duration-200 hover:bg-muted/60"
              aria-label="Show viewer controls"
            >
              Controls
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}

          {onToggleTools && (
            <>
              <ViewerToolbarDivider />
              <ViewerToolButton
                label={toolsExpanded ? "Collapse tools" : "Expand tools"}
                onClick={onToggleTools}
                active={toolsExpanded}
              >
                {toolsExpanded ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRight className="h-4 w-4" />
                )}
              </ViewerToolButton>
            </>
          )}
        </div>
      </div>

      {toolbarExpanded && searchOpen && (
        <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[14rem] flex-1 items-center gap-2.5 rounded-xl border border-border/30 bg-background/90 px-3.5 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeSearch();
                  } else if (event.key === "Enter" && event.shiftKey) {
                    event.preventDefault();
                    goToPreviousMatch();
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    goToNextMatch();
                  }
                }}
                placeholder="Find in document…"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                aria-label="Search in document"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border/30 hover:bg-muted/70 hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-border/30 bg-muted/30 p-0.5">
              <span className="px-2.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                {searching
                  ? "Searching…"
                  : debouncedQuery
                    ? matches.length > 0
                      ? `${activeMatchIndex + 1} / ${matches.length}`
                      : "No matches"
                    : "Find text"}
              </span>
              <ViewerToolButton
                label="Previous match"
                onClick={goToPreviousMatch}
                disabled={matches.length === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </ViewerToolButton>
              <ViewerToolButton
                label="Next match"
                onClick={goToNextMatch}
                disabled={matches.length === 0}
              >
                <ChevronDown className="h-4 w-4" />
              </ViewerToolButton>
              <ViewerToolButton label="Close search" onClick={closeSearch}>
                <X className="h-4 w-4" />
              </ViewerToolButton>
            </div>
          </div>

          {searchError && <p className="mt-2 text-[11px] text-destructive">{searchError}</p>}
          {activeMatch && activeMatch.page === page && activeMatch.snippet && (
            <p className="mt-2 line-clamp-1 rounded-lg bg-muted/40 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Match: </span>
              …{activeMatch.snippet}…
            </p>
          )}
        </div>
      )}
    </div>
  );

  const body = (
    <PdfPageCanvas
      page={page}
      fitContainer
      zoom={zoom}
      targetWidth={720}
      highlightRects={activeHighlights}
      className="h-full min-h-0"
    />
  );

  return { chrome, body };
}

export function ResearchCompanionPdfShell({
  toolsPanel,
  ...viewerProps
}: PdfPageViewerProps & { toolsPanel: ReactNode }) {
  const { chrome, body } = usePdfPageViewerState(viewerProps);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {chrome}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{body}</div>
        {toolsPanel}
      </div>
    </div>
  );
}

export function PdfPageViewer(props: PdfPageViewerProps) {
  const { chrome, body } = usePdfPageViewerState(props);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {chrome}
      <div className="min-h-0 flex-1 overflow-hidden">{body}</div>
    </div>
  );
}
