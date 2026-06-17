"use client";

import { useState } from "react";
import { Arrow, Ellipse, Group, Rect } from "react-konva";
import type Konva from "konva";

import {
  CONNECTOR_ANCHORS,
  getConnectorAnchorLocalPosition,
  type ConnectorAnchor,
} from "@/lib/plan-diagram-canvas-connectors";
import type { PlanDiagramCanvasNode } from "@/lib/plan-diagram-canvas-mermaid";

const ARROW_GAP = 18;
const ARROW_FILL = "rgba(148, 163, 184, 0.32)";
const ARROW_FILL_HOVER = "rgba(59, 130, 246, 0.48)";
const ARROW_STROKE = "rgba(59, 130, 246, 0.7)";
const ARROW_STROKE_HOVER = "rgba(37, 99, 235, 0.95)";
const HALO_FILL = "rgba(148, 163, 184, 0.16)";
const HALO_STROKE = "rgba(59, 130, 246, 0.28)";

function getNodeCornerRadius(node: PlanDiagramCanvasNode) {
  if (node.type === "api") return 10;
  if (node.type === "rect" || node.type === "brand") return 8;
  return 0;
}

function getArrowLayout(anchor: ConnectorAnchor, node: PlanDiagramCanvasNode) {
  const scale = Math.max(0.85, Math.min(1.15, Math.min(node.width, node.height) / 80));
  const length = 16 * scale;
  const pointerLength = 10 * scale;
  const pointerWidth = 12 * scale;
  const haloRadiusX = 14 * scale;
  const haloRadiusY = 10 * scale;
  const anchorPos = getConnectorAnchorLocalPosition(node, anchor);

  switch (anchor) {
    case "top":
      return {
        x: anchorPos.x,
        y: -ARROW_GAP,
        points: [0, 0, 0, -length],
        haloX: 0,
        haloY: -length * 0.55,
        pointerLength,
        pointerWidth,
        haloRadiusX,
        haloRadiusY,
      };
    case "bottom":
      return {
        x: anchorPos.x,
        y: node.height + ARROW_GAP,
        points: [0, 0, 0, length],
        haloX: 0,
        haloY: length * 0.55,
        pointerLength,
        pointerWidth,
        haloRadiusX,
        haloRadiusY,
      };
    case "left":
      return {
        x: -ARROW_GAP,
        y: anchorPos.y,
        points: [0, 0, -length, 0],
        haloX: -length * 0.55,
        haloY: 0,
        pointerLength,
        pointerWidth,
        haloRadiusX: haloRadiusY,
        haloRadiusY: haloRadiusX,
      };
    case "right":
      return {
        x: node.width + ARROW_GAP,
        y: anchorPos.y,
        points: [0, 0, length, 0],
        haloX: length * 0.55,
        haloY: 0,
        pointerLength,
        pointerWidth,
        haloRadiusX: haloRadiusY,
        haloRadiusY: haloRadiusX,
      };
  }
}

function DirectionalConnectorHandle({
  anchor,
  node,
  onStartDrag,
}: {
  anchor: ConnectorAnchor;
  node: PlanDiagramCanvasNode;
  onStartDrag: (
    nodeId: string,
    anchor: ConnectorAnchor,
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const layout = getArrowLayout(anchor, node);

  const setCursor = (event: Konva.KonvaEventObject<MouseEvent>, cursor: string) => {
    const container = event.target.getStage()?.container();
    if (container) container.style.cursor = cursor;
  };

  return (
    <Group
      x={layout.x}
      y={layout.y}
      onMouseDown={(event) => {
        event.cancelBubble = true;
        onStartDrag(node.id, anchor, event);
      }}
      onTouchStart={(event) => {
        event.cancelBubble = true;
        onStartDrag(node.id, anchor, event);
      }}
      onMouseEnter={(event) => {
        setHovered(true);
        setCursor(event, "crosshair");
      }}
      onMouseLeave={(event) => {
        setHovered(false);
        setCursor(event, "default");
      }}
    >
      <Ellipse
        x={layout.haloX}
        y={layout.haloY}
        radiusX={layout.haloRadiusX}
        radiusY={layout.haloRadiusY}
        fill={hovered ? "rgba(59, 130, 246, 0.14)" : HALO_FILL}
        stroke={hovered ? ARROW_STROKE : HALO_STROKE}
        strokeWidth={1}
        listening={false}
      />
      <Arrow
        points={layout.points}
        stroke={hovered ? ARROW_STROKE_HOVER : ARROW_STROKE}
        fill={hovered ? ARROW_FILL_HOVER : ARROW_FILL}
        strokeWidth={1.5}
        lineCap="round"
        lineJoin="round"
        pointerLength={layout.pointerLength}
        pointerWidth={layout.pointerWidth}
        hitStrokeWidth={20}
      />
    </Group>
  );
}

export function CanvasNodeSelectionChrome({
  node,
  onStartDrag,
}: {
  node: PlanDiagramCanvasNode;
  onStartDrag: (
    nodeId: string,
    anchor: ConnectorAnchor,
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => void;
}) {
  const cornerRadius = getNodeCornerRadius(node);

  return (
    <Group x={node.x} y={node.y}>
      <Rect
        x={0}
        y={0}
        width={node.width}
        height={node.height}
        cornerRadius={cornerRadius}
        stroke="#3b82f6"
        strokeWidth={1.5}
        dash={[6, 4]}
        listening={false}
      />
      {CONNECTOR_ANCHORS.map((anchor) => (
        <DirectionalConnectorHandle
          key={anchor}
          anchor={anchor}
          node={node}
          onStartDrag={onStartDrag}
        />
      ))}
    </Group>
  );
}
