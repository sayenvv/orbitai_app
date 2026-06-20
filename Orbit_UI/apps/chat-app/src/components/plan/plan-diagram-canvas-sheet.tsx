"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Waypoints, X, Shapes, SlidersHorizontal } from "lucide-react";
import { Arrow, Group, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";

import { CanvasNodeShape } from "@/components/plan/plan-diagram-canvas-node-shape";
import { CanvasNodeSelectionChrome, CanvasGroupSelectionChrome } from "@/components/plan/plan-diagram-canvas-connector-handles";
import { PlanDiagramCanvasInspector } from "@/components/plan/plan-diagram-canvas-inspector";
import { PlanDiagramCanvasPanel } from "@/components/plan/plan-diagram-canvas-panel";
import { PlanDiagramCanvasSidebar } from "@/components/plan/plan-diagram-canvas-sidebar";
import { studioButtonPrimary, studioButtonSecondary, studioRadius } from "@/components/studio/studio-ui";
import { useResizableWidth } from "@/hooks/use-resizable-width";
import {
  canvasStateToMermaid,
  createCanvasNodeFromPreset,
  mermaidToCanvasState,
  type PlanDiagramCanvasEdge,
  type PlanDiagramCanvasNode,
  type PlanDiagramCanvasState,
} from "@/lib/plan-diagram-canvas-mermaid";
import {
  getPresetFromDragData,
  PLAN_DIAGRAM_PRESET_DRAG_TYPE,
  type PlanDiagramShapePreset,
} from "@/lib/plan-diagram-shape-catalog";
import {
  buildConnectorRoutePoints,
  findNodeAtPoint,
  findNodesInSelectionRect,
  getBestAnchorsBetweenNodes,
  getConnectorAnchorStagePosition,
  getConnectorRouteMidpoint,
  getNearestConnectorAnchor,
  normalizeSelectionRect,
  resolveEdgeAnchors,
  type ConnectorAnchor,
  type ConnectorDraft,
  type SelectionRect,
} from "@/lib/plan-diagram-canvas-connectors";
import { normalizeMermaidSource } from "@/lib/normalize-mermaid-source";
import { cn } from "@/lib/utils";

type SidebarMode = "select" | "connect" | "place";

const MARQUEE_CLICK_THRESHOLD = 6;

function getCanvasNodeIdFromTarget(target: Konva.Node): string | null {
  let node: Konva.Node | null = target;
  while (node) {
    const id = node.id();
    if (typeof id === "string" && id.startsWith("canvas-node-")) {
      return id.slice("canvas-node-".length);
    }
    node = node.getParent();
  }
  return null;
}

function isCanvasBackgroundTarget(target: Konva.Node): boolean {
  if (getCanvasNodeIdFromTarget(target) !== null) return false;

  let node: Konva.Node | null = target;
  while (node) {
    const className = node.getClassName();
    if (className === "Transformer") return false;
    if (className === "Stage" || className === "Layer") return true;
    node = node.getParent();
  }

  return false;
}

function getEdgeEndpoints(
  from: PlanDiagramCanvasNode,
  to: PlanDiagramCanvasNode,
  edge: PlanDiagramCanvasEdge,
) {
  const { fromAnchor, toAnchor } = resolveEdgeAnchors(from, to, edge);
  return {
    start: getConnectorAnchorStagePosition(from, fromAnchor),
    end: getConnectorAnchorStagePosition(to, toAnchor),
    fromAnchor,
    toAnchor,
  };
}

function CanvasEdges({ nodes, edges }: { nodes: PlanDiagramCanvasNode[]; edges: PlanDiagramCanvasEdge[] }) {
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  return (
    <>
      {edges.map((edge) => {
        const from = nodeById.get(edge.fromId);
        const to = nodeById.get(edge.toId);
        if (!from || !to) return null;
        const { start, end, fromAnchor, toAnchor } = getEdgeEndpoints(from, to, edge);
        const routePoints = buildConnectorRoutePoints(start, end, fromAnchor, toAnchor);
        const midpoint = getConnectorRouteMidpoint(start, end, fromAnchor, toAnchor);
        return (
          <Group key={edge.id} listening={false}>
            <Arrow
              points={routePoints}
              stroke="#71717a"
              fill="#71717a"
              strokeWidth={1.75}
              lineCap="round"
              lineJoin="round"
              pointerLength={8}
              pointerWidth={8}
              listening={false}
            />
            {edge.label?.trim() ? (
              <Text
                x={midpoint.x - 36}
                y={midpoint.y - 18}
                width={72}
                align="center"
                text={edge.label}
                fontSize={10}
                fill="#52525b"
                listening={false}
              />
            ) : null}
          </Group>
        );
      })}
    </>
  );
}

export function PlanDiagramCanvasSheet({
  open,
  title,
  mermaid,
  onSave,
  onClose,
}: {
  open: boolean;
  title: string;
  mermaid: string;
  onSave: (nextMermaid: string) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [mode, setMode] = useState<SidebarMode>("select");
  const [selectedPreset, setSelectedPreset] = useState<PlanDiagramShapePreset | null>(null);
  const [state, setState] = useState<PlanDiagramCanvasState>({ nodes: [], edges: [] });
  const stateRef = useRef(state);
  stateRef.current = state;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [marqueeRect, setMarqueeRect] = useState<SelectionRect | null>(null);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [connectorDraft, setConnectorDraft] = useState<ConnectorDraft | null>(null);
  const [connectHoverId, setConnectHoverId] = useState<string | null>(null);
  const [edgeLabel, setEdgeLabel] = useState("");
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const leftPanel = useResizableWidth(248, 200, 400, "left");
  const rightPanel = useResizableWidth(240, 200, 400, "right");
  const shapeGridColumns: 4 | 5 = leftPanel.width >= 248 ? 5 : 4;
  const nodeDragMovedRef = useRef(false);
  const marqueeActiveRef = useRef(false);
  const marqueeCompletedRef = useRef(false);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const canvasPointerHandledRef = useRef(false);
  const suppressNodeClickRef = useRef(false);
  const marqueeListenersRef = useRef<{
    move: (event: MouseEvent) => void;
    up: (event: MouseEvent) => void;
  } | null>(null);
  const multiDragRef = useRef<{
    anchorId: string;
    origins: Map<string, { x: number; y: number }>;
  } | null>(null);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const primarySelectedId = selectedIds[selectedIds.length - 1] ?? null;

  useEffect(() => {
    if (!open) return;
    setState(mermaidToCanvasState(normalizeMermaidSource(mermaid)));
    setSelectedIds([]);
    setConnectFromId(null);
    setConnectorDraft(null);
    setConnectHoverId(null);
    setEdgeLabel("");
    setMode("select");
    setSelectedPreset(null);
  }, [open, mermaid]);

  useEffect(() => {
    if (!open) return;
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(320, Math.floor(rect.width)),
        height: Math.max(240, Math.floor(rect.height)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, leftPanel.width, rightPanel.width, leftPanelCollapsed, rightPanelCollapsed]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (mode === "place") {
          setMode("select");
          setSelectedPreset(null);
          return;
        }
        onClose();
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.length > 0) {
        const target = event.target as HTMLElement | null;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
        event.preventDefault();
        const remove = new Set(selectedIds);
        setState((current) => ({
          nodes: current.nodes.filter((node) => !remove.has(node.id)),
          edges: current.edges.filter(
            (edge) => !remove.has(edge.fromId) && !remove.has(edge.toId),
          ),
        }));
        setSelectedIds([]);
        setConnectFromId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, onClose, open, selectedIds]);

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage || mode !== "select" || connectorDraft) {
      transformer?.nodes([]);
      transformer?.getLayer()?.batchDraw();
      return;
    }
    if (selectedIds.length !== 1) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }
    const node = stage.findOne(`#canvas-node-${selectedIds[0]}`);
    if (node) {
      transformer.nodes([node]);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  }, [mode, selectedIds, state.nodes, connectorDraft]);

  const getStagePointerFromClient = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current;
    const container = containerRef.current;
    if (!stage || !container) return null;
    const rect = container.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const getStagePointerFromWindowEvent = useCallback((event: MouseEvent) => {
    const stage = stageRef.current;
    if (!stage) return null;
    stage.setPointersPositions(event);
    return stage.getPointerPosition();
  }, []);

  const cleanupMarqueeListeners = useCallback(() => {
    const listeners = marqueeListenersRef.current;
    if (!listeners) return;
    window.removeEventListener("mousemove", listeners.move);
    window.removeEventListener("mouseup", listeners.up, true);
    marqueeListenersRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupMarqueeListeners();
    };
  }, [cleanupMarqueeListeners]);

  useEffect(() => {
    if (!connectorDraft) return;

    const onPointerMove = (event: MouseEvent) => {
      const pointer = getStagePointerFromClient(event.clientX, event.clientY);
      if (!pointer) return;
      setConnectorDraft((current) =>
        current
          ? { ...current, pointerX: pointer.x, pointerY: pointer.y }
          : null,
      );
      const hover = findNodeAtPoint(
        stateRef.current.nodes,
        pointer,
        connectorDraft.fromNodeId,
      );
      setConnectHoverId(hover?.id ?? null);
    };

    const onPointerUp = (event: MouseEvent) => {
      const draft = connectorDraft;
      const pointer = getStagePointerFromClient(event.clientX, event.clientY);
      if (!pointer || !draft) {
        setConnectorDraft(null);
        setConnectHoverId(null);
        return;
      }

      const target = findNodeAtPoint(stateRef.current.nodes, pointer, draft.fromNodeId);
      if (target) {
        const toAnchor = getNearestConnectorAnchor(target, pointer);
        setState((current) => {
          const exists = current.edges.some(
            (edge) => edge.fromId === draft.fromNodeId && edge.toId === target.id,
          );
          if (exists) return current;
          return {
            ...current,
            edges: [
              ...current.edges,
              {
                id: `edge_${Date.now()}`,
                fromId: draft.fromNodeId,
                toId: target.id,
                fromAnchor: draft.fromAnchor,
                toAnchor,
                label: edgeLabel.trim() || undefined,
              },
            ],
          };
        });
      }

      setConnectorDraft(null);
      setConnectHoverId(null);
      setEdgeLabel("");
    };

    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    return () => {
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
    };
  }, [connectorDraft, edgeLabel, getStagePointerFromClient]);

  const finishMarqueeGesture = useCallback(
    (event: MouseEvent) => {
      const pointer = getStagePointerFromWindowEvent(event);
      const start = marqueeStartRef.current;
      marqueeActiveRef.current = false;
      marqueeStartRef.current = null;
      setMarqueeRect(null);

      if (!pointer || !start) return;

      const finalRect: SelectionRect = {
        x: start.x,
        y: start.y,
        width: pointer.x - start.x,
        height: pointer.y - start.y,
      };
      const box = normalizeSelectionRect(finalRect);
      const isClick =
        box.width < MARQUEE_CLICK_THRESHOLD && box.height < MARQUEE_CLICK_THRESHOLD;
      const hits = findNodesInSelectionRect(stateRef.current.nodes, finalRect);

      if (hits.length === 0) {
        if (isClick && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
          canvasPointerHandledRef.current = true;
          setSelectedIds([]);
          setConnectFromId(null);
        }
        return;
      }

      marqueeCompletedRef.current = true;
      suppressNodeClickRef.current = true;
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      const hitIds = hits.map((node) => node.id);
      setSelectedIds((current) => {
        if (!additive) return hitIds;
        const merged = new Set(current);
        for (const id of hitIds) merged.add(id);
        return [...merged];
      });
      setConnectFromId(null);
    },
    [getStagePointerFromWindowEvent],
  );

  const handleConnectorDragStart = useCallback(
    (
      nodeId: string,
      anchor: ConnectorAnchor,
      event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ) => {
      const stage = event.target.getStage();
      const node = state.nodes.find((item) => item.id === nodeId);
      if (!stage || !node) return;
      const start = getConnectorAnchorStagePosition(node, anchor);
      const pointer = stage.getPointerPosition() ?? start;
      setConnectorDraft({
        fromNodeId: nodeId,
        fromAnchor: anchor,
        startX: start.x,
        startY: start.y,
        pointerX: pointer.x,
        pointerY: pointer.y,
      });
      setConnectFromId(null);
      setConnectHoverId(null);
    },
    [state.nodes],
  );

  const updateNode = useCallback((nodeId: string, patch: Partial<PlanDiagramCanvasNode>) => {
    setState((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
    }));
  }, []);

  const updateEdge = useCallback((edgeId: string, patch: Partial<PlanDiagramCanvasEdge>) => {
    setState((current) => ({
      ...current,
      edges: current.edges.map((edge) => (edge.id === edgeId ? { ...edge, ...patch } : edge)),
    }));
  }, []);

  const deleteEdge = useCallback((edgeId: string) => {
    setState((current) => ({
      ...current,
      edges: current.edges.filter((edge) => edge.id !== edgeId),
    }));
  }, []);

  const placePreset = useCallback(
    (preset: PlanDiagramShapePreset, x: number, y: number) => {
      const next = createCanvasNodeFromPreset(preset, x, y, state.nodes.length);
      setState((current) => ({ ...current, nodes: [...current.nodes, next] }));
      setSelectedIds([next.id]);
      setMode("select");
      setSelectedPreset(null);
      setConnectFromId(null);
    },
    [state.nodes.length],
  );

  const handleCanvasMouseDown = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isCanvasBackgroundTarget(event.target)) return;
    if (mode !== "select" || connectorDraft) return;

    const stage = event.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    cleanupMarqueeListeners();
    canvasPointerHandledRef.current = false;
    marqueeCompletedRef.current = false;
    marqueeActiveRef.current = true;
    marqueeStartRef.current = { x: pointer.x, y: pointer.y };
    setMarqueeRect({ x: pointer.x, y: pointer.y, width: 0, height: 0 });

    const onPointerMove = (moveEvent: MouseEvent) => {
      const movePointer = getStagePointerFromWindowEvent(moveEvent);
      const start = marqueeStartRef.current;
      if (!movePointer || !start) return;
      setMarqueeRect({
        x: start.x,
        y: start.y,
        width: movePointer.x - start.x,
        height: movePointer.y - start.y,
      });
    };

    const onPointerUp = (upEvent: MouseEvent) => {
      cleanupMarqueeListeners();
      finishMarqueeGesture(upEvent);
    };

    marqueeListenersRef.current = { move: onPointerMove, up: onPointerUp };
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp, true);
  };

  const handleCanvasClick = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isCanvasBackgroundTarget(event.target)) return;
    if (nodeDragMovedRef.current) {
      nodeDragMovedRef.current = false;
      return;
    }
    if (canvasPointerHandledRef.current) {
      canvasPointerHandledRef.current = false;
      return;
    }
    if (marqueeCompletedRef.current) {
      marqueeCompletedRef.current = false;
      return;
    }
    if (marqueeActiveRef.current) return;

    const stage = event.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if (mode === "connect") {
      setConnectFromId(null);
      return;
    }

    if (mode === "place" && selectedPreset) {
      placePreset(selectedPreset, pointer.x, pointer.y);
    }
  };

  const handleCanvasDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes(PLAN_DIAGRAM_PRESET_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOverCanvas(true);
  };

  const handleCanvasDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setIsDragOverCanvas(false);
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOverCanvas(false);
    const preset = getPresetFromDragData(event.dataTransfer);
    if (!preset || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    placePreset(preset, x, y);
  };

  const handleNodeSelect = (nodeId: string, additive = false) => {
    if (suppressNodeClickRef.current) {
      suppressNodeClickRef.current = false;
      return;
    }
    if (mode === "connect") {
      if (!connectFromId) {
        setConnectFromId(nodeId);
        return;
      }
      if (connectFromId !== nodeId) {
        const fromNode = state.nodes.find((node) => node.id === connectFromId);
        const toNode = state.nodes.find((node) => node.id === nodeId);
        const anchors =
          fromNode && toNode ? getBestAnchorsBetweenNodes(fromNode, toNode) : null;
        const exists = state.edges.some(
          (edge) => edge.fromId === connectFromId && edge.toId === nodeId,
        );
        if (!exists) {
          setState((current) => ({
            ...current,
            edges: [
              ...current.edges,
              {
                id: `edge_${Date.now()}`,
                fromId: connectFromId,
                toId: nodeId,
                fromAnchor: anchors?.fromAnchor,
                toAnchor: anchors?.toAnchor,
                label: edgeLabel.trim() || undefined,
              },
            ],
          }));
        }
      }
      setConnectFromId(null);
      setEdgeLabel("");
      setMode("select");
      return;
    }
    setSelectedIds((current) => {
      if (additive) {
        return current.includes(nodeId)
          ? current.filter((id) => id !== nodeId)
          : [...current, nodeId];
      }
      return [nodeId];
    });
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    const remove = new Set(selectedIds);
    setState((current) => ({
      nodes: current.nodes.filter((node) => !remove.has(node.id)),
      edges: current.edges.filter(
        (edge) => !remove.has(edge.fromId) && !remove.has(edge.toId),
      ),
    }));
    setSelectedIds([]);
  };

  const selectedNode = primarySelectedId
    ? state.nodes.find((node) => node.id === primarySelectedId) ?? null
    : null;
  const selectedNodes = useMemo(
    () => state.nodes.filter((node) => selectedIdSet.has(node.id)),
    [state.nodes, selectedIdSet],
  );
  const allDiagramSelected =
    selectedIds.length > 1 && selectedIds.length === state.nodes.length;

  const statusHint =
    mode === "connect"
      ? connectFromId
        ? "Pick target node"
        : "Pick source node"
      : mode === "place" && selectedPreset
        ? `Click canvas to place ${selectedPreset.label}, or drag from sidebar`
        : mode === "select"
          ? connectorDraft
            ? "Release on a shape to connect"
            : selectedIds.length > 1
              ? allDiagramSelected
                ? "Entire diagram selected · drag to move · Delete to remove"
                : `${selectedIds.length} shapes selected · drag to move together · Delete to remove`
              : primarySelectedId
                ? "Drag direction arrows to connect · corners to resize · drag shape to move"
                : "Drag on canvas to box-select · click shapes · Shift-click to multi-select"
          : "Click or drag a shape from the sidebar onto the canvas";

  const connectorPreview = useMemo(() => {
    if (!connectorDraft) return null;

    const sourceNode = state.nodes.find((node) => node.id === connectorDraft.fromNodeId);
    const start = sourceNode
      ? getConnectorAnchorStagePosition(sourceNode, connectorDraft.fromAnchor)
      : { x: connectorDraft.startX, y: connectorDraft.startY };

    const hoverNode = connectHoverId
      ? state.nodes.find((node) => node.id === connectHoverId) ?? null
      : null;

    if (hoverNode) {
      const toAnchor = getNearestConnectorAnchor(hoverNode, {
        x: connectorDraft.pointerX,
        y: connectorDraft.pointerY,
      });
      const end = getConnectorAnchorStagePosition(hoverNode, toAnchor);
      return {
        points: buildConnectorRoutePoints(start, end, connectorDraft.fromAnchor, toAnchor),
      };
    }

    const end = { x: connectorDraft.pointerX, y: connectorDraft.pointerY };
    return {
      points: buildConnectorRoutePoints(start, end, connectorDraft.fromAnchor),
    };
  }, [connectHoverId, connectorDraft, state.nodes]);

  const selectedEdge = useMemo(() => {
    if (!selectedNode) return null;
    return (
      state.edges.find((edge) => edge.fromId === selectedNode.id || edge.toId === selectedNode.id) ??
      null
    );
  }, [selectedNode, state.edges]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="plan-diagram-canvas-sheet fixed inset-0 z-[120] flex flex-col bg-background/95 backdrop-blur-sm">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
            <Waypoints className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Advanced diagram editor
            </p>
            <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onClose} className={cn(studioButtonSecondary("px-3 py-1.5 text-xs"))}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(normalizeMermaidSource(canvasStateToMermaid(state)))}
            className={cn(studioButtonPrimary("px-3 py-1.5 text-xs"))}
          >
            Save diagram
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close diagram editor"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <PlanDiagramCanvasPanel
          side="left"
          title="Shape library"
          icon={Shapes}
          width={leftPanel.width}
          collapsed={leftPanelCollapsed}
          onCollapsedChange={setLeftPanelCollapsed}
          onResizeStart={leftPanel.onResizeStart}
          resizable={!leftPanelCollapsed}
        >
          <PlanDiagramCanvasSidebar
            mode={mode}
            selectedPreset={selectedPreset}
            canDelete={selectedIds.length > 0}
            gridColumns={shapeGridColumns}
            onSelectMode={(next) => {
              setMode(next);
              setSelectedPreset(null);
              setConnectFromId(null);
            }}
            onSelectPreset={(preset) => {
              setSelectedPreset(preset);
              setMode("place");
              setConnectFromId(null);
            }}
            onDelete={deleteSelected}
          />
        </PlanDiagramCanvasPanel>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/50 px-4 py-2 text-[11px] text-muted-foreground">
            <span>Grid canvas</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{statusHint}</span>
            {mode === "connect" ? (
              <input
                value={edgeLabel}
                onChange={(event) => setEdgeLabel(event.target.value)}
                placeholder="Edge label (optional)"
                className={cn(
                  studioRadius,
                  "ml-auto border border-border/60 bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/40",
                )}
              />
            ) : null}
          </div>

          <div
            ref={containerRef}
            className={cn(
              "plan-diagram-canvas-grid relative min-h-0 flex-1 overflow-hidden bg-[color-mix(in_oklab,var(--background)_92%,var(--muted))]",
              isDragOverCanvas && "ring-2 ring-inset ring-primary/35",
            )}
            onDragOver={handleCanvasDragOver}
            onDragOverCapture={handleCanvasDragOver}
            onDragEnter={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
          >
            <Stage
              ref={stageRef}
              width={size.width}
              height={size.height}
              onMouseDown={handleCanvasMouseDown}
              onClick={handleCanvasClick}
              onTap={handleCanvasClick}
            >
              <Layer>
                <CanvasEdges nodes={state.nodes} edges={state.edges} />
                {connectorPreview ? (
                  <Arrow
                    points={connectorPreview.points}
                    stroke="#2563eb"
                    fill="#2563eb"
                    strokeWidth={2}
                    dash={[8, 6]}
                    lineCap="round"
                    lineJoin="round"
                    pointerLength={8}
                    pointerWidth={8}
                    listening={false}
                  />
                ) : null}
                {marqueeRect ? (
                  <Rect
                    x={marqueeRect.width < 0 ? marqueeRect.x + marqueeRect.width : marqueeRect.x}
                    y={marqueeRect.height < 0 ? marqueeRect.y + marqueeRect.height : marqueeRect.y}
                    width={Math.abs(marqueeRect.width)}
                    height={Math.abs(marqueeRect.height)}
                    fill="rgba(37, 99, 235, 0.08)"
                    stroke="#2563eb"
                    strokeWidth={1}
                    dash={[5, 4]}
                    listening={false}
                  />
                ) : null}
                {state.nodes.map((node) => (
                  <CanvasNodeShape
                    key={node.id}
                    node={node}
                    selected={selectedIdSet.has(node.id)}
                    showSelectionRing={selectedIdSet.has(node.id) && selectedIds.length > 1}
                    connectSource={connectFromId === node.id}
                    connectHover={connectHoverId === node.id}
                    draggable={!connectorDraft || connectorDraft.fromNodeId !== node.id}
                    onSelect={(additive) => handleNodeSelect(node.id, additive)}
                    onDragStart={() => {
                      nodeDragMovedRef.current = false;
                      if (selectedIdSet.has(node.id) && selectedIds.length > 1) {
                        const origins = new Map<string, { x: number; y: number }>();
                        for (const id of selectedIds) {
                          const item = stateRef.current.nodes.find((entry) => entry.id === id);
                          if (item) origins.set(id, { x: item.x, y: item.y });
                        }
                        multiDragRef.current = { anchorId: node.id, origins };
                      } else {
                        multiDragRef.current = null;
                      }
                    }}
                    onDragMove={(x, y) => {
                      nodeDragMovedRef.current = true;
                      const multi = multiDragRef.current;
                      if (multi && multi.anchorId === node.id) {
                        const origin = multi.origins.get(node.id);
                        if (!origin) return;
                        const dx = x - origin.x;
                        const dy = y - origin.y;
                        setState((current) => ({
                          ...current,
                          nodes: current.nodes.map((entry) => {
                            const start = multi.origins.get(entry.id);
                            if (!start) return entry;
                            return { ...entry, x: start.x + dx, y: start.y + dy };
                          }),
                        }));
                        return;
                      }
                      updateNode(node.id, { x, y });
                    }}
                    onDragEnd={() => {
                      multiDragRef.current = null;
                    }}
                  />
                ))}
                {mode === "select" && selectedIds.length > 1 && !connectorDraft ? (
                  <CanvasGroupSelectionChrome nodes={selectedNodes} count={selectedIds.length} />
                ) : null}
                {mode === "select" && selectedNode && selectedIds.length === 1 && !connectorDraft ? (
                  <CanvasNodeSelectionChrome
                    node={selectedNode}
                    onStartDrag={handleConnectorDragStart}
                  />
                ) : null}
                <Transformer
                  ref={transformerRef}
                  rotateEnabled={false}
                  padding={0}
                  enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 40 || newBox.height < 32) return oldBox;
                    return newBox;
                  }}
                  onTransform={() => {
                    const stage = stageRef.current;
                    const id = selectedIds[0];
                    if (!stage || !id) return;
                    const group = stage.findOne(`#canvas-node-${id}`) as Konva.Group | null;
                    if (!group) return;
                    const node = stateRef.current.nodes.find((item) => item.id === id);
                    if (!node) return;
                    const scaleX = group.scaleX();
                    const scaleY = group.scaleY();
                    updateNode(id, {
                      x: group.x(),
                      y: group.y(),
                      width: Math.max(40, node.width * scaleX),
                      height: Math.max(32, node.height * scaleY),
                    });
                    group.scaleX(1);
                    group.scaleY(1);
                  }}
                  onTransformEnd={() => {
                    const stage = stageRef.current;
                    const id = selectedIds[0];
                    if (!stage || !id) return;
                    const group = stage.findOne(`#canvas-node-${id}`) as Konva.Group | null;
                    if (!group) return;
                    group.scaleX(1);
                    group.scaleY(1);
                  }}
                />
              </Layer>
            </Stage>
          </div>
        </div>

        <PlanDiagramCanvasPanel
          side="right"
          title="Properties"
          icon={SlidersHorizontal}
          width={rightPanel.width}
          collapsed={rightPanelCollapsed}
          onCollapsedChange={setRightPanelCollapsed}
          onResizeStart={rightPanel.onResizeStart}
          resizable={!rightPanelCollapsed}
        >
          <PlanDiagramCanvasInspector
            nodes={state.nodes}
            edges={state.edges}
            selectedNode={selectedNode}
            selectedCount={selectedIds.length}
            selectedEdge={selectedEdge}
            onUpdateNode={updateNode}
            onUpdateEdge={updateEdge}
            onDeleteEdge={deleteEdge}
          />
        </PlanDiagramCanvasPanel>
      </div>
    </div>,
    document.body,
  );
}
