"use client";

import type { PlanDiagramCanvasNode } from "@/lib/plan-diagram-canvas-mermaid";
import {
  Circle as KonvaCircle,
  Ellipse,
  Group,
  Line,
  Rect,
  Text,
} from "react-konva";
import type Konva from "konva";

function hexagonPoints(width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;
  return [
    cx,
    cy - ry,
    cx + rx * 0.86,
    cy - ry * 0.5,
    cx + rx * 0.86,
    cy + ry * 0.5,
    cx,
    cy + ry,
    cx - rx * 0.86,
    cy + ry * 0.5,
    cx - rx * 0.86,
    cy - ry * 0.5,
  ];
}

function shieldPoints(width: number, height: number) {
  const pad = 6;
  return [
    width / 2,
    pad,
    width - pad,
    height * 0.28,
    width - pad,
    height * 0.58,
    width / 2,
    height - pad,
    pad,
    height * 0.58,
    pad,
    height * 0.28,
  ];
}

function parallelogramPoints(width: number, height: number) {
  const skew = Math.min(22, width * 0.14);
  return [skew, 0, width, 0, width - skew, height, 0, height];
}

export function CanvasNodeShape({
  node,
  selected,
  connectSource,
  connectHover = false,
  draggable = true,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  node: PlanDiagramCanvasNode;
  selected: boolean;
  connectSource: boolean;
  connectHover?: boolean;
  draggable?: boolean;
  onSelect: () => void;
  onDragStart?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const stroke = connectSource
    ? "#2563eb"
    : connectHover
      ? "#16a34a"
      : selected
        ? "#e4e4e7"
        : "#71717a";
  const fill = connectSource
    ? "rgba(37, 99, 235, 0.12)"
    : connectHover
      ? "rgba(22, 163, 74, 0.12)"
      : "rgba(255, 255, 255, 0.98)";
  const strokeWidth = selected || connectSource || connectHover ? 2 : 1.5;
  const isBrand = node.type === "brand" && node.accentColor;
  const hasLabel = Boolean(node.label?.trim());
  const labelOffsetY = isBrand && hasLabel ? 30 : 0;
  const labelHeight = node.height - labelOffsetY;

  return (
    <Group
      id={`canvas-node-${node.id}`}
      x={node.x}
      y={node.y}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={() => onDragStart?.()}
      onDragMove={(event: Konva.KonvaEventObject<DragEvent>) => {
        if (!onDragMove) return;
        const target = event.target;
        onDragMove(target.x(), target.y());
      }}
      onDragEnd={(event: Konva.KonvaEventObject<DragEvent>) => {
        const target = event.target;
        onDragEnd(target.x(), target.y());
      }}
    >
      {node.type === "rect" || node.type === "api" ? (
        <Rect
          width={node.width}
          height={node.height}
          cornerRadius={node.type === "api" ? 10 : 8}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : null}

      {node.type === "rounded" ? (
        <Rect
          width={node.width}
          height={node.height}
          cornerRadius={18}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : null}

      {node.type === "circle" ? (
        <KonvaCircle
          x={node.width / 2}
          y={node.height / 2}
          radius={Math.min(node.width, node.height) / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : null}

      {node.type === "cloud" ? (
        <Ellipse
          x={node.width / 2}
          y={node.height / 2}
          radiusX={node.width / 2}
          radiusY={node.height / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : null}

      {node.type === "diamond" || node.type === "hexagon" || node.type === "shield" ? (
        <Line
          points={
            node.type === "hexagon"
              ? hexagonPoints(node.width, node.height)
              : node.type === "shield"
                ? shieldPoints(node.width, node.height)
                : [
                    node.width / 2,
                    0,
                    node.width,
                    node.height / 2,
                    node.width / 2,
                    node.height,
                    0,
                    node.height / 2,
                  ]
          }
          closed
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : null}

      {node.type === "parallelogram" ? (
        <Line
          points={parallelogramPoints(node.width, node.height)}
          closed
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : null}

      {node.type === "subroutine" ? (
        <>
          <Rect
            x={3}
            y={3}
            width={node.width - 6}
            height={node.height - 6}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Rect
            width={node.width}
            height={node.height}
            fill="transparent"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      ) : null}

      {node.type === "database" ? (
        <>
          <Rect
            x={8}
            y={14}
            width={node.width - 16}
            height={node.height - 22}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Ellipse
            x={node.width / 2}
            y={14}
            radiusX={(node.width - 16) / 2}
            radiusY={10}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Ellipse
            x={node.width / 2}
            y={node.height - 8}
            radiusX={(node.width - 16) / 2}
            radiusY={10}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      ) : null}

      {node.type === "document" ? (
        <>
          <Rect
            width={node.width}
            height={node.height}
            cornerRadius={6}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Line
            points={[node.width - 22, 0, node.width, 0, node.width, 22, node.width - 22, 0]}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      ) : null}

      {node.type === "queue" ? (
        <>
          <Rect
            width={node.width - 10}
            height={node.height}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Line
            points={[
              node.width - 10,
              0,
              node.width,
              node.height * 0.2,
              node.width - 10,
              node.height * 0.4,
              node.width,
              node.height * 0.6,
              node.width - 10,
              node.height * 0.8,
              node.width,
              node.height,
              node.width - 10,
              node.height,
            ]}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      ) : null}

      {node.type === "actor" ? (
        <>
          <KonvaCircle
            x={node.width / 2}
            y={18}
            radius={14}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Line
            points={[
              node.width / 2,
              32,
              node.width / 2,
              node.height - 28,
              node.width / 2 - 18,
              node.height - 8,
              node.width / 2,
              node.height - 28,
              node.width / 2 + 18,
              node.height - 8,
            ]}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      ) : null}

      {isBrand ? (
        <>
          <Rect
            width={node.width}
            height={node.height}
            cornerRadius={8}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Rect
            width={node.width}
            height={hasLabel ? 28 : node.height}
            cornerRadius={[8, 8, hasLabel ? 0 : 8, hasLabel ? 0 : 8]}
            fill={node.accentColor}
          />
        </>
      ) : null}

      {hasLabel ? (
        <Text
          text={node.label}
          y={labelOffsetY}
          width={node.width}
          height={labelHeight}
          align="center"
          verticalAlign="middle"
          fontSize={isBrand ? 11 : 12}
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
          fill="#18181b"
          listening={false}
          padding={isBrand ? 6 : 10}
        />
      ) : null}
    </Group>
  );
}
