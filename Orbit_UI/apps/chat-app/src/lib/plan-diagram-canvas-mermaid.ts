import type { PlanDiagramShapePreset } from "@/lib/plan-diagram-shape-catalog";

import type { ConnectorAnchor } from "@/lib/plan-diagram-canvas-connectors";

export type PlanDiagramCanvasNodeType =
  | "rect"
  | "diamond"
  | "circle"
  | "database"
  | "document"
  | "cloud"
  | "hexagon"
  | "parallelogram"
  | "subroutine"
  | "rounded"
  | "queue"
  | "actor"
  | "api"
  | "brand"
  | "shield";

export type PlanDiagramCanvasNode = {
  id: string;
  type: PlanDiagramCanvasNodeType;
  presetId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  accentColor?: string;
  iconText?: string;
};

export type PlanDiagramCanvasEdge = {
  id: string;
  fromId: string;
  toId: string;
  fromAnchor?: ConnectorAnchor;
  toAnchor?: ConnectorAnchor;
  label?: string;
};

export type PlanDiagramCanvasState = {
  nodes: PlanDiagramCanvasNode[];
  edges: PlanDiagramCanvasEdge[];
};

const GRID_COL = 220;
const GRID_ROW = 140;

const NODE_DEFAULTS: Record<PlanDiagramCanvasNodeType, { width: number; height: number }> = {
  rect: { width: 148, height: 64 },
  diamond: { width: 120, height: 88 },
  circle: { width: 84, height: 84 },
  database: { width: 120, height: 88 },
  document: { width: 132, height: 76 },
  cloud: { width: 148, height: 72 },
  hexagon: { width: 124, height: 80 },
  parallelogram: { width: 148, height: 64 },
  subroutine: { width: 148, height: 72 },
  rounded: { width: 132, height: 64 },
  queue: { width: 128, height: 72 },
  actor: { width: 72, height: 96 },
  api: { width: 132, height: 68 },
  brand: { width: 148, height: 80 },
  shield: { width: 112, height: 88 },
};

function sanitizeId(value: string, index: number): string {
  const base = value.replace(/[^A-Za-z0-9_]/g, "") || `n${index}`;
  return /^[A-Za-z]/.test(base) ? base : `n${base}`;
}

function escapeMermaidLabel(label: string): string {
  return label.replace(/"/g, "'").trim() || "Step";
}

function nodeMermaidSyntax(node: PlanDiagramCanvasNode): string {
  const label = escapeMermaidLabel(node.label) || node.id;
  switch (node.type) {
    case "diamond":
      return `${node.id}{"${label}"}`;
    case "circle":
      return `${node.id}(("${label}"))`;
    case "database":
      return `${node.id}[("${label}")]`;
    case "document":
    case "parallelogram":
      return `${node.id}[/${label}/]`;
    case "cloud":
    case "rounded":
    case "actor":
      return `${node.id}(["${label}"])`;
    case "hexagon":
    case "shield":
      return `${node.id}{{"${label}"}}`;
    case "subroutine":
      return `${node.id}[["${label}"]]`;
    case "api":
    case "brand":
    case "queue":
    case "rect":
    default:
      return `${node.id}["${label}"]`;
  }
}

export function canvasStateToMermaid(state: PlanDiagramCanvasState): string {
  if (!state.nodes.length) return "flowchart LR\n  draft[Draft diagram]";
  const lines = ["flowchart LR"];
  for (const node of state.nodes) {
    lines.push(`  ${nodeMermaidSyntax(node)}`);
  }
  for (const edge of state.edges) {
    const from = state.nodes.find((node) => node.id === edge.fromId);
    const to = state.nodes.find((node) => node.id === edge.toId);
    if (!from || !to) continue;
    if (edge.label?.trim()) {
      lines.push(`  ${edge.fromId} -->|${escapeMermaidLabel(edge.label)}| ${edge.toId}`);
    } else {
      lines.push(`  ${edge.fromId} --> ${edge.toId}`);
    }
  }
  return lines.join("\n");
}

type ParsedMermaidNode = {
  id: string;
  label: string;
  type: PlanDiagramCanvasNodeType;
};

function parseInlineNode(token: string): ParsedMermaidNode | null {
  const trimmed = token.trim();
  const patterns: Array<{ re: RegExp; type: PlanDiagramCanvasNodeType }> = [
    { re: /^([A-Za-z][\w-]*)\[\("(.+?)"\)\]$/, type: "database" },
    { re: /^([A-Za-z][\w-]*)\[\["(.+?)"\]\]$/, type: "subroutine" },
    { re: /^([A-Za-z][\w-]*)\{\{"(.+?)"\}\}$/, type: "hexagon" },
    { re: /^([A-Za-z][\w-]*)\(\("(.+?)"\)\)$/, type: "circle" },
    { re: /^([A-Za-z][\w-]*)\(\["(.+?)"\]\)$/, type: "cloud" },
    { re: /^([A-Za-z][\w-]*)\{\{"(.+?)"\}\}$/, type: "hexagon" },
    { re: /^([A-Za-z][\w-]*)\{"(.+?)"\}$/, type: "diamond" },
    { re: /^([A-Za-z][\w-]*)\[\/(.+?)\/\]$/, type: "document" },
    { re: /^([A-Za-z][\w-]*)\["(.+?)"\]$/, type: "rect" },
    { re: /^([A-Za-z][\w-]*)\[(.+?)\]$/, type: "rect" },
    { re: /^([A-Za-z][\w-]*)\((.+?)\)$/, type: "cloud" },
  ];

  for (const { re, type } of patterns) {
    const match = re.exec(trimmed);
    if (match) {
      return { id: match[1], label: match[2], type };
    }
  }
  return null;
}

function parseEdge(line: string): { fromId: string; toId: string; label?: string } | null {
  const labeled = /^([A-Za-z][\w-]*)\s*-->\|(.+?)\|\s*([A-Za-z][\w-]*)$/.exec(line);
  if (labeled) {
    return { fromId: labeled[1], toId: labeled[3], label: labeled[2] };
  }
  const plain = /^([A-Za-z][\w-]*)\s*--+>\s*([A-Za-z][\w-]*)$/.exec(line.replace(/\|.+?\|/g, ""));
  if (plain) return { fromId: plain[1], toId: plain[2] };
  return null;
}

export function mermaidToCanvasState(source: string): PlanDiagramCanvasState {
  const nodes = new Map<string, ParsedMermaidNode>();
  const edges: PlanDiagramCanvasEdge[] = [];
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^```/.test(line));

  for (const line of lines) {
    if (/^flowchart\b/i.test(line) || /^graph\b/i.test(line)) continue;

    const edgeParts = line.split(/--+>/);
    if (edgeParts.length >= 2) {
      const leftNode = parseInlineNode(edgeParts[0]);
      const rightNode = parseInlineNode(edgeParts[edgeParts.length - 1]);
      if (leftNode) nodes.set(leftNode.id, leftNode);
      if (rightNode) nodes.set(rightNode.id, rightNode);
      const parsedEdge = parseEdge(line);
      if (parsedEdge) {
        edges.push({
          id: `e-${parsedEdge.fromId}-${parsedEdge.toId}`,
          fromId: parsedEdge.fromId,
          toId: parsedEdge.toId,
          label: parsedEdge.label,
        });
      }
      continue;
    }

    const inline = parseInlineNode(line);
    if (inline) nodes.set(inline.id, inline);
  }

  const parsed = [...nodes.values()];
  const canvasNodes: PlanDiagramCanvasNode[] = parsed.map((node, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const defaults = NODE_DEFAULTS[node.type];
    return {
      id: sanitizeId(node.id, index),
      type: node.type,
      label: node.label || `Step ${index + 1}`,
      x: 80 + col * GRID_COL,
      y: 80 + row * GRID_ROW,
      width: defaults.width,
      height: defaults.height,
    };
  });

  const idMap = new Map(parsed.map((node, index) => [node.id, canvasNodes[index].id]));
  const canvasEdges = edges
    .map((edge, index) => ({
      id: `edge-${index}`,
      fromId: idMap.get(edge.fromId) ?? edge.fromId,
      toId: idMap.get(edge.toId) ?? edge.toId,
      label: edge.label,
    }))
    .filter(
      (edge) =>
        canvasNodes.some((node) => node.id === edge.fromId) &&
        canvasNodes.some((node) => node.id === edge.toId),
    );

  return { nodes: canvasNodes, edges: canvasEdges };
}

export function createCanvasNodeFromPreset(
  preset: PlanDiagramShapePreset,
  x: number,
  y: number,
  index: number,
): PlanDiagramCanvasNode {
  const defaults = NODE_DEFAULTS[preset.nodeType];
  const width = preset.width ?? defaults.width;
  const height = preset.height ?? defaults.height;
  return {
    id: `node_${Date.now()}_${index}`,
    type: preset.nodeType,
    presetId: preset.id,
    x: x - width / 2,
    y: y - height / 2,
    width,
    height,
    label: "",
    accentColor: preset.accentColor,
    iconText: preset.iconText,
  };
}

/** @deprecated Use createCanvasNodeFromPreset */
export function createCanvasNode(
  type: PlanDiagramCanvasNodeType,
  x: number,
  y: number,
  index: number,
): PlanDiagramCanvasNode {
  const labels: Partial<Record<PlanDiagramCanvasNodeType, string>> = {
    rect: "Process",
    diamond: "Decision",
    circle: "Start",
    database: "Database",
    document: "Document",
    cloud: "Service",
  };
  const defaults = NODE_DEFAULTS[type];
  return {
    id: `node_${Date.now()}_${index}`,
    type,
    x: x - defaults.width / 2,
    y: y - defaults.height / 2,
    width: defaults.width,
    height: defaults.height,
    label: labels[type] ?? "Node",
  };
}
