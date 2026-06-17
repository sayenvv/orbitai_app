"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Pencil } from "lucide-react";

import { PlanDiagramViewport } from "@/components/plan/plan-diagram-viewport";
import { PlanMarkdownContent } from "@/components/plan/plan-markdown-content";
import { studioRadius, studioButtonSecondary } from "@/components/studio/studio-ui";
import {
  coerceDiagramContent,
  type PlanDeliverableContent,
  type PlanDiagramContent,
  type PlanDocumentContent,
  type PlanMatrixContent,
} from "@/lib/plan-deliverable-content";
import { normalizeMermaidSource } from "@/lib/normalize-mermaid-source";
import type { SynopsisDeliverable } from "@/lib/plan-synopsis-catalog";
import { cn } from "@/lib/utils";

const PlanDiagramCanvasSheet = dynamic(
  () =>
    import("@/components/plan/plan-diagram-canvas-sheet").then(
      (module) => module.PlanDiagramCanvasSheet,
    ),
  { ssr: false },
);

type EditorProps = {
  deliverable: SynopsisDeliverable;
  content: PlanDeliverableContent;
  onChange: (content: PlanDeliverableContent) => void;
};

function usePreviewEditMode(resetKey: string) {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setIsEditing(false);
  }, [resetKey]);

  const enterEdit = useCallback(() => setIsEditing(true), []);
  const exitEdit = useCallback(() => setIsEditing(false), []);

  return { isEditing, enterEdit, exitEdit };
}

function useClickOutsideExit(enabled: boolean, onExit: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (ref.current && target && !ref.current.contains(target)) {
        onExit();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onExit();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onExit]);

  return ref;
}

function PlanDeliverableModeFrame({
  resetKey,
  contentRevision,
  isEditing,
  onEnterEdit,
  onExitEdit,
  renderPreview,
  renderEditor,
  fill,
}: {
  resetKey: string;
  contentRevision?: string;
  isEditing: boolean;
  onEnterEdit: () => void;
  onExitEdit: () => void;
  renderPreview: (startEdit: () => void) => ReactNode;
  renderEditor: (editRef: RefObject<HTMLDivElement | null>) => ReactNode;
  fill?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameHeight, setFrameHeight] = useState<number | null>(null);
  const editRef = useClickOutsideExit(isEditing, () => {
    setFrameHeight(null);
    onExitEdit();
  });

  useEffect(() => {
    setFrameHeight(null);
  }, [resetKey]);

  useEffect(() => {
    if (!isEditing) {
      setFrameHeight(null);
    }
  }, [contentRevision, isEditing]);

  const startEdit = useCallback(() => {
    const height = frameRef.current?.getBoundingClientRect().height;
    if (height && height > 0) {
      setFrameHeight(Math.round(height));
    }
    onEnterEdit();
  }, [onEnterEdit]);

  const frameStyle =
    isEditing && frameHeight != null
      ? { height: frameHeight, minHeight: frameHeight }
      : undefined;

  return (
    <div
      ref={frameRef}
      style={frameStyle}
      className={cn(
        "flex flex-col",
        fill ? "min-h-0 flex-1" : "min-h-[160px]",
        isEditing && frameHeight != null ? "overflow-hidden" : fill ? "overflow-hidden" : "overflow-visible",
      )}
    >
      {isEditing ? renderEditor(editRef) : renderPreview(startEdit)}
    </div>
  );
}

function PlanPreviewSurface({
  onEdit,
  className,
  children,
  empty,
  emptyLabel = "Double-click to edit",
}: {
  onEdit: () => void;
  className?: string;
  children?: ReactNode;
  empty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onDoubleClick={onEdit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onEdit();
        }
      }}
      className={cn(
        "plan-ws-deliverable-preview flex w-full flex-col outline-none transition-colors",
        "rounded-sm hover:bg-muted/15 focus-visible:ring-2 focus-visible:ring-primary/20",
        className,
      )}
      title="Double-click to edit"
      aria-label="Double-click to edit"
    >
      {empty ? (
        <p className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground/55">
          {emptyLabel}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

function EditModeShell({
  editRef,
  label,
  children,
}: {
  editRef: RefObject<HTMLDivElement | null>;
  label: string;
  children: ReactNode;
}) {
  return (
    <div ref={editRef} className="flex h-full min-h-0 flex-col p-4 sm:p-5">
      <p className="mb-2 shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="min-h-0 flex-1">{children}</div>
      <p className="mt-2 shrink-0 text-[11px] text-muted-foreground/65">
        Click outside or press Esc to return to preview.
      </p>
    </div>
  );
}

function DiagramEditor({
  deliverableId,
  deliverableLabel,
  content,
  onChange,
}: {
  deliverableId: string;
  deliverableLabel: string;
  content: PlanDiagramContent;
  onChange: (content: PlanDiagramContent) => void;
}) {
  const { isEditing, enterEdit, exitEdit } = usePreviewEditMode(deliverableId);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const source = normalizeMermaidSource(content.mermaid);
  const isEmpty = !source.trim();
  const openCanvas = useCallback(() => setCanvasOpen(true), []);
  const closeCanvas = useCallback(() => setCanvasOpen(false), []);

  return (
    <>
      <PlanDeliverableModeFrame
        resetKey={deliverableId}
        contentRevision={source}
        isEditing={isEditing}
        onEnterEdit={enterEdit}
        onExitEdit={exitEdit}
        fill
        renderPreview={(startEdit) =>
          isEmpty ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <PlanPreviewSurface
                onEdit={startEdit}
                empty
                emptyLabel="Double-click to edit Mermaid source"
                className="plan-ws-diagram-canvas flex-1 p-4 sm:p-5"
              />
              <div className="flex shrink-0 justify-center border-t border-border/50 bg-muted/10 px-4 py-3">
                <button
                  type="button"
                  onClick={openCanvas}
                  className={cn(studioButtonSecondary("inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"))}
                >
                  <Pencil className="size-3.5" />
                  Open in editor
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <PlanDiagramViewport
                source={source}
                onEdit={startEdit}
                onOpenEditor={openCanvas}
                className="plan-ws-diagram-canvas min-h-0 flex-1"
                fill
                canvasLabel="Diagram"
              />
            </div>
          )
        }
        renderEditor={(editRef) => (
          <EditModeShell editRef={editRef} label="Edit diagram source">
            <textarea
              autoFocus
              value={content.mermaid}
              onChange={(event) =>
                onChange({ format: "diagram", mermaid: normalizeMermaidSource(event.target.value) })
              }
              spellCheck={false}
              className={cn(
                studioRadius,
                "h-full min-h-0 w-full resize-none overflow-y-auto border border-border/60 bg-muted/10 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground outline-none focus:border-primary/40",
              )}
              placeholder="flowchart LR&#10;  start[Start] --> end[End]"
            />
          </EditModeShell>
        )}
      />
      <PlanDiagramCanvasSheet
        open={canvasOpen}
        title={deliverableLabel}
        mermaid={content.mermaid}
        onSave={(nextMermaid) => {
          onChange({ format: "diagram", mermaid: nextMermaid });
          setCanvasOpen(false);
        }}
        onClose={closeCanvas}
      />
    </>
  );
}

function DocumentEditor({
  deliverable,
  content,
  onChange,
}: {
  deliverable: SynopsisDeliverable;
  content: PlanDocumentContent;
  onChange: (content: PlanDocumentContent) => void;
}) {
  const { isEditing, enterEdit, exitEdit } = usePreviewEditMode(deliverable.id);
  const isTitle = deliverable.id === "title";
  const text = content.text ?? "";
  const isEmpty = !text.trim();

  return (
    <PlanDeliverableModeFrame
      resetKey={deliverable.id}
      isEditing={isEditing}
      onEnterEdit={enterEdit}
      onExitEdit={exitEdit}
      renderPreview={(startEdit) => (
        <PlanPreviewSurface
          onEdit={startEdit}
          empty={isEmpty}
          emptyLabel={
            isTitle ? "Double-click to set the project title" : "Double-click to add content"
          }
          className="p-4 sm:p-5"
        >
          {!isEmpty ? (
            isTitle ? (
              <p className="text-lg font-semibold tracking-tight text-foreground">
                {text.trim()}
              </p>
            ) : (
              <div className="plan-ws-chat-turn-prose plan-ws-document-preview min-w-0">
                <PlanMarkdownContent content={text} />
              </div>
            )
          ) : null}
        </PlanPreviewSurface>
      )}
      renderEditor={(editRef) => (
        <EditModeShell
          editRef={editRef}
          label={isTitle ? "Project title" : "Edit content"}
        >
          <textarea
            autoFocus
            value={text}
            onChange={(event) => onChange({ format: "document", text: event.target.value })}
            className={cn(
              studioRadius,
              "h-full min-h-0 w-full resize-none overflow-y-auto border border-border/60 bg-muted/10 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-foreground outline-none focus:border-primary/40",
            )}
            placeholder={isTitle ? "Project title…" : "Write section content in Markdown…"}
          />
        </EditModeShell>
      )}
    />
  );
}

function MatrixEditor({
  deliverableId,
  content,
  onChange,
}: {
  deliverableId: string;
  content: PlanMatrixContent;
  onChange: (content: PlanMatrixContent) => void;
}) {
  const { isEditing, enterEdit, exitEdit } = usePreviewEditMode(deliverableId);
  const isEmpty =
    !content.headers.some((header) => header.trim()) &&
    !content.rows.some((row) => row.some((cell) => cell.trim()));

  const updateHeader = (index: number, value: string) => {
    const headers = [...content.headers];
    headers[index] = value;
    onChange({ ...content, headers });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const rows = content.rows.map((row) => [...row]);
    rows[rowIndex][colIndex] = value;
    onChange({ ...content, rows });
  };

  const addRow = () => {
    onChange({
      ...content,
      rows: [...content.rows, content.headers.map(() => "")],
    });
  };

  return (
    <PlanDeliverableModeFrame
      resetKey={deliverableId}
      isEditing={isEditing}
      onEnterEdit={enterEdit}
      onExitEdit={exitEdit}
      renderPreview={(startEdit) => (
        <PlanPreviewSurface
          onEdit={startEdit}
          empty={isEmpty}
          emptyLabel="Double-click to edit the matrix"
          className="p-4 sm:p-5"
        >
          {!isEmpty ? (
            <table className="w-full min-w-[480px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/60">
                  {content.headers.map((header, index) => (
                    <th
                      key={`preview-header-${index}`}
                      className="px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      {header || "—"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {content.rows.map((row, rowIndex) => (
                  <tr key={`preview-row-${rowIndex}`} className="border-b border-border/30">
                    {row.map((cell, colIndex) => (
                      <td
                        key={`preview-cell-${rowIndex}-${colIndex}`}
                        className="px-3 py-2 text-xs text-muted-foreground"
                      >
                        {cell || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </PlanPreviewSurface>
      )}
      renderEditor={(editRef) => (
        <div ref={editRef} className="flex h-full min-h-0 flex-col space-y-3 p-4 sm:p-5">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Edit matrix
            </p>
            <button
              type="button"
              onClick={addRow}
              className="text-[10px] font-medium text-primary hover:underline"
            >
              Add row
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <table className="w-full min-w-[480px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/60">
                  {content.headers.map((header, index) => (
                    <th key={`header-${index}`} className="px-2 py-2">
                      <input
                        autoFocus={index === 0}
                        value={header}
                        onChange={(event) => updateHeader(index, event.target.value)}
                        className={cn(
                          studioRadius,
                          "w-full border border-border/50 bg-background px-2 py-1.5 text-xs font-medium text-foreground outline-none focus:border-primary/40",
                        )}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {content.rows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`} className="border-b border-border/30">
                    {row.map((cell, colIndex) => (
                      <td key={`cell-${rowIndex}-${colIndex}`} className="px-2 py-2">
                        <input
                          value={cell}
                          onChange={(event) => updateCell(rowIndex, colIndex, event.target.value)}
                          className={cn(
                            studioRadius,
                            "w-full border border-border/40 bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/40",
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="shrink-0 text-[11px] text-muted-foreground/65">
            Click outside or press Esc to return to preview.
          </p>
        </div>
      )}
    />
  );
}

export function PlanDeliverableEditor({
  deliverable,
  content,
  onChange,
}: EditorProps) {
  if (deliverable.format === "diagram") {
    const diagramContent =
      content.format === "diagram"
        ? content
        : coerceDiagramContent(deliverable, content, "");
    if (diagramContent.format === "diagram") {
      return (
        <DiagramEditor
          deliverableId={deliverable.id}
          deliverableLabel={deliverable.label}
          content={diagramContent}
          onChange={onChange}
        />
      );
    }
  }
  if (content.format === "matrix") {
    return (
      <MatrixEditor deliverableId={deliverable.id} content={content} onChange={onChange} />
    );
  }
  return <DocumentEditor deliverable={deliverable} content={content} onChange={onChange} />;
}
