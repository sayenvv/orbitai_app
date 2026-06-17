"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";

import { ShapePreviewIcon } from "@/components/plan/plan-diagram-shape-preview";
import {
  getDefaultExpandedCategories,
  PLAN_DIAGRAM_QUICK_TOOLS,
  PLAN_DIAGRAM_SHAPE_CATEGORIES,
  setPresetDragData,
  type PlanDiagramShapePreset,
} from "@/lib/plan-diagram-shape-catalog";
import { cn } from "@/lib/utils";

type SidebarMode = "select" | "connect" | "place";

function ShapeGridItem({
  item,
  active,
  onSelectPreset,
}: {
  item: PlanDiagramShapePreset;
  active: boolean;
  onSelectPreset: (preset: PlanDiagramShapePreset) => void;
}) {
  return (
    <button
      type="button"
      draggable
      title={`${item.label} — click to place, or drag onto canvas`}
      onDragStart={(event) => {
        setPresetDragData(event.dataTransfer, item);
        event.dataTransfer.setData("text/plain", item.label);
      }}
      onClick={() => onSelectPreset(item)}
      className={cn(
        "flex aspect-square items-center justify-center rounded-md border p-1 transition-colors",
        active
          ? "border-primary/30 bg-primary/10 text-foreground ring-1 ring-primary/25"
          : "border-border/50 bg-background/80 text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground",
        "cursor-grab active:cursor-grabbing",
      )}
    >
      <ShapePreviewIcon preset={item} />
    </button>
  );
}

export function PlanDiagramCanvasSidebar({
  mode,
  selectedPreset,
  canDelete,
  gridColumns = 4,
  onSelectMode,
  onSelectPreset,
  onDelete,
}: {
  mode: SidebarMode;
  selectedPreset: PlanDiagramShapePreset | null;
  canDelete: boolean;
  gridColumns?: 4 | 5;
  onSelectMode: (mode: "select" | "connect") => void;
  onSelectPreset: (preset: PlanDiagramShapePreset) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(getDefaultExpandedCategories);

  const toggleSection = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-1 border-b border-border/50 p-2">
        <p className="px-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Tools
        </p>
        <div className="grid grid-cols-2 gap-1">
          {PLAN_DIAGRAM_QUICK_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const active = mode === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onSelectMode(tool.id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-[11px] font-medium transition-colors",
                  active
                    ? "border-border bg-background text-foreground shadow-sm"
                    : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                {tool.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={!canDelete}
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-35"
        >
          <Trash2 className="size-3.5" />
          Delete selected
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]">
        <p className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Shape library
        </p>
        <p className="mb-2 px-1 text-[10px] leading-snug text-muted-foreground/80">
          Click to place, or drag onto the canvas.
        </p>
        <div className="space-y-1.5">
          {PLAN_DIAGRAM_SHAPE_CATEGORIES.map((category) => {
            const isOpen = expanded.has(category.id);
            const Icon = category.icon;
            return (
              <div
                key={category.id}
                className="overflow-hidden rounded-md border border-border/50 bg-background/60"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(category.id)}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-muted/30"
                >
                  {isOpen ? (
                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">
                    {category.label}
                  </span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-px text-[9px] text-muted-foreground">
                    {category.items.length}
                  </span>
                </button>
                {isOpen ? (
                  <div
                    className={cn(
                      "grid gap-0.5 border-t border-border/40 p-1",
                      gridColumns === 5 ? "grid-cols-5" : "grid-cols-4",
                    )}
                  >
                    {category.items.map((item) => (
                      <ShapeGridItem
                        key={item.id}
                        item={item}
                        active={mode === "place" && selectedPreset?.id === item.id}
                        onSelectPreset={onSelectPreset}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
