import type { PhotoStudioShapeType } from "./photo-studio-canvas-types";

export type ShapeSide = "top" | "right" | "bottom" | "left";

/** Gap along one edge — all values are percentages (0–100). */
export type SideGapConfig = {
  /** Width of the opening along that edge (0–80). */
  size: number;
  /** Center of the gap along the edge (0–100, 50 = middle). */
  position: number;
  /** How deep the cut goes into the shape (0–50). */
  depth: number;
};

export type ShapeSideGaps = Partial<Record<ShapeSide, SideGapConfig | null | undefined>>;

export const SHAPE_SIDES: ShapeSide[] = ["top", "right", "bottom", "left"];

export const DEFAULT_SIDE_GAP: SideGapConfig = {
  size: 30,
  position: 50,
  depth: 35,
};

const MAX_GAP_SIZE = 80;
const MAX_GAP_DEPTH = 50;

export function shapeSupportsSideGaps(shapeType: PhotoStudioShapeType): boolean {
  return shapeType === "rectangle" || shapeType === "square";
}

export function normalizeSideGapConfig(raw: unknown): SideGapConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const size = clampGapValue(item.size, 0, MAX_GAP_SIZE);
  const position = clampGapValue(item.position, 0, 100);
  const depth = clampGapValue(item.depth, 0, MAX_GAP_DEPTH);
  if (size <= 0 || depth <= 0) return null;
  return { size, position, depth };
}

export function normalizeShapeSideGaps(raw: unknown): ShapeSideGaps | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const item = raw as Record<string, unknown>;
  const result: ShapeSideGaps = {};
  let hasAny = false;
  for (const side of SHAPE_SIDES) {
    const gap = normalizeSideGapConfig(item[side]);
    if (gap) {
      result[side] = gap;
      hasAny = true;
    }
  }
  return hasAny ? result : undefined;
}

export function shapeHasSideGaps(sideGaps: ShapeSideGaps | undefined): boolean {
  if (!sideGaps) return false;
  return SHAPE_SIDES.some((side) => {
    const gap = sideGaps[side];
    return gap && gap.size > 0 && gap.depth > 0;
  });
}

function clampGapValue(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function gapSpan(gap: SideGapConfig, edgeLength: number): { start: number; end: number } {
  const width = (gap.size / 100) * edgeLength;
  const center = (gap.position / 100) * edgeLength;
  const start = Math.max(0, center - width / 2);
  const end = Math.min(edgeLength, center + width / 2);
  return { start, end };
}

/**
 * Closed polygon (flat [x,y,…]) for a rectangle with optional notches on each side.
 * Coordinates: (0,0) top-left, (width, height) bottom-right.
 */
export function buildRectangleWithSideGapsPoints(
  width: number,
  height: number,
  sideGaps: ShapeSideGaps | undefined,
): number[] {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const top = sideGaps?.top;
  const right = sideGaps?.right;
  const bottom = sideGaps?.bottom;
  const left = sideGaps?.left;

  const points: number[] = [];

  const push = (x: number, y: number) => {
    points.push(x, y);
  };

  // Start top-left; walk clockwise.
  push(0, 0);

  // Top edge → top-right (notch cuts downward)
  if (top && top.size > 0 && top.depth > 0) {
    const { start, end } = gapSpan(top, w);
    const cut = (top.depth / 100) * h;
    push(start, 0);
    push(start, cut);
    push(end, cut);
    push(end, 0);
  }
  push(w, 0);

  // Right edge → bottom-right
  if (right && right.size > 0 && right.depth > 0) {
    const { start, end } = gapSpan(right, h);
    const cut = (right.depth / 100) * w;
    push(w, start);
    push(w - cut, start);
    push(w - cut, end);
    push(w, end);
  }
  push(w, h);

  // Bottom edge → bottom-left
  if (bottom && bottom.size > 0 && bottom.depth > 0) {
    const { start, end } = gapSpan(bottom, w);
    const cut = (bottom.depth / 100) * h;
    push(end, h);
    push(end, h - cut);
    push(start, h - cut);
    push(start, h);
  }
  push(0, h);

  // Left edge → close at top-left
  if (left && left.size > 0 && left.depth > 0) {
    const { start, end } = gapSpan(left, h);
    const cut = (left.depth / 100) * w;
    push(0, end);
    push(cut, end);
    push(cut, start);
    push(0, start);
  }

  return points;
}

/** SVG path `d` in 0–100 viewBox (inset 4px like other shapes). */
export function buildRectangleWithSideGapsPathD(
  sideGaps: ShapeSideGaps | undefined,
  viewSize = 92,
  inset = 4,
): string | null {
  if (!shapeHasSideGaps(sideGaps)) return null;
  const pts = buildRectangleWithSideGapsPoints(viewSize, viewSize, sideGaps);
  if (pts.length < 6) return null;
  const parts: string[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    const x = inset + pts[i];
    const y = inset + pts[i + 1];
    parts.push(i === 0 ? `M${x} ${y}` : `L${x} ${y}`);
  }
  return `${parts.join(" ")} Z`;
}
