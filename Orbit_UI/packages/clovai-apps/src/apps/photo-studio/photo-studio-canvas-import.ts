import type { CanvasShapeElement, PhotoStudioShapeType } from "./photo-studio-canvas-types";
import { normalizeLinePoints } from "./photo-studio-line-geometry";
import { normalizeShapeSideGaps } from "./photo-studio-side-gaps";

export type CanvasTextLayer = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontStyleId: string;
  fontSize: number;
  color: string;
};

export type ParsedCanvasLayers = {
  shapes: CanvasShapeElement[];
  texts: CanvasTextLayer[];
  aspectRatio?: string;
  canvasBackgroundId?: string;
  customCanvasBackgroundColor?: string;
  customCanvasGradientEnd?: string;
  customCanvasGradientEnabled?: boolean;
  projectName?: string;
};

const SHAPE_TYPES = new Set<PhotoStudioShapeType>([
  "rectangle",
  "square",
  "circle",
  "ellipse",
  "triangle",
  "line",
  "curvedLine",
  "arc",
  "arrow",
  "star",
  "hexagon",
  "diamond",
  "path",
]);

const FONT_STYLE_IDS = new Set([
  "modern-sans",
  "classic-serif",
  "display-serif",
  "bold-headline",
  "light-minimal",
  "monospace",
  "script",
  "handwritten",
  "condensed",
  "rounded",
]);

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeShape(raw: unknown): CanvasShapeElement | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const pathData = asString(item.pathData ?? item.path_data ?? item.d ?? item.svgPath);
  const shapeTypeRaw = asString(item.shapeType ?? item.shape_type);

  let shapeType: PhotoStudioShapeType;
  if (pathData) {
    shapeType = "path";
  } else {
    const normalized =
      shapeTypeRaw === "curved_line" ? "curvedLine" : shapeTypeRaw;
    if (!SHAPE_TYPES.has(normalized as PhotoStudioShapeType)) {
      return null;
    }
    shapeType = normalized as PhotoStudioShapeType;
  }

  const id = asString(item.id) || `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    shapeType,
    pathData: pathData || undefined,
    pathViewBox: pathData
      ? (() => {
          const v = asNumber(item.pathViewBox ?? item.path_view_box, 0);
          return v > 0 ? v : undefined;
        })()
      : undefined,
    pathFillRule:
      pathData && (item.pathFillRule === "evenodd" || item.path_fill_rule === "evenodd")
        ? "evenodd"
        : undefined,
    x: asNumber(item.x, 50),
    y: asNumber(item.y, 50),
    width: asNumber(item.width, 20),
    height: asNumber(item.height, 20),
    rotation: asNumber(item.rotation, 0),
    groupId: asString(item.groupId ?? item.group_id) || null,
    strokeWidth: asNumber(item.strokeWidth ?? item.stroke_width, 3),
    strokeColor: asString(item.strokeColor ?? item.stroke_color, "#7c3aed"),
    fillColor: asString(item.fillColor ?? item.fill_color, "#8b5cf6"),
    fillOpacity: asNumber(item.fillOpacity ?? item.fill_opacity, 0.8),
    cornerRadius: asNumber(item.cornerRadius ?? item.corner_radius, 0),
    sideGaps: normalizeShapeSideGaps(item.sideGaps ?? item.side_gaps),
    linePoints: normalizeLinePoints(item.linePoints ?? item.line_points),
    label: asString(item.label),
  };
}

function normalizeText(raw: unknown): CanvasTextLayer | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const fontRaw = asString(item.fontStyleId ?? item.font_style_id, "modern-sans");
  const fontStyleId = FONT_STYLE_IDS.has(fontRaw) ? fontRaw : "modern-sans";
  const id = asString(item.id) || `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    x: asNumber(item.x, 50),
    y: asNumber(item.y, 50),
    width: asNumber(item.width, 32),
    height: asNumber(item.height, 10),
    content: asString(item.content, "Text"),
    fontStyleId,
    fontSize: asNumber(item.fontSize ?? item.font_size, 16),
    color: asString(item.color, "#1e1b4b"),
  };
}

function pickLayers(root: Record<string, unknown>): {
  shapes: unknown[];
  texts: unknown[];
  aspectRatio?: string;
  canvasBackgroundId?: string;
  customCanvasBackgroundColor?: string;
  customCanvasGradientEnd?: string;
  customCanvasGradientEnabled?: boolean;
  projectName?: string;
} {
  const shapes = (root.canvasShapes ??
    root.canvas_shapes ??
    root.shapes ??
    []) as unknown[];
  const texts = (root.canvasTexts ?? root.canvas_texts ?? root.texts ?? []) as unknown[];
  const customColor = asString(
    root.customCanvasBackgroundColor ?? root.custom_canvas_background_color,
  );
  const gradientEnd = asString(root.customCanvasGradientEnd ?? root.custom_canvas_gradient_end);
  return {
    shapes: Array.isArray(shapes) ? shapes : [],
    texts: Array.isArray(texts) ? texts : [],
    aspectRatio: asString(root.aspectRatio ?? root.aspect_ratio) || undefined,
    canvasBackgroundId:
      asString(root.canvasBackgroundId ?? root.canvas_background_id) || undefined,
    customCanvasBackgroundColor: customColor || undefined,
    customCanvasGradientEnd: gradientEnd || undefined,
    customCanvasGradientEnabled: asBoolean(
      root.customCanvasGradientEnabled ?? root.custom_canvas_gradient_enabled,
      false,
    ),
    projectName: asString(root.projectName ?? root.project_name) || undefined,
  };
}

/** Parse exported canvas JSON (file upload or API) into layers for the Konva stage. */
export function parseCanvasLayersJson(input: unknown): ParsedCanvasLayers | null {
  let root: Record<string, unknown>;
  if (typeof input === "string") {
    try {
      root = JSON.parse(input) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (input && typeof input === "object") {
    root = input as Record<string, unknown>;
  } else {
    return null;
  }

  const picked = pickLayers(root);
  const shapes = picked.shapes.map(normalizeShape).filter((s): s is CanvasShapeElement => s !== null);
  const texts = picked.texts.map(normalizeText).filter((t): t is CanvasTextLayer => t !== null);

  const hasBackground = Boolean(picked.canvasBackgroundId);
  if (shapes.length === 0 && texts.length === 0 && !hasBackground) {
    return null;
  }

  return {
    shapes,
    texts,
    aspectRatio: picked.aspectRatio,
    canvasBackgroundId: picked.canvasBackgroundId,
    customCanvasBackgroundColor: picked.customCanvasBackgroundColor,
    customCanvasGradientEnd: picked.customCanvasGradientEnd,
    customCanvasGradientEnabled: picked.customCanvasGradientEnabled,
    projectName: picked.projectName,
  };
}
