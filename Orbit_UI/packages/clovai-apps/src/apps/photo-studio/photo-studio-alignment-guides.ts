import { shapePercentToBox, type CanvasShapeElement, type CanvasSize } from "./photo-studio-canvas-types";

export type PixelBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AlignmentGuide = {
  orientation: "vertical" | "horizontal";
  position: number;
};

type SnapLine = AlignmentGuide & {
  source: "canvas" | "shape";
};

export const ALIGNMENT_SNAP_THRESHOLD_PX = 6;
export const ALIGNMENT_SNAP_THRESHOLD_PERCENT = 3;

function getCanvasSnapLines(canvas: CanvasSize): SnapLine[] {
  return [
    { orientation: "vertical", position: canvas.width / 2, source: "canvas" },
    { orientation: "vertical", position: 0, source: "canvas" },
    { orientation: "vertical", position: canvas.width, source: "canvas" },
    { orientation: "horizontal", position: canvas.height / 2, source: "canvas" },
    { orientation: "horizontal", position: 0, source: "canvas" },
    { orientation: "horizontal", position: canvas.height, source: "canvas" },
  ];
}

function getOtherShapeSnapLines(
  shapes: CanvasShapeElement[],
  canvas: CanvasSize,
  excludeId: string,
): SnapLine[] {
  const lines: SnapLine[] = [];

  for (const shape of shapes) {
    if (shape.id === excludeId) continue;
    const box = shapePercentToBox(shape, canvas);
    lines.push(
      { orientation: "vertical", position: box.x, source: "shape" },
      { orientation: "vertical", position: box.centerX, source: "shape" },
      { orientation: "vertical", position: box.x + box.width, source: "shape" },
      { orientation: "horizontal", position: box.y, source: "shape" },
      { orientation: "horizontal", position: box.centerY, source: "shape" },
      { orientation: "horizontal", position: box.y + box.height, source: "shape" },
    );
  }

  return lines;
}

export function collectSnapLines(
  shapes: CanvasShapeElement[],
  canvas: CanvasSize,
  excludeId: string,
): SnapLine[] {
  return [...getCanvasSnapLines(canvas), ...getOtherShapeSnapLines(shapes, canvas, excludeId)];
}

export function snapBoxToGuides(
  box: PixelBox,
  snapLines: SnapLine[],
  threshold = ALIGNMENT_SNAP_THRESHOLD_PX,
): { box: PixelBox; guides: AlignmentGuide[] } {
  let { x, y, width, height } = box;
  const guides: AlignmentGuide[] = [];

  const verticalLines = snapLines.filter((line) => line.orientation === "vertical");
  const horizontalLines = snapLines.filter((line) => line.orientation === "horizontal");

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const right = x + width;
  const bottom = y + height;

  const verticalCandidates = [
    { value: x, apply: (position: number) => position },
    { value: centerX, apply: (position: number) => position - width / 2 },
    { value: right, apply: (position: number) => position - width },
  ];

  let bestVertical: { distance: number; guide: AlignmentGuide; nextX: number } | null = null;
  for (const line of verticalLines) {
    for (const candidate of verticalCandidates) {
      const distance = line.position - candidate.value;
      if (Math.abs(distance) > threshold) continue;
      if (!bestVertical || Math.abs(distance) < bestVertical.distance) {
        bestVertical = {
          distance,
          guide: { orientation: "vertical", position: line.position },
          nextX: candidate.apply(line.position),
        };
      }
    }
  }

  if (bestVertical) {
    x = bestVertical.nextX;
    guides.push(bestVertical.guide);
  }

  const horizontalCandidates = [
    { value: y, apply: (position: number) => position },
    { value: centerY, apply: (position: number) => position - height / 2 },
    { value: bottom, apply: (position: number) => position - height },
  ];

  let bestHorizontal: { distance: number; guide: AlignmentGuide; nextY: number } | null = null;
  for (const line of horizontalLines) {
    for (const candidate of horizontalCandidates) {
      const distance = line.position - candidate.value;
      if (Math.abs(distance) > threshold) continue;
      if (!bestHorizontal || Math.abs(distance) < bestHorizontal.distance) {
        bestHorizontal = {
          distance,
          guide: { orientation: "horizontal", position: line.position },
          nextY: candidate.apply(line.position),
        };
      }
    }
  }

  if (bestHorizontal) {
    y = bestHorizontal.nextY;
    guides.push(bestHorizontal.guide);
  }

  return { box: { x, y, width, height }, guides };
}

export function snapCenterPercent(
  value: number,
  threshold = ALIGNMENT_SNAP_THRESHOLD_PERCENT,
): number {
  return Math.abs(value - 50) <= threshold ? 50 : value;
}

export function snapShapeCenterPercents(
  x: number,
  y: number,
  threshold = ALIGNMENT_SNAP_THRESHOLD_PERCENT,
): { x: number; y: number; snapped: boolean } {
  const nextX = snapCenterPercent(x, threshold);
  const nextY = snapCenterPercent(y, threshold);
  return {
    x: nextX,
    y: nextY,
    snapped: nextX !== x || nextY !== y,
  };
}
