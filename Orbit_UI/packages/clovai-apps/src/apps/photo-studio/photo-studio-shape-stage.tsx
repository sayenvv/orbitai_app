"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow, Ellipse, Group, Layer, Line, Rect, RegularPolygon, Stage, Star, Text, Transformer } from "react-konva";
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
  boxToShapePercent,
  getMaxShapeCornerRadius,
  getShapeCornerRadiusPx,
  getShapeStrokeWidthPx,
  shapePercentToBox,
  type CanvasShapeElement,
  type CanvasSize,
  type PhotoStudioShapeType,
} from "./photo-studio-canvas-types";

const MIN_SHAPE_PX = 8;
const GUIDE_STROKE = "#ec4899";
const GUIDE_LAYER_NAME = "alignment-guides";

type PhotoStudioShapeStageProps = {
  shapes: CanvasShapeElement[];
  canvasSize: CanvasSize;
  selectedId: string | null;
  selectable: boolean;
  movable: boolean;
  resizable: boolean;
  textEditable: boolean;
  editingTextId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, next: Pick<CanvasShapeElement, "x" | "y" | "width" | "height">) => void;
  onStartEditText: (id: string) => void;
  onCommitLabel: (id: string, label: string) => void;
  onCancelEditText: () => void;
  stageRef?: React.RefObject<Konva.Stage | null>;
};

function shapeSupportsFill(shapeType: PhotoStudioShapeType): boolean {
  return shapeType !== "line";
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

function readGroupBox(group: Konva.Group, baseWidth: number, baseHeight: number, canvas: CanvasSize): PixelBox {
  return clampBox(
    {
      x: group.x(),
      y: group.y(),
      width: Math.max(MIN_SHAPE_PX, baseWidth * group.scaleX()),
      height: Math.max(MIN_SHAPE_PX, baseHeight * group.scaleY()),
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

function KonvaShapeGeometry({
  shape,
  width,
  height,
  listening,
}: {
  shape: CanvasShapeElement;
  width: number;
  height: number;
  listening: boolean;
}) {
  const hasFill = shapeSupportsFill(shape.shapeType);
  const fill = hasFill ? shape.fillColor : undefined;
  const fillOpacity = hasFill ? shape.fillOpacity : undefined;
  const stroke = shape.strokeColor;
  const strokeWidth = getShapeStrokeWidthPx(shape.strokeWidth, width, height);
  const cornerRadius = getShapeCornerRadiusPx(
    shape.cornerRadius,
    getMaxShapeCornerRadius(shape.shapeType),
    width,
    height,
  );
  const commonStroke = {
    stroke,
    strokeWidth,
    strokeScaleEnabled: false,
  };

  switch (shape.shapeType) {
    case "rectangle":
    case "square":
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
          radiusX={width / 2}
          radiusY={height / 2}
          fill={fill}
          fillOpacity={fillOpacity}
          strokeOpacity={1}
          listening={listening}
          {...commonStroke}
        />
      );
    case "triangle":
      return (
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
        />
      );
    case "hexagon":
      return (
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
        />
      );
    case "star":
      return (
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
        />
      );
    case "diamond":
      return (
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
        />
      );
    case "line":
      return (
        <Line
          points={[0, height, width, 0]}
          stroke={stroke}
          strokeWidth={strokeWidth * 1.25}
          strokeOpacity={1}
          strokeScaleEnabled={false}
          lineCap="round"
          hitStrokeWidth={Math.max(18, strokeWidth * 5)}
          listening={listening}
        />
      );
    case "arrow":
      return (
        <Arrow
          x={0}
          y={0}
          points={[0, height, width, 0]}
          pointerLength={Math.max(8, Math.min(width, height) * 0.35)}
          pointerWidth={Math.max(8, Math.min(width, height) * 0.35)}
          fill={stroke}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeOpacity={1}
          fillOpacity={1}
          strokeScaleEnabled={false}
          hitStrokeWidth={Math.max(18, strokeWidth * 5)}
          listening={listening}
        />
      );
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
  selectedId,
  selectable,
  movable,
  resizable,
  textEditable,
  editingTextId,
  onSelect,
  onClearSelection,
  onMove,
  onResize,
  onStartEditText,
  onCommitLabel,
  onCancelEditText,
  stageRef,
}: PhotoStudioShapeStageProps) {
  const internalStageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);
  const listening = selectable || movable;

  const clearGuides = () => setActiveGuides([]);

  const handleDragMove = (shape: CanvasShapeElement, group: Konva.Group) => {
    const { width, height } = getShapePixelSize(shape, canvasSize);
    const box = clampBox({ x: group.x(), y: group.y(), width, height }, canvasSize);
    const snapLines = collectSnapLines(shapes, canvasSize, shape.id);
    const { box: snappedBox, guides } = snapBoxToGuides(box, snapLines, ALIGNMENT_SNAP_THRESHOLD_PX);
    group.x(snappedBox.x);
    group.y(snappedBox.y);
    setActiveGuides(guides);
    group.getLayer()?.batchDraw();
  };

  const handleDragEnd = (shape: CanvasShapeElement, group: Konva.Group) => {
    const { width, height } = getShapePixelSize(shape, canvasSize);
    const box = readGroupBox(group, width, height, canvasSize);
    const snapLines = collectSnapLines(shapes, canvasSize, shape.id);
    const { box: snappedBox, guides } = snapBoxToGuides(box, snapLines, ALIGNMENT_SNAP_THRESHOLD_PX);
    group.x(snappedBox.x);
    group.y(snappedBox.y);
    setActiveGuides(guides);

    const next = boxToShapePercent(shape.id, shape, snappedBox, canvasSize);
    onMove(shape.id, next.x, next.y);

    window.setTimeout(clearGuides, 180);
  };

  const handleTransformEnd = (shape: CanvasShapeElement, group: Konva.Group) => {
    const { width, height } = getShapePixelSize(shape, canvasSize);
    const box = readGroupBox(group, width, height, canvasSize);
    resetGroupScale(group);
    const next = boxToShapePercent(shape.id, shape, box, canvasSize);
    onResize(shape.id, {
      x: next.x,
      y: next.y,
      width: next.width,
      height: next.height,
    });
    clearGuides();
  };

  useEffect(() => {
    const stage = stageRef?.current ?? internalStageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;

    const selectedNode = selectedId ? stage.findOne(`#shape-node-${selectedId}`) : null;

    if (selectedNode && resizable) {
      transformer.nodes([selectedNode]);
    } else {
      transformer.nodes([]);
    }

    transformer.getLayer()?.batchDraw();
  }, [selectedId, resizable, shapes, canvasSize, stageRef]);

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
      <Layer name="shapes">
        {shapes.map((shape) => {
          const box = shapePercentToBox(shape, canvasSize);
          const nodeId = `shape-node-${shape.id}`;
          const isEditingLabel = editingTextId === shape.id;
          const showLabel = Boolean(shape.label) && !isEditingLabel;
          const canEditLabel = textEditable && shapeSupportsFill(shape.shapeType);
          const labelLayout = getShapeLabelLayout(box.width, box.height);

          return (
            <Group
              key={shape.id}
              id={nodeId}
              name={nodeId}
              x={box.x}
              y={box.y}
              draggable={movable && !isEditingLabel}
              dragDistance={4}
              listening={listening && !isEditingLabel}
              onClick={(event) => {
                event.cancelBubble = true;
                onSelect(shape.id);
              }}
              onTap={(event) => {
                event.cancelBubble = true;
                onSelect(shape.id);
              }}
              onDblClick={(event) => {
                if (!canEditLabel) return;
                event.cancelBubble = true;
                onSelect(shape.id);
                onStartEditText(shape.id);
              }}
              onDblTap={(event) => {
                if (!canEditLabel) return;
                event.cancelBubble = true;
                onSelect(shape.id);
                onStartEditText(shape.id);
              }}
              onDragStart={clearGuides}
              onDragMove={(event) => handleDragMove(shape, event.target as Konva.Group)}
              onDragEnd={(event) => handleDragEnd(shape, event.target as Konva.Group)}
              onTransformEnd={(event) => handleTransformEnd(shape, event.target as Konva.Group)}
            >
              <KonvaShapeGeometry
                shape={shape}
                width={box.width}
                height={box.height}
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
            </Group>
          );
        })}
        {resizable ? (
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
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
            borderStroke="#8b5cf6"
            anchorStroke="#8b5cf6"
            anchorFill="#ffffff"
            padding={2}
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
