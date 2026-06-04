import type { CanvasShapeElement, CanvasSize } from "./photo-studio-canvas-types";

export function shapeBoxPixels(shape: CanvasShapeElement, canvas: CanvasSize) {
  const width = (shape.width / 100) * canvas.width;
  const height = (shape.height / 100) * canvas.height;
  const centerX = (shape.x / 100) * canvas.width;
  const centerY = (shape.y / 100) * canvas.height;
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

/** Stroke-only connectors (no fill). */
export type LineLikeShapeType = "line" | "curvedLine" | "arc" | "arrow";

export const LINE_LIKE_SHAPE_TYPES: LineLikeShapeType[] = [
  "line",
  "curvedLine",
  "arc",
  "arrow",
];

/** Normalized 0–1 coordinates inside the shape bounding box. */
export type LinePoints = {
  start: { x: number; y: number };
  end: { x: number; y: number };
  /**
   * Bend handle on the visible stroke (~midpoint of the arc), not the internal Bézier control.
   * `curvedLine` and `arc` only. Always kept inside 0–1.
   */
  curve?: { x: number; y: number };
};

const QUAD_MID_T = 0.5;

export function quadraticPointAt(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
    y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
  };
}

/** SVG quadratic control point from endpoints + a point on the curve at t=0.5. */
export function quadraticControlFromMidpoint(
  start: { x: number; y: number },
  end: { x: number; y: number },
  midpoint: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: 2 * midpoint.x - 0.5 * (start.x + end.x),
    y: 2 * midpoint.y - 0.5 * (start.y + end.y),
  };
}

function quadraticMidpointFromControl(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
): { x: number; y: number } {
  return quadraticPointAt(start, control, end, QUAD_MID_T);
}

/** Legacy saves stored the external control; migrate to on-stroke midpoint. */
export function ensureCurvePointOnStroke(points: LinePoints): LinePoints {
  if (!points.curve) return points;
  const { start, end, curve } = points;
  const asControlMid = quadraticMidpointFromControl(start, curve, end);
  const controlFromStored = quadraticControlFromMidpoint(start, end, curve);
  const verifyMid = quadraticPointAt(start, controlFromStored, end, QUAD_MID_T);
  const storedIsMidpoint =
    Math.hypot(verifyMid.x - curve.x, verifyMid.y - curve.y) < 0.04;
  if (storedIsMidpoint) {
    return {
      ...points,
      curve: {
        x: Math.min(1, Math.max(0, curve.x)),
        y: Math.min(1, Math.max(0, curve.y)),
      },
    };
  }
  return {
    ...points,
    curve: {
      x: Math.min(1, Math.max(0, asControlMid.x)),
      y: Math.min(1, Math.max(0, asControlMid.y)),
    },
  };
}

export const LINE_HANDLE_PADDING_PX = 14;
export const LINE_HANDLE_RADIUS = 6;
const MIN_LINE_BOX_PX = 20;

export function isLineLikeShapeType(
  shapeType: CanvasShapeElement["shapeType"],
): shapeType is LineLikeShapeType {
  return LINE_LIKE_SHAPE_TYPES.includes(shapeType as LineLikeShapeType);
}

export function lineShapeHasCurveHandle(shapeType: LineLikeShapeType): boolean {
  return shapeType === "curvedLine" || shapeType === "arc";
}

export function getDefaultLinePoints(shapeType: LineLikeShapeType): LinePoints {
  switch (shapeType) {
    case "curvedLine":
      return { start: { x: 0, y: 1 }, end: { x: 1, y: 0 }, curve: { x: 0.5, y: 0.5 } };
    case "arc":
      return { start: { x: 0, y: 1 }, end: { x: 1, y: 0 }, curve: { x: 0.5, y: 0.35 } };
    default:
      return { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } };
  }
}

export function resolveLinePoints(shape: CanvasShapeElement): LinePoints {
  let points: LinePoints;
  if (shape.linePoints) {
    points = shape.linePoints;
  } else if (isLineLikeShapeType(shape.shapeType)) {
    points = getDefaultLinePoints(shape.shapeType);
  } else {
    points = getDefaultLinePoints("line");
  }
  if (points.curve && isLineLikeShapeType(shape.shapeType) && lineShapeHasCurveHandle(shape.shapeType)) {
    return ensureCurvePointOnStroke(points);
  }
  return points;
}

export function linePointsToLocalPixels(
  points: LinePoints,
  width: number,
  height: number,
): { start: { x: number; y: number }; end: { x: number; y: number }; curve?: { x: number; y: number } } {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  return {
    start: { x: points.start.x * w, y: points.start.y * h },
    end: { x: points.end.x * w, y: points.end.y * h },
    curve: points.curve ? { x: points.curve.x * w, y: points.curve.y * h } : undefined,
  };
}

export function buildPathDataFromLinePoints(
  shapeType: LineLikeShapeType,
  points: LinePoints,
  width: number,
  height: number,
): string {
  const p = linePointsToLocalPixels(points, width, height);
  switch (shapeType) {
    case "line":
    case "arrow":
      return `M ${p.start.x} ${p.start.y} L ${p.end.x} ${p.end.y}`;
    case "curvedLine":
    case "arc": {
      const mid = p.curve ?? {
        x: (p.start.x + p.end.x) / 2,
        y: (p.start.y + p.end.y) / 2,
      };
      const c = quadraticControlFromMidpoint(p.start, p.end, mid);
      return `M ${p.start.x} ${p.start.y} Q ${c.x} ${c.y} ${p.end.x} ${p.end.y}`;
    }
    default:
      return `M ${p.start.x} ${p.start.y} L ${p.end.x} ${p.end.y}`;
  }
}

/** Konva flat points for selection outline / hit area. */
export function linePointsToKonvaFlatPoints(
  shapeType: LineLikeShapeType,
  points: LinePoints,
  width: number,
  height: number,
): number[] {
  const p = linePointsToLocalPixels(points, width, height);
  if (shapeType === "curvedLine" || shapeType === "arc") {
    const mid = p.curve ?? { x: (p.start.x + p.end.x) / 2, y: (p.start.y + p.end.y) / 2 };
    return [p.start.x, p.start.y, mid.x, mid.y, p.end.x, p.end.y];
  }
  return [p.start.x, p.start.y, p.end.x, p.end.y];
}

export function normalizeLinePoints(raw: unknown): LinePoints | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const item = raw as Record<string, unknown>;
  const readPoint = (key: string, clamp = true) => {
    const p = item[key];
    if (!p || typeof p !== "object") return null;
    const pt = p as Record<string, unknown>;
    const x = Number(pt.x);
    const y = Number(pt.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (!clamp) return { x, y };
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  };
  const start = readPoint("start");
  const end = readPoint("end");
  if (!start || !end) return undefined;
  const curve = readPoint("curve") ?? undefined;
  return { start, end, curve };
}

function canvasPointFromNormalized(
  shape: CanvasShapeElement,
  canvas: CanvasSize,
  point: { x: number; y: number },
): { x: number; y: number } {
  const box = shapeBoxPixels(shape, canvas);
  return {
    x: box.x + point.x * box.width,
    y: box.y + point.y * box.height,
  };
}

/** Map pointer position to 0–1 coords inside the shape box (group-local pixels). */
export function localPixelsToNormalized(
  x: number,
  y: number,
  width: number,
  height: number,
  clamp = true,
): { x: number; y: number } {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const nx = x / w;
  const ny = y / h;
  if (!clamp) {
    return { x: nx, y: ny };
  }
  return {
    x: Math.min(1, Math.max(0, nx)),
    y: Math.min(1, Math.max(0, ny)),
  };
}

export type LineCanvasAnchors = {
  start: { x: number; y: number };
  end: { x: number; y: number };
  curve?: { x: number; y: number };
};

export function linePointsToCanvasAnchors(
  shape: CanvasShapeElement,
  canvas: CanvasSize,
  points: LinePoints = resolveLinePoints(shape),
): LineCanvasAnchors {
  const box = shapeBoxPixels(shape, canvas);
  const toCanvas = (pt: { x: number; y: number }) => ({
    x: box.x + pt.x * box.width,
    y: box.y + pt.y * box.height,
  });
  return {
    start: toCanvas(points.start),
    end: toCanvas(points.end),
    curve: points.curve ? toCanvas(points.curve) : undefined,
  };
}

/** Tight axis-aligned box around canvas anchors + padding; re-normalizes points. */
export function fitShapeFromCanvasLinePoints(
  shape: CanvasShapeElement,
  canvas: CanvasSize,
  anchors: LineCanvasAnchors,
): Pick<CanvasShapeElement, "x" | "y" | "width" | "height" | "linePoints"> {
  const { start, end, curve } = anchors;

  const xs = [start.x, end.x, curve?.x].filter((v): v is number => v != null);
  const ys = [start.y, end.y, curve?.y].filter((v): v is number => v != null);

  const pad = LINE_HANDLE_PADDING_PX;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;

  const width = Math.max(MIN_LINE_BOX_PX, maxX - minX);
  const height = Math.max(MIN_LINE_BOX_PX, maxY - minY);

  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  const toNorm = (p: { x: number; y: number }) => ({
    x: (p.x - minX) / width,
    y: (p.y - minY) / height,
  });

  const linePoints: LinePoints = {
    start: toNorm(start),
    end: toNorm(end),
    curve: curve ? toNorm(curve) : undefined,
  };

  if (isLineLikeShapeType(shape.shapeType) && !lineShapeHasCurveHandle(shape.shapeType)) {
    delete linePoints.curve;
  }

  return {
    x: (centerX / canvas.width) * 100,
    y: (centerY / canvas.height) * 100,
    width: (width / canvas.width) * 100,
    height: (height / canvas.height) * 100,
    linePoints,
  };
}

/** Drag a start/end anchor in canvas space — box grows/shrinks with the stroke. */
export function updateLineAnchorFromCanvas(
  shape: CanvasShapeElement,
  canvas: CanvasSize,
  role: "start" | "end",
  canvasX: number,
  canvasY: number,
): Pick<CanvasShapeElement, "x" | "y" | "width" | "height" | "linePoints"> {
  const anchors = linePointsToCanvasAnchors(shape, canvas);
  if (role === "start") {
    anchors.start = { x: canvasX, y: canvasY };
  } else {
    anchors.end = { x: canvasX, y: canvasY };
  }
  return fitShapeFromCanvasLinePoints(shape, canvas, anchors);
}

/** Update bend handle on the stroke; stays inside the shape box (0–1). */
export function patchCurvePoint(
  points: LinePoints,
  localX: number,
  localY: number,
  width: number,
  height: number,
): LinePoints {
  const norm = localPixelsToNormalized(localX, localY, width, height, true);
  return ensureCurvePointOnStroke({
    ...points,
    curve: { x: norm.x, y: norm.y },
  });
}

/** Tight axis-aligned box around anchors + padding; re-normalizes points. */
export function fitShapeToLinePoints(
  shape: CanvasShapeElement,
  canvas: CanvasSize,
  points: LinePoints,
): Pick<CanvasShapeElement, "x" | "y" | "width" | "height" | "linePoints"> {
  return fitShapeFromCanvasLinePoints(shape, canvas, linePointsToCanvasAnchors(shape, canvas, points));
}

/** SVG path `d` in 0–100 viewBox (layer list preview). */
export function buildLineLikePreviewPathD(
  shapeType: LineLikeShapeType,
  points?: LinePoints,
  inset = 4,
): string {
  if (points) {
    const min = inset;
    const max = 100 - inset;
    const sx = min + points.start.x * (max - min);
    const sy = min + points.start.y * (max - min);
    const ex = min + points.end.x * (max - min);
    const ey = min + points.end.y * (max - min);
    if (lineShapeHasCurveHandle(shapeType) && points.curve) {
      const midX = min + points.curve.x * (max - min);
      const midY = min + points.curve.y * (max - min);
      const control = quadraticControlFromMidpoint(
        { x: sx, y: sy },
        { x: ex, y: ey },
        { x: midX, y: midY },
      );
      return `M${sx} ${sy} Q${control.x} ${control.y} ${ex} ${ey}`;
    }
    return `M${sx} ${sy} L${ex} ${ey}`;
  }
  const def = getDefaultLinePoints(shapeType);
  return buildLineLikePreviewPathD(shapeType, def, inset);
}
