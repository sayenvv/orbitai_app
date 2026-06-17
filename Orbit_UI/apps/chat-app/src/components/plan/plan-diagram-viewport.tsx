"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { PlanMermaidDiagram } from "@/components/plan/plan-mermaid-diagram";
import { cn } from "@/lib/utils";

const USER_ZOOM_MIN = 0.2;
const USER_ZOOM_MAX = 8;
const USER_ZOOM_STEP = 1.2;
const FIT_SCALE_MIN = 0.05;
const FIT_SCALE_MAX = 24;
const PAN_THRESHOLD = 5;

type PlanDiagramViewportProps = {
  source: string;
  onEdit?: () => void;
  onOpenEditor?: () => void;
  className?: string;
  fill?: boolean;
  canvasLabel?: string;
};

function getSvgNaturalSize(svg: SVGSVGElement) {
  const viewBox = svg.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }

  const widthAttr = svg.width?.baseVal?.value;
  const heightAttr = svg.height?.baseVal?.value;
  if (widthAttr > 0 && heightAttr > 0) {
    return { width: widthAttr, height: heightAttr };
  }

  return { width: 1, height: 1 };
}

export function PlanDiagramViewport({
  source,
  onEdit,
  onOpenEditor,
  className,
  fill = false,
  canvasLabel = "Diagram",
}: PlanDiagramViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const userAdjustedRef = useRef(false);
  const fitScaleRef = useRef(1);
  const userZoomRef = useRef(1);
  const [fitScale, setFitScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [diagramReady, setDiagramReady] = useState(false);
  const panSession = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const fitToView = useCallback((resetUserAdjustments = true) => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const svg = content.querySelector("svg");
    if (!svg) return;

    const vp = viewport.getBoundingClientRect();
    const padding = 24;
    if (vp.width <= padding || vp.height <= padding) return;

    const { width, height } = getSvgNaturalSize(svg as SVGSVGElement);
    const nextFit = Math.min((vp.width - padding) / width, (vp.height - padding) / height);
    const clampedFit = Math.max(FIT_SCALE_MIN, Math.min(nextFit, FIT_SCALE_MAX));

    if (Math.abs(fitScaleRef.current - clampedFit) > 0.001) {
      fitScaleRef.current = clampedFit;
      setFitScale(clampedFit);
    }

    if (resetUserAdjustments) {
      userAdjustedRef.current = false;
      userZoomRef.current = 1;
      setUserZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, []);

  const handleDiagramRendered = useCallback(() => {
    setDiagramReady(true);
    window.requestAnimationFrame(() => {
      fitToView(true);
    });
  }, [fitToView]);

  useEffect(() => {
    userAdjustedRef.current = false;
    fitScaleRef.current = 1;
    userZoomRef.current = 1;
    setDiagramReady(false);
    setFitScale(1);
    setUserZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [source]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onResize = () => {
      if (!diagramReady) return;
      fitToView(!userAdjustedRef.current);
    };

    const resize = new ResizeObserver(onResize);
    resize.observe(viewport);
    if (diagramReady) {
      window.requestAnimationFrame(() => fitToView(!userAdjustedRef.current));
    }
    return () => resize.disconnect();
  }, [diagramReady, fitToView, source]);

  const zoomBy = useCallback((factor: number) => {
    userAdjustedRef.current = true;
    setUserZoom((current) => {
      const next = Math.min(USER_ZOOM_MAX, Math.max(USER_ZOOM_MIN, current * factor));
      userZoomRef.current = next;
      return next;
    });
  }, []);

  const zoomIn = () => zoomBy(USER_ZOOM_STEP);
  const zoomOut = () => zoomBy(1 / USER_ZOOM_STEP);

  const displayScale = fitScale * userZoom;
  const zoomLabel = `${Math.round(userZoom * 100)}%`;

  const stopBubble = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !diagramReady) return;
    panSession.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      moved: false,
    };
    viewportRef.current?.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSession.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    if (!session.moved) {
      if (Math.hypot(dx, dy) < PAN_THRESHOLD) return;
      session.moved = true;
      setIsPanning(true);
    }

    userAdjustedRef.current = true;
    setOffset({ x: session.originX + dx, y: session.originY + dy });
  };

  const endPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSession.current;
    if (!session || session.pointerId !== event.pointerId) return;
    panSession.current = null;
    setIsPanning(false);
    if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
      viewportRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!diagramReady) return;
    event.preventDefault();
    event.stopPropagation();
    zoomBy(event.deltaY < 0 ? USER_ZOOM_STEP : 1 / USER_ZOOM_STEP);
  };

  const onStageDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (panSession.current?.moved) return;
    event.stopPropagation();
    onEdit?.();
  };

  return (
    <div
      className={cn(
        "plan-diagram-viewport flex w-full max-w-full flex-col overflow-hidden rounded-sm border border-border/60",
        fill && "min-h-0 flex-1",
        className,
      )}
    >
      <div
        className="plan-diagram-viewport-toolbar flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-3 py-2"
        onPointerDown={stopBubble}
        onClick={stopBubble}
        onDoubleClick={stopBubble}
      >
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {canvasLabel}
        </span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {onOpenEditor ? (
            <button
              type="button"
              onClick={onOpenEditor}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
              aria-label="Open advanced diagram editor"
              title="Open in editor"
            >
              <Pencil className="size-3.5" />
              Open in editor
            </button>
          ) : null}
          <div
            className="plan-diagram-viewport-controls inline-flex items-center gap-0.5 rounded-lg border border-border/70 bg-background p-0.5 shadow-sm"
            role="toolbar"
            aria-label="Diagram zoom controls"
          >
          <button
            type="button"
            onClick={zoomOut}
            disabled={!diagramReady || userZoom <= USER_ZOOM_MIN}
            className="inline-flex size-8 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <ZoomOut className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => fitToView(true)}
            disabled={!diagramReady}
            className="inline-flex h-8 min-w-[3.25rem] items-center justify-center rounded-md px-2 text-[11px] font-semibold tabular-nums text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Fit diagram to view"
            title="Fit to view"
          >
            {zoomLabel}
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={!diagramReady || userZoom >= USER_ZOOM_MAX}
            className="inline-flex size-8 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <ZoomIn className="size-4" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-border/70" aria-hidden />
          <button
            type="button"
            onClick={() => fitToView(true)}
            disabled={!diagramReady}
            className="inline-flex size-8 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Reset diagram view"
            title="Reset view"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={cn(
          "plan-diagram-viewport-stage relative isolate w-full max-w-full touch-none select-none overflow-hidden",
          fill ? "min-h-0 flex-1" : "h-[clamp(220px,36vh,400px)]",
          diagramReady && (isPanning ? "cursor-grabbing" : "cursor-grab"),
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onWheel={onWheel}
        onDoubleClick={onStageDoubleClick}
        title={onEdit ? "Double-click to edit diagram source" : undefined}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="pointer-events-auto absolute left-1/2 top-1/2"
            style={{
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${displayScale})`,
              transformOrigin: "center center",
            }}
          >
            <div ref={contentRef} className="plan-diagram-viewport-content">
              <PlanMermaidDiagram
                source={source}
                className="p-0"
                onRendered={handleDiagramRendered}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border/50 bg-muted/10 px-3 py-1.5 text-[10px] text-muted-foreground/70">
        Drag to pan · scroll to zoom · double-click canvas to edit source
      </div>
    </div>
  );
}
