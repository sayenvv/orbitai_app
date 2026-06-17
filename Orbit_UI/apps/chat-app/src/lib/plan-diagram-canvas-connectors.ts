import type { PlanDiagramCanvasNode } from "@/lib/plan-diagram-canvas-mermaid";

export type ConnectorAnchor = "top" | "right" | "bottom" | "left";

export const CONNECTOR_ANCHORS: ConnectorAnchor[] = ["top", "right", "bottom", "left"];

export function getConnectorAnchorLocalPosition(
  node: Pick<PlanDiagramCanvasNode, "width" | "height">,
  anchor: ConnectorAnchor,
): { x: number; y: number } {
  switch (anchor) {
    case "top":
      return { x: node.width / 2, y: 0 };
    case "right":
      return { x: node.width, y: node.height / 2 };
    case "bottom":
      return { x: node.width / 2, y: node.height };
    case "left":
      return { x: 0, y: node.height / 2 };
  }
}

export function getConnectorAnchorStagePosition(
  node: PlanDiagramCanvasNode,
  anchor: ConnectorAnchor,
): { x: number; y: number } {
  const local = getConnectorAnchorLocalPosition(node, anchor);
  return { x: node.x + local.x, y: node.y + local.y };
}

export function getNearestConnectorAnchor(
  node: PlanDiagramCanvasNode,
  point: { x: number; y: number },
): ConnectorAnchor {
  let best: ConnectorAnchor = "top";
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const anchor of CONNECTOR_ANCHORS) {
    const position = getConnectorAnchorStagePosition(node, anchor);
    const distance = Math.hypot(point.x - position.x, point.y - position.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = anchor;
    }
  }

  return best;
}

export function findNodeAtPoint(
  nodes: PlanDiagramCanvasNode[],
  point: { x: number; y: number },
  excludeId?: string,
): PlanDiagramCanvasNode | null {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    if (excludeId && node.id === excludeId) continue;
    if (
      point.x >= node.x &&
      point.x <= node.x + node.width &&
      point.y >= node.y &&
      point.y <= node.y + node.height
    ) {
      return node;
    }
  }
  return null;
}

export type ConnectorDraft = {
  fromNodeId: string;
  fromAnchor: ConnectorAnchor;
  startX: number;
  startY: number;
  pointerX: number;
  pointerY: number;
};

type ConnectorPoint = { x: number; y: number };

const CONNECTOR_STUB = 28;
const CONNECTOR_CURVE_SAMPLES = 24;

export function getAnchorDirection(anchor: ConnectorAnchor): ConnectorPoint {
  switch (anchor) {
    case "top":
      return { x: 0, y: -1 };
    case "right":
      return { x: 1, y: 0 };
    case "bottom":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
  }
}

export function inferTargetAnchor(from: ConnectorPoint, to: ConnectorPoint): ConnectorAnchor {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "left" : "right";
  }
  return dy >= 0 ? "top" : "bottom";
}

function cubicBezierPoint(
  start: ConnectorPoint,
  control1: ConnectorPoint,
  control2: ConnectorPoint,
  end: ConnectorPoint,
  t: number,
): ConnectorPoint {
  const inverse = 1 - t;
  const a = inverse * inverse * inverse;
  const b = 3 * inverse * inverse * t;
  const c = 3 * inverse * t * t;
  const d = t * t * t;
  return {
    x: a * start.x + b * control1.x + c * control2.x + d * end.x,
    y: a * start.y + b * control1.y + c * control2.y + d * end.y,
  };
}

function getCurveControls(
  start: ConnectorPoint,
  end: ConnectorPoint,
  fromAnchor?: ConnectorAnchor,
  toAnchor?: ConnectorAnchor,
) {
  const resolvedFrom = fromAnchor ?? inferTargetAnchor(end, start);
  const resolvedTo = toAnchor ?? inferTargetAnchor(start, end);
  const fromDir = getAnchorDirection(resolvedFrom);
  const toDir = getAnchorDirection(resolvedTo);
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const offset = Math.max(CONNECTOR_STUB, Math.min(distance * 0.42, 140));

  return {
    resolvedFrom,
    resolvedTo,
    control1: {
      x: start.x + fromDir.x * offset,
      y: start.y + fromDir.y * offset,
    },
    control2: {
      x: end.x + toDir.x * offset,
      y: end.y + toDir.y * offset,
    },
  };
}

function extendFromAnchor(point: ConnectorPoint, anchor: ConnectorAnchor, distance: number): ConnectorPoint {
  const dir = getAnchorDirection(anchor);
  return { x: point.x + dir.x * distance, y: point.y + dir.y * distance };
}

function buildOrthogonalRoutePoints(
  start: ConnectorPoint,
  end: ConnectorPoint,
  fromAnchor: ConnectorAnchor,
  toAnchor: ConnectorAnchor,
): number[] {
  const exit = extendFromAnchor(start, fromAnchor, CONNECTOR_STUB);
  const entry = extendFromAnchor(end, toAnchor, CONNECTOR_STUB);
  const fromHorizontal = fromAnchor === "left" || fromAnchor === "right";
  const toHorizontal = toAnchor === "left" || toAnchor === "right";
  const route: ConnectorPoint[] = [start, exit];

  if (fromHorizontal && toHorizontal) {
    const midX = (exit.x + entry.x) / 2;
    route.push({ x: midX, y: exit.y }, { x: midX, y: entry.y });
  } else if (!fromHorizontal && !toHorizontal) {
    const midY = (exit.y + entry.y) / 2;
    route.push({ x: exit.x, y: midY }, { x: entry.x, y: midY });
  } else if (fromHorizontal) {
    route.push({ x: exit.x, y: entry.y });
  } else {
    route.push({ x: entry.x, y: exit.y });
  }

  route.push(entry, end);
  return route.flatMap((point) => [point.x, point.y]);
}

function shouldUseOrthogonalRoute(fromAnchor: ConnectorAnchor, toAnchor: ConnectorAnchor) {
  const fromDir = getAnchorDirection(fromAnchor);
  const toDir = getAnchorDirection(toAnchor);
  return fromDir.x * toDir.x + fromDir.y * toDir.y >= 0;
}

/** Smooth routed connector sampled for Konva Arrow / Line. */
export function buildConnectorRoutePoints(
  start: ConnectorPoint,
  end: ConnectorPoint,
  fromAnchor?: ConnectorAnchor,
  toAnchor?: ConnectorAnchor,
): number[] {
  const { resolvedFrom, resolvedTo, control1, control2 } = getCurveControls(
    start,
    end,
    fromAnchor,
    toAnchor,
  );

  if (shouldUseOrthogonalRoute(resolvedFrom, resolvedTo)) {
    return buildOrthogonalRoutePoints(start, end, resolvedFrom, resolvedTo);
  }

  const points: number[] = [];
  for (let index = 0; index <= CONNECTOR_CURVE_SAMPLES; index += 1) {
    const t = index / CONNECTOR_CURVE_SAMPLES;
    const point = cubicBezierPoint(start, control1, control2, end, t);
    points.push(point.x, point.y);
  }

  return points;
}

export function getBestAnchorsBetweenNodes(
  from: PlanDiagramCanvasNode,
  to: PlanDiagramCanvasNode,
): { fromAnchor: ConnectorAnchor; toAnchor: ConnectorAnchor } {
  const fromCenter = {
    x: from.x + from.width / 2,
    y: from.y + from.height / 2,
  };
  const toCenter = {
    x: to.x + to.width / 2,
    y: to.y + to.height / 2,
  };
  return {
    fromAnchor: getNearestConnectorAnchor(from, toCenter),
    toAnchor: getNearestConnectorAnchor(to, fromCenter),
  };
}

export function resolveEdgeAnchors(
  from: PlanDiagramCanvasNode,
  to: PlanDiagramCanvasNode,
  edge: { fromAnchor?: ConnectorAnchor; toAnchor?: ConnectorAnchor },
): { fromAnchor: ConnectorAnchor; toAnchor: ConnectorAnchor } {
  if (edge.fromAnchor && edge.toAnchor) {
    return { fromAnchor: edge.fromAnchor, toAnchor: edge.toAnchor };
  }
  const best = getBestAnchorsBetweenNodes(from, to);
  return {
    fromAnchor: edge.fromAnchor ?? best.fromAnchor,
    toAnchor: edge.toAnchor ?? best.toAnchor,
  };
}

export function getConnectorRouteMidpoint(
  start: ConnectorPoint,
  end: ConnectorPoint,
  fromAnchor?: ConnectorAnchor,
  toAnchor?: ConnectorAnchor,
): ConnectorPoint {
  const { control1, control2 } = getCurveControls(start, end, fromAnchor, toAnchor);
  return cubicBezierPoint(start, control1, control2, end, 0.5);
}
