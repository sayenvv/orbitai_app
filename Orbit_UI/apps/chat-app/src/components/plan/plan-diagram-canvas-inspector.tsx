"use client";

import { studioRadius } from "@/components/studio/studio-ui";
import type {
  PlanDiagramCanvasEdge,
  PlanDiagramCanvasNode,
} from "@/lib/plan-diagram-canvas-mermaid";
import { cn } from "@/lib/utils";

export function PlanDiagramCanvasInspector({
  nodes,
  edges,
  selectedNode,
  selectedCount,
  selectedEdge,
  onUpdateNode,
  onUpdateEdge,
  onDeleteEdge,
}: {
  nodes: PlanDiagramCanvasNode[];
  edges: PlanDiagramCanvasEdge[];
  selectedNode: PlanDiagramCanvasNode | null;
  selectedCount: number;
  selectedEdge: PlanDiagramCanvasEdge | null;
  onUpdateNode: (nodeId: string, patch: Partial<PlanDiagramCanvasNode>) => void;
  onUpdateEdge: (edgeId: string, patch: Partial<PlanDiagramCanvasEdge>) => void;
  onDeleteEdge: (edgeId: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-2.5 [scrollbar-width:thin]">
      <section className="mb-4 space-y-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Canvas
        </p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md border border-border/50 bg-background/70 px-2 py-1.5">
            <p className="text-muted-foreground">Shapes</p>
            <p className="font-semibold text-foreground">{nodes.length}</p>
          </div>
          <div className="rounded-md border border-border/50 bg-background/70 px-2 py-1.5">
            <p className="text-muted-foreground">Connectors</p>
            <p className="font-semibold text-foreground">{edges.length}</p>
          </div>
        </div>
      </section>

      {selectedCount > 1 ? (
        <section className="mb-4 space-y-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Selection
          </p>
          <div className="rounded-md border border-primary/25 bg-primary/8 px-3 py-3 text-[11px] text-foreground">
            <p className="font-semibold text-primary">
              {selectedCount === nodes.length && nodes.length > 1
                ? "Entire diagram selected"
                : `${selectedCount} shapes selected`}
            </p>
            <p className="mt-1 text-muted-foreground">
              Drag any highlighted shape to move the group together, or press Delete to remove them.
            </p>
          </div>
        </section>
      ) : selectedNode ? (
        <section className="mb-4 space-y-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Selected shape
          </p>
          <label className="block space-y-1">
            <span className="text-[10px] text-muted-foreground">Label</span>
            <input
              value={selectedNode.label}
              onChange={(event) => onUpdateNode(selectedNode.id, { label: event.target.value })}
              placeholder="Optional label"
              className={cn(
                studioRadius,
                "w-full border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/40",
              )}
            />
          </label>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
            <div className="rounded-md border border-border/40 bg-background/60 px-2 py-1.5">
              W {Math.round(selectedNode.width)} · H {Math.round(selectedNode.height)}
            </div>
            <div className="rounded-md border border-border/40 bg-background/60 px-2 py-1.5">
              X {Math.round(selectedNode.x)} · Y {Math.round(selectedNode.y)}
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-4 rounded-md border border-dashed border-border/50 bg-background/40 px-3 py-4 text-center text-[11px] text-muted-foreground">
          Select a shape to edit its properties.
        </section>
      )}

      <section className="space-y-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Connectors
        </p>
        {edges.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No connectors yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {edges.map((edge) => {
              const active = selectedEdge?.id === edge.id;
              const from = nodes.find((node) => node.id === edge.fromId);
              const to = nodes.find((node) => node.id === edge.toId);
              return (
                <li
                  key={edge.id}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-[11px]",
                    active
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/50 bg-background/60",
                  )}
                >
                  <p className="truncate font-medium text-foreground">
                    {from?.label?.trim() || from?.id || edge.fromId}
                    {" → "}
                    {to?.label?.trim() || to?.id || edge.toId}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <input
                      value={edge.label ?? ""}
                      onChange={(event) =>
                        onUpdateEdge(edge.id, {
                          label: event.target.value.trim() || undefined,
                        })
                      }
                      placeholder="Label"
                      className={cn(
                        studioRadius,
                        "min-w-0 flex-1 border border-border/50 bg-background px-1.5 py-0.5 text-[10px] outline-none focus:border-primary/40",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => onDeleteEdge(edge.id)}
                      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
