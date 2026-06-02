export type PhotoStudioShapeType =
  | "rectangle"
  | "square"
  | "circle"
  | "ellipse"
  | "triangle"
  | "line"
  | "arrow"
  | "star"
  | "hexagon"
  | "diamond";

export type CanvasShapeElement = {
  id: string;
  shapeType: PhotoStudioShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
  cornerRadius: number;
  label: string;
};

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

export function getMaxShapeCornerRadius(shapeType: PhotoStudioShapeType): number {
  if (shapeType !== "rectangle" && shapeType !== "square") return 0;
  return Math.floor(SHAPE_VIEWBOX_SIZE / 2);
}
