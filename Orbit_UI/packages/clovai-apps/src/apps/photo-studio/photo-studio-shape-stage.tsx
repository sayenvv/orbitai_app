"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Arrow,
  Circle,
  Ellipse,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Path,
  Rect,
  RegularPolygon,
  Stage,
  Star,
  Text,
  Transformer,
} from "react-konva";
import { Html } from "react-konva-utils";
import type Konva from "konva";

import {
  ALIGNMENT_SNAP_THRESHOLD_PX,
  collectSnapLines,
  snapBoxToGuides,
  type AlignmentGuide,
  type PixelBox,
} from "./photo-studio-alignment-guides";
import {
  buildPathDataFromLinePoints,
  getDefaultLinePoints,
  isLineLikeShapeType,
  linePointsToLocalPixels,
  lineShapeHasCurveHandle,
  LINE_HANDLE_RADIUS,
  patchCurvePoint,
  resolveLinePoints,
  updateLineAnchorFromCanvas,
  type LineLikeShapeType,
  type LinePoints,
} from "./photo-studio-line-geometry";
import {
  buildRectangleWithSideGapsPoints,
  shapeHasSideGaps,
} from "./photo-studio-side-gaps";
import {
  boxToShapePercent,
  getMaxShapeCornerRadius,
  getShapeCornerRadiusPx,
  getLineLikeStrokeWidthPx,
  getShapeStrokeWidthPx,
  normalizeShapeRotation,
  PATH_SHAPE_VIEWBOX_SIZE,
  isImageShapeType,
  shapePercentToBox,
  shapeSupportsCornerRadius,
  shapeUsesPathData,
  type CanvasShapeElement,
  type CanvasSize,
  type PhotoStudioShapeType,
} from "./photo-studio-canvas-types";

const MIN_SHAPE_PX = 8;
const GUIDE_STROKE = "#71717a";
const CANVAS_SELECTION_STROKE = "#52525b";
const CANVAS_SELECTION_FILL = "rgba(39, 39, 42, 0.1)";
const CANVAS_SELECTION_FILL_LINE = "rgba(39, 39, 42, 0.06)";
const CANVAS_SELECTION_FILL_MULTI = "rgba(39, 39, 42, 0.08)";
const CANVAS_SELECTION_GROUP_TAG = "rgba(39, 39, 42, 0.92)";
const CANVAS_SELECTION_HANDLE_STROKE = "#52525b";
const GUIDE_LAYER_NAME = "alignment-guides";

export type ShapeTransformPatch = Pick<
  CanvasShapeElement,
  "x" | "y" | "width" | "height" | "rotation"
>;

export type CanvasSelectionBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type PhotoStudioShapeStageProps = {
  shapes: CanvasShapeElement[];
  canvasSize: CanvasSize;
  selectedIds: string[];
  selectable: boolean;
  movable: boolean;
  resizable: boolean;
  textEditable: boolean;
  editingTextId: string | null;
  onSelect: (id: string, additive: boolean) => void;
  onClearSelection: () => void;
  onMove: (id: string, x: number, y: number, delta: { dx: number; dy: number }) => void;
  onTransform: (id: string, patch: ShapeTransformPatch) => void;
  onLinePointsChange: (
    id: string,
    patch: Partial<Pick<CanvasShapeElement, "x" | "y" | "width" | "height" | "linePoints">>,
  ) => void;
  onStartEditText: (id: string) => void;
  onCommitLabel: (id: string, label: string) => void;
  onCancelEditText: () => void;
  onSelectionBoundsChange?: (bounds: CanvasSelectionBounds | null) => void;
  stageRef?: React.RefObject<Konva.Stage | null>;
};

const SELECTION_BOX_PAD = 4;

function shapeSupportsFill(shapeType: PhotoStudioShapeType): boolean {
  return !isLineLikeShapeType(shapeType) && !isImageShapeType(shapeType);
}

function KonvaRasterImageShape({
  imageUrl,
  width,
  height,
  listening,
}: {
  imageUrl: string;
  width: number;
  height: number;
  listening: boolean;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (!cancelled) setImage(null);
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  if (!image) return null;

  return (
    <KonvaImage
      image={image}
      x={0}
      y={0}
      width={width}
      height={height}
      listening={listening}
    />
  );
}

function clampBox(box: PixelBox, canvas: CanvasSize): PixelBox {
  const width = Math.max(MIN_SHAPE_PX, Math.min(box.width, canvas.width));
  const height = Math.max(MIN_SHAPE_PX, Math.min(box.height, canvas.height));
  const x = Math.max(0, Math.min(box.x, canvas.width - width));
  const y = Math.max(0, Math.min(box.y, canvas.height - height));
  return { x, y, width, height };
}

function getShapePixelSize(shape: CanvasShapeElement, canvas: CanvasSize) {
  return {
    width: (shape.width / 100) * canvas.width,
    height: (shape.height / 100) * canvas.height,
  };
}

function getCoDragShapeIds(
  shape: CanvasShapeElement,
  allShapes: CanvasShapeElement[],
  selectedIds: string[],
): string[] {
  if (shape.groupId) {
    return allShapes.filter((item) => item.groupId === shape.groupId).map((item) => item.id);
  }
  if (selectedIds.includes(shape.id) && selectedIds.length > 1) {
    return selectedIds;
  }
  return [shape.id];
}

function syncCoDragKonvaNodes(
  draggedShapeId: string,
  draggedNode: Konva.Group,
  shapes: CanvasShapeElement[],
  canvasSize: CanvasSize,
  selectedIds: string[],
  origins: Map<string, { x: number; y: number }>,
) {
  const draggedShape = shapes.find((item) => item.id === draggedShapeId);
  if (!draggedShape) return;

  const coDragIds = getCoDragShapeIds(draggedShape, shapes, selectedIds);
  if (coDragIds.length <= 1) return;

  const draggedOrigin = origins.get(draggedShapeId);
  if (!draggedOrigin) return;

  const { width, height } = getShapePixelSize(draggedShape, canvasSize);
  const box = readRotatedGroupBox(draggedNode, width, height, canvasSize);
  const next = boxToShapePercent(draggedShapeId, draggedShape, box, canvasSize);
  const dx = next.x - draggedOrigin.x;
  const dy = next.y - draggedOrigin.y;

  const stage = draggedNode.getStage();
  if (!stage) return;

  for (const shapeId of coDragIds) {
    if (shapeId === draggedShapeId) continue;
    const member = shapes.find((item) => item.id === shapeId);
    const origin = origins.get(shapeId);
    const node = stage.findOne(`#shape-node-${shapeId}`) as Konva.Group | null;
    if (!member || !origin || !node) continue;

    const memberBox = shapePercentToBox(
      { ...member, x: origin.x + dx, y: origin.y + dy },
      canvasSize,
    );
    node.x(memberBox.centerX);
    node.y(memberBox.centerY);
  }
}

function readRotatedGroupBox(
  group: Konva.Group,
  baseWidth: number,
  baseHeight: number,
  canvas: CanvasSize,
): PixelBox {
  const width = Math.max(MIN_SHAPE_PX, baseWidth * Math.abs(group.scaleX()));
  const height = Math.max(MIN_SHAPE_PX, baseHeight * Math.abs(group.scaleY()));
  const centerX = group.x();
  const centerY = group.y();
  return clampBox(
    {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    },
    canvas,
  );
}

function resetGroupScale(group: Konva.Group) {
  group.scaleX(1);
  group.scaleY(1);
}

function getShapeLabelFontSize(height: number) {
  return Math.max(11, Math.min(height * 0.22, 20));
}

function getShapeLabelLayout(width: number, height: number) {
  const fontSize = getShapeLabelFontSize(height);
  return {
    fontSize,
    x: width * 0.1,
    y: height * 0.28,
    width: width * 0.8,
    height: height * 0.44,
  };
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  if (r <= 0) {
    ctx.rect(0, 0, width, height);
    return;
  }
  ctx.moveTo(r, 0);
  ctx.lineTo(width - r, 0);
  ctx.quadraticCurveTo(width, 0, width, r);
  ctx.lineTo(width, height - r);
  ctx.quadraticCurveTo(width, height, width - r, height);
  ctx.lineTo(r, height);
  ctx.quadraticCurveTo(0, height, 0, height - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
}

function RoundedShapeClip({
  width,
  height,
  cornerRadius,
  children,
}: {
  width: number;
  height: number;
  cornerRadius: number;
  children: ReactNode;
}) {
  if (cornerRadius <= 0) {
    return <>{children}</>;
  }
  return (
    <Group
      clipFunc={(ctx) => {
        const native = ctx as unknown as CanvasRenderingContext2D;
        native.beginPath();
        drawRoundedRectPath(native, width, height, cornerRadius);
      }}
    >
      {children}
    </Group>
  );
}

function KonvaShapeLabelEditor({
  shape,
  layoutWidth,
  layoutHeight,
  onCommit,
  onCancel,
}: {
  shape: CanvasShapeElement;
  layoutWidth: number;
  layoutHeight: number;
  onCommit: (label: string) => void;
  onCancel: () => void;
}) {
  const [draftLabel, setDraftLabel] = useState(shape.label);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const labelLayout = getShapeLabelLayout(layoutWidth, layoutHeight);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      textInputRef.current?.focus();
      textInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <Html
      groupProps={{
        x: labelLayout.x,
        y: labelLayout.y,
      }}
      divProps={{
        style: {
          pointerEvents: "none",
          background: "transparent",
        },
      }}
    >
      <textarea
        ref={textInputRef}
        value={draftLabel}
        onChange={(event) => setDraftLabel(event.target.value)}
        onBlur={() => onCommit(draftLabel.trim())}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onCommit(draftLabel.trim());
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        placeholder="Type here…"
        rows={2}
        style={{
          width: labelLayout.width,
          minHeight: labelLayout.height,
          background: "transparent",
          border: "none",
          outline: "none",
          resize: "none",
          overflow: "hidden",
          padding: 0,
          margin: 0,
          pointerEvents: "auto",
          textAlign: "center",
          color: shape.strokeColor,
          fontSize: labelLayout.fontSize,
          fontWeight: 700,
          lineHeight: 1.25,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          caretColor: shape.strokeColor,
        }}
      />
    </Html>
  );
}

const LINE_HANDLE_FILL = "#ffffff";
const LINE_HANDLE_STROKE = CANVAS_SELECTION_HANDLE_STROKE;

type LinePointsPatch = Partial<
  Pick<CanvasShapeElement, "x" | "y" | "width" | "height" | "linePoints">
>;

function canvasPointerFromDrag(event: Konva.KonvaEventObject<DragEvent>): { x: number; y: number } | null {
  const stage = event.target.getStage();
  const pointer = stage?.getPointerPosition();
  if (!pointer) return null;
  return { x: pointer.x, y: pointer.y };
}

function groupLocalPointerFromDrag(
  event: Konva.KonvaEventObject<DragEvent>,
  boxWidth: number,
  boxHeight: number,
): { x: number; y: number } | null {
  const node = event.target as Konva.Circle;
  const group = node.getParent();
  const pos = group?.getRelativePointerPosition();
  if (!pos) return null;
  return {
    x: Math.min(boxWidth, Math.max(0, pos.x)),
    y: Math.min(boxHeight, Math.max(0, pos.y)),
  };
}

function KonvaLineEditHandles({
  shape,
  width,
  height,
  canvasSize,
  movable,
  onLinePointsChange,
  onLivePatch,
}: {
  shape: CanvasShapeElement;
  width: number;
  height: number;
  canvasSize: CanvasSize;
  movable: boolean;
  onLinePointsChange: (id: string, patch: LinePointsPatch) => void;
  onLivePatch: (patch: LinePointsPatch | null) => void;
}) {
  if (!isLineLikeShapeType(shape.shapeType)) return null;

  const lineType = shape.shapeType;
  const points = resolveLinePoints(shape);
  const local = linePointsToLocalPixels(points, width, height);
  const showCurve = lineShapeHasCurveHandle(lineType);
  const curveLocal =
    local.curve ??
    linePointsToLocalPixels(
      { ...points, curve: points.curve ?? getDefaultLinePoints(lineType).curve },
      width,
      height,
    ).curve;

  const commitHandle = (
    role: "start" | "end" | "curve",
    canvasX: number,
    canvasY: number,
    localCurve?: { x: number; y: number },
  ): LinePointsPatch => {
    if (role === "curve" && lineShapeHasCurveHandle(lineType) && localCurve) {
      return {
        linePoints: patchCurvePoint(
          resolveLinePoints(shape),
          localCurve.x,
          localCurve.y,
          width,
          height,
        ),
      };
    }
    return updateLineAnchorFromCanvas(shape, canvasSize, role, canvasX, canvasY);
  };

  const syncHandlePosition = (
    node: Konva.Circle,
    role: "start" | "end" | "curve",
    patch: LinePointsPatch,
  ) => {
    const merged = { ...shape, ...patch };
    const w = (merged.width / 100) * canvasSize.width;
    const h = (merged.height / 100) * canvasSize.height;
    const loc = linePointsToLocalPixels(resolveLinePoints(merged), w, h);
    const pos = role === "start" ? loc.start : role === "end" ? loc.end : loc.curve;
    if (!pos) return;
    node.position({ x: pos.x, y: pos.y });
  };

  const applyHandle = (
    event: Konva.KonvaEventObject<DragEvent>,
    role: "start" | "end" | "curve",
  ) => {
    const pointer = canvasPointerFromDrag(event);
    if (!pointer) return;
    const localCurve =
      role === "curve" ? groupLocalPointerFromDrag(event, width, height) : undefined;
    const patch = commitHandle(role, pointer.x, pointer.y, localCurve ?? undefined);
    onLivePatch(patch);
    onLinePointsChange(shape.id, patch);
    syncHandlePosition(event.target as Konva.Circle, role, patch);
  };

  const handle = (
    role: "start" | "end" | "curve",
    x: number,
    y: number,
    label: string,
  ) => (
    <Circle
      key={role}
      x={x}
      y={y}
      radius={LINE_HANDLE_RADIUS}
      fill={LINE_HANDLE_FILL}
      stroke={LINE_HANDLE_STROKE}
      strokeWidth={2}
      draggable
      dragDistance={0}
      onMouseDown={(e) => e.cancelBubble = true}
      onTouchStart={(e) => e.cancelBubble = true}
      onDragStart={(e) => {
        e.cancelBubble = true;
        onLivePatch(null);
        const group = (e.target as Konva.Circle).getParent();
        if (group) group.draggable(false);
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        applyHandle(e, role);
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target as Konva.Circle;
        const group = node.getParent();
        if (group) group.draggable(movable);
        applyHandle(e, role);
        onLivePatch(null);
      }}
      hitStrokeWidth={12}
      aria-label={label}
    />
  );

  return (
    <>
      {handle("start", local.start.x, local.start.y, "Line start")}
      {handle("end", local.end.x, local.end.y, "Line end")}
      {showCurve && curveLocal
        ? handle("curve", curveLocal.x, curveLocal.y, "Curve bend")
        : null}
    </>
  );
}

function KonvaShapeGeometry({
  shape,
  width,
  height,
  canvasSize,
  listening,
}: {
  shape: CanvasShapeElement;
  width: number;
  height: number;
  canvasSize: CanvasSize;
  listening: boolean;
}) {
  if (isImageShapeType(shape.shapeType) && shape.imageUrl?.trim()) {
    return (
      <KonvaRasterImageShape
        imageUrl={shape.imageUrl.trim()}
        width={width}
        height={height}
        listening={listening}
      />
    );
  }

  const hasFill = shapeUsesPathData(shape) || shapeSupportsFill(shape.shapeType);
  const fill = hasFill ? shape.fillColor : undefined;
  const fillOpacity = hasFill ? shape.fillOpacity : undefined;
  const stroke = shape.strokeColor;
  const isLineLike =
    shape.shapeType === "line" ||
    shape.shapeType === "curvedLine" ||
    shape.shapeType === "arc" ||
    shape.shapeType === "arrow";
  const strokeWidth = isLineLike
    ? getLineLikeStrokeWidthPx(shape.strokeWidth, canvasSize)
    : getShapeStrokeWidthPx(shape.strokeWidth, width, height);
  const maxCorner = getMaxShapeCornerRadius(shape.shapeType);
  const cornerRadius = getShapeCornerRadiusPx(
    shape.cornerRadius,
    maxCorner,
    width,
    height,
  );
  const commonStroke = {
    stroke,
    strokeWidth,
    strokeScaleEnabled: false,
  };

  const wrapWithClip = (node: ReactNode) => {
    const usesRectCornerClip =
      shape.shapeType === "rectangle" || shape.shapeType === "square";
    if (!usesRectCornerClip || cornerRadius <= 0) {
      return node;
    }
    return (
      <RoundedShapeClip width={width} height={height} cornerRadius={cornerRadius}>
        {node}
      </RoundedShapeClip>
    );
  };

  if (shapeUsesPathData(shape) && shape.pathData?.trim()) {
    const pathViewBox = shape.pathViewBox ?? PATH_SHAPE_VIEWBOX_SIZE;
    const scaleX = width / pathViewBox;
    const scaleY = height / pathViewBox;
    const pathNode = (
      <Path
        data={shape.pathData.trim()}
        x={0}
        y={0}
        scaleX={scaleX}
        scaleY={scaleY}
        fill={fill}
        fillRule={shape.pathFillRule ?? "nonzero"}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeScaleEnabled={false}
        lineJoin="round"
        lineCap="round"
        listening={listening}
      />
    );
    return wrapWithClip(pathNode);
  }

  switch (shape.shapeType) {
    case "rectangle":
    case "square":
      if (shapeHasSideGaps(shape.sideGaps)) {
        return (
          <Line
            points={buildRectangleWithSideGapsPoints(width, height, shape.sideGaps)}
            closed
            fill={fill}
            fillOpacity={fillOpacity}
            strokeOpacity={1}
            lineJoin="round"
            listening={listening}
            {...commonStroke}
          />
        );
      }
      return (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={fill}
          fillOpacity={fillOpacity}
          strokeOpacity={1}
          cornerRadius={cornerRadius}
          listening={listening}
          {...commonStroke}
        />
      );
    case "circle":
    case "ellipse":
      return (
        <Ellipse
          x={width / 2}
          y={height / 2}
          radiusX={Math.max(1, width / 2)}
          radiusY={Math.max(1, height / 2)}
          fill={fill}
          fillOpacity={fillOpacity}
          strokeOpacity={1}
          perfectDrawEnabled={false}
          listening={listening}
          {...commonStroke}
        />
      );
    case "triangle":
      return wrapWithClip(
        <RegularPolygon
          x={width / 2}
          y={height / 2}
          sides={3}
          radius={Math.min(width, height) / 2}
          fill={fill}
          fillOpacity={fillOpacity}
          strokeOpacity={1}
          listening={listening}
          {...commonStroke}
        />,
      );
    case "hexagon":
      return wrapWithClip(
        <RegularPolygon
          x={width / 2}
          y={height / 2}
          sides={6}
          radius={Math.min(width, height) / 2}
          fill={fill}
          fillOpacity={fillOpacity}
          strokeOpacity={1}
          listening={listening}
          {...commonStroke}
        />,
      );
    case "star":
      return wrapWithClip(
        <Star
          x={width / 2}
          y={height / 2}
          numPoints={5}
          innerRadius={Math.min(width, height) * 0.22}
          outerRadius={Math.min(width, height) / 2}
          fill={fill}
          fillOpacity={fillOpacity}
          strokeOpacity={1}
          listening={listening}
          {...commonStroke}
        />,
      );
    case "diamond":
      return wrapWithClip(
        <RegularPolygon
          x={width / 2}
          y={height / 2}
          sides={4}
          rotation={45}
          radius={Math.min(width, height) / 2}
          fill={fill}
          fillOpacity={fillOpacity}
          strokeOpacity={1}
          listening={listening}
          {...commonStroke}
        />,
      );
    case "line":
    case "curvedLine":
    case "arc": {
      const lineType = shape.shapeType as LineLikeShapeType;
      const points = resolveLinePoints(shape);
      const pathData = buildPathDataFromLinePoints(lineType, points, width, height);
      return (
        <Path
          data={pathData}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeOpacity={1}
          strokeScaleEnabled={false}
          lineCap="round"
          lineJoin="round"
          fillEnabled={false}
          perfectDrawEnabled={false}
          hitStrokeWidth={Math.max(16, strokeWidth + 10)}
          listening={listening}
        />
      );
    }
    case "arrow": {
      const points = resolveLinePoints(shape);
      const local = linePointsToLocalPixels(points, width, height);
      const flat = [local.start.x, local.start.y, local.end.x, local.end.y];
      const segLen = Math.hypot(local.end.x - local.start.x, local.end.y - local.start.y);
      return (
        <Arrow
          x={0}
          y={0}
          points={flat}
          pointerLength={Math.max(8, Math.min(segLen * 0.35, 18))}
          pointerWidth={Math.max(8, Math.min(segLen * 0.35, 18))}
          fill={stroke}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeOpacity={1}
          fillOpacity={1}
          strokeScaleEnabled={false}
          hitStrokeWidth={Math.max(14, strokeWidth * 4)}
          listening={listening}
        />
      );
    }
    default:
      return null;
  }
}

function AlignmentGuideLines({
  guides,
  canvasSize,
}: {
  guides: AlignmentGuide[];
  canvasSize: CanvasSize;
}) {
  return (
    <>
      {guides.map((guide, index) =>
        guide.orientation === "vertical" ? (
          <Line
            key={`guide-v-${guide.position}-${index}`}
            points={[guide.position, 0, guide.position, canvasSize.height]}
            stroke={GUIDE_STROKE}
            strokeWidth={1}
            dash={[5, 5]}
            listening={false}
          />
        ) : (
          <Line
            key={`guide-h-${guide.position}-${index}`}
            points={[0, guide.position, canvasSize.width, guide.position]}
            stroke={GUIDE_STROKE}
            strokeWidth={1}
            dash={[5, 5]}
            listening={false}
          />
        ),
      )}
    </>
  );
}

export function PhotoStudioShapeStage({
  shapes,
  canvasSize,
  selectedIds,
  selectable,
  movable,
  resizable,
  textEditable,
  editingTextId,
  onSelect,
  onClearSelection,
  onMove,
  onTransform,
  onLinePointsChange,
  onStartEditText,
  onCommitLabel,
  onCancelEditText,
  onSelectionBoundsChange,
  stageRef,
}: PhotoStudioShapeStageProps) {
  const internalStageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const multiSelectOverlayRef = useRef<Konva.Group | null>(null);
  const dragOriginRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const coDragOriginsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);
  const [lineLivePatch, setLineLivePatch] = useState<{
    shapeId: string;
    patch: LinePointsPatch;
  } | null>(null);
  const listening = selectable || movable;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const clearGuides = () => setActiveGuides([]);

  const updateSelectionOverlay = useCallback(() => {
    const stage = internalStageRef.current;
    const overlay = multiSelectOverlayRef.current;
    if (!stage || !overlay) return;

    if (selectedIds.length === 0) {
      overlay.visible(false);
      onSelectionBoundsChange?.(null);
      overlay.getLayer()?.batchDraw();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const id of selectedIds) {
      const node = stage.findOne(`#shape-node-${id}`) as Konva.Group | null;
      if (!node) continue;
      const rect = node.getClientRect({ relativeTo: stage });
      minX = Math.min(minX, rect.x);
      minY = Math.min(minY, rect.y);
      maxX = Math.max(maxX, rect.x + rect.width);
      maxY = Math.max(maxY, rect.y + rect.height);
    }

    if (!Number.isFinite(minX)) {
      overlay.visible(false);
      onSelectionBoundsChange?.(null);
      overlay.getLayer()?.batchDraw();
      return;
    }

    onSelectionBoundsChange?.({ minX, minY, maxX, maxY });

    if (selectedIds.length < 2) {
      overlay.visible(false);
      overlay.getLayer()?.batchDraw();
      return;
    }

    const boxX = minX - SELECTION_BOX_PAD;
    const boxY = minY - SELECTION_BOX_PAD;
    const boxW = maxX - minX + SELECTION_BOX_PAD * 2;
    const boxH = maxY - minY + SELECTION_BOX_PAD * 2;

    overlay.visible(true);
    const boxNode = overlay.findOne(".selection-bounds-box") as Konva.Rect | null;
    boxNode?.setAttrs({
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
    });

    const selectedMembers = shapes.filter((item) => selectedIds.includes(item.id));
    const sharedGroupId = selectedMembers[0]?.groupId;
    const showGroupedLabel =
      selectedMembers.length > 1 &&
      Boolean(sharedGroupId) &&
      selectedMembers.every((item) => item.groupId === sharedGroupId);

    const labelGroup = overlay.findOne(".selection-group-label") as Konva.Group | null;
    if (labelGroup) {
      labelGroup.visible(showGroupedLabel);
      if (showGroupedLabel) {
        const tag = labelGroup.findOne(".selection-group-tag") as Konva.Rect | null;
        const tagText = labelGroup.findOne(".selection-group-text") as Konva.Text | null;
        const tagW = 56;
        const tagH = 16;
        tag?.setAttrs({
          x: boxX + 6,
          y: boxY + 6,
          width: tagW,
          height: tagH,
        });
        tagText?.setAttrs({
          x: boxX + 10,
          y: boxY + 8,
          text: "Grouped",
        });
      }
    }

    overlay.getLayer()?.batchDraw();
  }, [onSelectionBoundsChange, selectedIds, shapes]);

  useEffect(() => {
    updateSelectionOverlay();
  }, [updateSelectionOverlay, shapes, canvasSize]);

  const handleDragStart = (shape: CanvasShapeElement) => {
    dragOriginRef.current = { id: shape.id, x: shape.x, y: shape.y };
    coDragOriginsRef.current.clear();
    for (const shapeId of getCoDragShapeIds(shape, shapes, selectedIds)) {
      const member = shapes.find((item) => item.id === shapeId);
      if (member) {
        coDragOriginsRef.current.set(shapeId, { x: member.x, y: member.y });
      }
    }
    clearGuides();
  };

  const handleDragMove = (shape: CanvasShapeElement, group: Konva.Group) => {
    const { width, height } = getShapePixelSize(shape, canvasSize);
    const box = readRotatedGroupBox(group, width, height, canvasSize);
    const snapLines = collectSnapLines(shapes, canvasSize, shape.id);
    const { box: snappedBox, guides } = snapBoxToGuides(box, snapLines, ALIGNMENT_SNAP_THRESHOLD_PX);
    group.x(snappedBox.x + snappedBox.width / 2);
    group.y(snappedBox.y + snappedBox.height / 2);
    syncCoDragKonvaNodes(
      shape.id,
      group,
      shapes,
      canvasSize,
      selectedIds,
      coDragOriginsRef.current,
    );
    setActiveGuides(guides);
    updateSelectionOverlay();
    group.getLayer()?.batchDraw();
  };

  const handleDragEnd = (shape: CanvasShapeElement, group: Konva.Group) => {
    const { width, height } = getShapePixelSize(shape, canvasSize);
    const box = readRotatedGroupBox(group, width, height, canvasSize);
    const snapLines = collectSnapLines(shapes, canvasSize, shape.id);
    const { box: snappedBox, guides } = snapBoxToGuides(box, snapLines, ALIGNMENT_SNAP_THRESHOLD_PX);
    group.x(snappedBox.x + snappedBox.width / 2);
    group.y(snappedBox.y + snappedBox.height / 2);
    syncCoDragKonvaNodes(
      shape.id,
      group,
      shapes,
      canvasSize,
      selectedIds,
      coDragOriginsRef.current,
    );
    setActiveGuides(guides);

    const next = boxToShapePercent(shape.id, shape, snappedBox, canvasSize);
    const origin = dragOriginRef.current;
    const dx = origin?.id === shape.id ? next.x - origin.x : 0;
    const dy = origin?.id === shape.id ? next.y - origin.y : 0;
    dragOriginRef.current = null;
    coDragOriginsRef.current.clear();
    onMove(shape.id, next.x, next.y, { dx, dy });
    updateSelectionOverlay();

    window.setTimeout(clearGuides, 180);
  };

  const applyTransformFromNode = (shape: CanvasShapeElement, group: Konva.Group) => {
    const { width, height } = getShapePixelSize(shape, canvasSize);
    const box = readRotatedGroupBox(group, width, height, canvasSize);
    resetGroupScale(group);
    const next = boxToShapePercent(shape.id, shape, box, canvasSize);
    onTransform(shape.id, {
      x: next.x,
      y: next.y,
      width: next.width,
      height: next.height,
      rotation: normalizeShapeRotation(group.rotation()),
    });
  };

  const handleTransformerEnd = () => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodes = transformer.nodes();
    nodes.forEach((node) => {
      const shapeId = node.id().replace("shape-node-", "");
      const shape = shapes.find((item) => item.id === shapeId);
      if (!shape) return;
      applyTransformFromNode(shape, node as Konva.Group);
    });
    clearGuides();
    updateSelectionOverlay();
  };

  useEffect(() => {
    const stage = stageRef?.current ?? internalStageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;

    const selectedNodes = selectedIds
      .map((id) => {
        const shape = shapes.find((item) => item.id === id);
        if (shape && isLineLikeShapeType(shape.shapeType)) {
          return null;
        }
        return stage.findOne(`#shape-node-${id}`);
      })
      .filter((node): node is Konva.Group => node !== null && node !== undefined);

    // Multi-select transform skews relative positions; resize one shape at a time.
    if (selectedNodes.length === 1 && resizable) {
      transformer.nodes(selectedNodes);
      transformer.visible(true);
    } else {
      transformer.nodes([]);
      transformer.visible(false);
    }

    transformer.getLayer()?.batchDraw();
  }, [selectedIds, resizable, shapes, canvasSize, stageRef]);

  if (canvasSize.width <= 0 || canvasSize.height <= 0) {
    return null;
  }

  const setStageRef = (node: Konva.Stage | null) => {
    internalStageRef.current = node;
    if (stageRef) {
      stageRef.current = node;
    }
  };

  return (
    <Stage
      ref={setStageRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className="absolute left-0 top-0 touch-none"
      style={{
        width: canvasSize.width,
        height: canvasSize.height,
        pointerEvents: listening ? "auto" : "none",
      }}
      onMouseDown={(event) => {
        if (event.target === event.target.getStage()) {
          clearGuides();
          onClearSelection();
        }
      }}
      onTouchStart={(event) => {
        if (event.target === event.target.getStage()) {
          clearGuides();
          onClearSelection();
        }
      }}
    >
      <Layer
        name="shapes"
        clipX={0}
        clipY={0}
        clipWidth={canvasSize.width}
        clipHeight={canvasSize.height}
      >
        {shapes.map((shape) => {
          const livePatch =
            lineLivePatch?.shapeId === shape.id ? lineLivePatch.patch : null;
          const renderShape = livePatch ? { ...shape, ...livePatch } : shape;
          const box = shapePercentToBox(renderShape, canvasSize);
          const nodeId = `shape-node-${shape.id}`;
          const isEditingLabel = editingTextId === shape.id;
          const showLabel = Boolean(shape.label) && !isEditingLabel;
          const canEditLabel = textEditable && (shapeUsesPathData(shape) || shapeSupportsFill(shape.shapeType));
          const labelLayout = getShapeLabelLayout(box.width, box.height);
          const isSelected = selectedSet.has(shape.id);

          return (
            <Group
              key={shape.id}
              id={nodeId}
              name={nodeId}
              x={box.centerX}
              y={box.centerY}
              offsetX={box.width / 2}
              offsetY={box.height / 2}
              rotation={renderShape.rotation ?? 0}
              draggable={movable && !isEditingLabel}
              dragDistance={4}
              listening={listening && !isEditingLabel}
              onClick={(event) => {
                event.cancelBubble = true;
                onSelect(shape.id, event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey);
              }}
              onTap={(event) => {
                event.cancelBubble = true;
                onSelect(shape.id, event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey);
              }}
              onDblClick={(event) => {
                if (!canEditLabel) return;
                event.cancelBubble = true;
                onSelect(shape.id, false);
                onStartEditText(shape.id);
              }}
              onDblTap={(event) => {
                if (!canEditLabel) return;
                event.cancelBubble = true;
                onSelect(shape.id, false);
                onStartEditText(shape.id);
              }}
              onDragStart={(event) => {
                if (event.target !== event.currentTarget) return;
                handleDragStart(shape);
              }}
              onDragMove={(event) => {
                if (event.target !== event.currentTarget) return;
                handleDragMove(shape, event.currentTarget as Konva.Group);
              }}
              onDragEnd={(event) => {
                if (event.target !== event.currentTarget) return;
                handleDragEnd(shape, event.currentTarget as Konva.Group);
              }}
            >
              <KonvaShapeGeometry
                shape={renderShape}
                width={box.width}
                height={box.height}
                canvasSize={canvasSize}
                listening={listening && !isEditingLabel}
              />
              {showLabel ? (
                <Text
                  x={labelLayout.x}
                  y={labelLayout.y}
                  width={labelLayout.width}
                  height={labelLayout.height}
                  text={shape.label}
                  fill={shape.strokeColor}
                  fontSize={labelLayout.fontSize}
                  fontStyle="bold"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  align="center"
                  verticalAlign="middle"
                  wrap="word"
                  listening={false}
                />
              ) : null}
              {isEditingLabel ? (
                <KonvaShapeLabelEditor
                  shape={shape}
                  layoutWidth={box.width}
                  layoutHeight={box.height}
                  onCommit={(label) => onCommitLabel(shape.id, label)}
                  onCancel={onCancelEditText}
                />
              ) : null}
              {isSelected &&
              selectedIds.length === 1 &&
              !isLineLikeShapeType(shape.shapeType) ? (
                <Rect
                  width={box.width}
                  height={box.height}
                  fill={CANVAS_SELECTION_FILL}
                  stroke={CANVAS_SELECTION_STROKE}
                  strokeWidth={2}
                  listening={false}
                />
              ) : null}
              {isSelected &&
              selectedIds.length === 1 &&
              isLineLikeShapeType(shape.shapeType) ? (
                <Rect
                  width={box.width}
                  height={box.height}
                  fill={CANVAS_SELECTION_FILL_LINE}
                  stroke={CANVAS_SELECTION_STROKE}
                  strokeWidth={2}
                  dash={[5, 4]}
                  listening={false}
                />
              ) : null}
              {isSelected &&
              selectedIds.length === 1 &&
              isLineLikeShapeType(shape.shapeType) &&
              resizable ? (
                <KonvaLineEditHandles
                  shape={renderShape}
                  width={box.width}
                  height={box.height}
                  canvasSize={canvasSize}
                  movable={movable}
                  onLinePointsChange={onLinePointsChange}
                  onLivePatch={(patch) =>
                    setLineLivePatch(patch ? { shapeId: shape.id, patch } : null)
                  }
                />
              ) : null}
            </Group>
          );
        })}
        <Group ref={multiSelectOverlayRef} visible={false} listening={false}>
          <Rect
            name="selection-bounds-box"
            stroke={CANVAS_SELECTION_STROKE}
            strokeWidth={2}
            dash={[7, 5]}
            fill={CANVAS_SELECTION_FILL_MULTI}
            listening={false}
          />
          <Group name="selection-group-label" visible={false} listening={false}>
            <Rect
              name="selection-group-tag"
              fill={CANVAS_SELECTION_GROUP_TAG}
              cornerRadius={4}
              listening={false}
            />
            <Text
              name="selection-group-text"
              text="Grouped"
              fontSize={9}
              fontStyle="bold"
              fill="#ffffff"
              listening={false}
            />
          </Group>
        </Group>
        {resizable ? (
          <Transformer
            ref={transformerRef}
            rotateEnabled
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            keepRatio={false}
            enabledAnchors={[
              "top-left",
              "top-center",
              "top-right",
              "middle-right",
              "middle-left",
              "bottom-left",
              "bottom-center",
              "bottom-right",
            ]}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < MIN_SHAPE_PX || newBox.height < MIN_SHAPE_PX) {
                return oldBox;
              }
              return newBox;
            }}
            anchorSize={8}
            borderStroke={CANVAS_SELECTION_HANDLE_STROKE}
            anchorStroke={CANVAS_SELECTION_HANDLE_STROKE}
            anchorFill="#ffffff"
            padding={2}
            onTransformEnd={handleTransformerEnd}
          />
        ) : null}
      </Layer>
      <Layer name={GUIDE_LAYER_NAME} listening={false}>
        <AlignmentGuideLines guides={activeGuides} canvasSize={canvasSize} />
      </Layer>
    </Stage>
  );
}

export function drawPhotoStudioShapeStageToContext(
  stage: Konva.Stage | null,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  if (!stage || width <= 0 || height <= 0) return;

  const transformer = stage.findOne("Transformer");
  const guidesLayer = stage.findOne(`.${GUIDE_LAYER_NAME}`);
  const transformerWasVisible = transformer?.visible() ?? false;
  const guidesWereVisible = guidesLayer?.visible() ?? false;
  transformer?.visible(false);
  guidesLayer?.visible(false);
  stage.batchDraw();

  const shapeCanvas = stage.toCanvas({ pixelRatio: 1 });
  ctx.drawImage(shapeCanvas, 0, 0, width, height);

  transformer?.visible(transformerWasVisible);
  guidesLayer?.visible(guidesWereVisible);
  stage.batchDraw();
}
