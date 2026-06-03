import type { LinePoints } from "./photo-studio-line-geometry";
import type { ShapeSideGaps } from "./photo-studio-side-gaps";

export type PhotoStudioShapeType =
  | "rectangle"
  | "square"
  | "circle"
  | "ellipse"
  | "triangle"
  | "line"
  | "curvedLine"
  | "arc"
  | "arrow"
  | "star"
  | "hexagon"
  | "diamond"
  /** Arbitrary SVG path (`pathData`), viewBox 0–100 × 0–100 */
  | "path";

export const PATH_SHAPE_VIEWBOX_SIZE = 100;

export type CanvasShapeElement = {
  id: string;
  shapeType: PhotoStudioShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  groupId: string | null;
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
  cornerRadius: number;
  /** SVG `d` attribute; required when `shapeType` is `"path"`. */
  pathData?: string;
  /** Coordinate system for `pathData` (default 100). Official OpenAI/ChatGPT icon paths use 16. */
  pathViewBox?: number;
  /** SVG fill-rule for compound paths (ChatGPT icon needs `evenodd`). */
  pathFillRule?: "evenodd" | "nonzero";
  /**
   * Notches on rectangle/square edges so other shapes can weave through.
   * Each side: `size` (% of edge width), `position` (% along edge), `depth` (% into shape).
   */
  sideGaps?: ShapeSideGaps;
  /** Anchor points for line / curve / arc / arrow (normalized 0–1 in shape box). */
  linePoints?: LinePoints;
  label: string;
};

export type { LinePoints } from "./photo-studio-line-geometry";

export type { ShapeSideGaps, ShapeSide, SideGapConfig } from "./photo-studio-side-gaps";

export const DEFAULT_SHAPE_ROTATION = 0;
export const MAX_SHAPE_CORNER_RADIUS = 50;

export type CanvasSize = {
  width: number;
  height: number;
};

export function shapePercentToBox(shape: CanvasShapeElement, canvas: CanvasSize) {
  const width = (shape.width / 100) * canvas.width;
  const height = (shape.height / 100) * canvas.height;
  const centerX = (shape.x / 100) * canvas.width;
  const centerY = (shape.y / 100) * canvas.height;
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    centerX,
    centerY,
  };
}

export function boxToShapePercent(
  id: string,
  shape: CanvasShapeElement,
  box: { x: number; y: number; width: number; height: number },
  canvas: CanvasSize,
): CanvasShapeElement {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  return {
    ...shape,
    id,
    x: (centerX / canvas.width) * 100,
    y: (centerY / canvas.height) * 100,
    width: (box.width / canvas.width) * 100,
    height: (box.height / canvas.height) * 100,
  };
}

const SHAPE_VIEWBOX_INSET = 4;
const SHAPE_VIEWBOX_SIZE = 100 - SHAPE_VIEWBOX_INSET * 2;

export function getShapeStrokeWidthPx(strokeWidth: number, pixelWidth: number, pixelHeight: number): number {
  const minDimension = Math.min(pixelWidth, pixelHeight);
  return Math.max(0.75, strokeWidth * (minDimension / 100));
}

/**
 * Line-like strokes use canvas-relative width so a thin bbox does not collapse thickness.
 * Tuned to match ~10px when strokeWidth=5 on an ~800px canvas (same feel as medium shapes).
 */
const LINE_STROKE_CANVAS_RATIO = 0.2;

export function getLineLikeStrokeWidthPx(strokeWidth: number, canvas: CanvasSize): number {
  const ref = Math.min(canvas.width, canvas.height);
  return Math.max(1.5, strokeWidth * (ref / 100) * LINE_STROKE_CANVAS_RATIO);
}

export function getShapeCornerRadiusPx(
  cornerRadius: number,
  maxCornerRadius: number,
  pixelWidth: number,
  pixelHeight: number,
): number {
  const minDimension = Math.min(pixelWidth, pixelHeight);
  const clamped = Math.min(maxCornerRadius, Math.max(0, cornerRadius));
  return clamped * (minDimension / 100);
}

export function shapeUsesPathData(shape: Pick<CanvasShapeElement, "shapeType" | "pathData">): boolean {
  return shape.shapeType === "path" || Boolean(shape.pathData?.trim());
}

export function shapeSupportsCornerRadius(shapeType: PhotoStudioShapeType): boolean {
  return shapeType !== "line" &&
    shapeType !== "curvedLine" &&
    shapeType !== "arc" &&
    shapeType !== "arrow";
}

export function getMaxShapeCornerRadius(shapeType: PhotoStudioShapeType): number {
  if (!shapeSupportsCornerRadius(shapeType)) return 0;
  if (shapeType === "rectangle" || shapeType === "square") {
    return Math.floor(SHAPE_VIEWBOX_SIZE / 2);
  }
  return MAX_SHAPE_CORNER_RADIUS;
}

export function normalizeShapeRotation(rotation: number): number {
  const normalized = ((rotation % 360) + 360) % 360;
  return Math.round(normalized * 10) / 10;
}
