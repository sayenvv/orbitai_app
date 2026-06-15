"use client";

import { useEffect, useState } from "react";

import { PlanMermaidDiagram } from "@/components/plan/plan-mermaid-diagram";
import { studioRadius } from "@/components/studio/studio-ui";
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

type EditorProps = {
  deliverable: SynopsisDeliverable;
  content: PlanDeliverableContent;
  onChange: (content: PlanDeliverableContent) => void;
};

function DiagramEditor({
  content,
  onChange,
}: {
  content: PlanDiagramContent;
  onChange: (content: PlanDiagramContent) => void;
}) {
  const [debouncedSource, setDebouncedSource] = useState(
    normalizeMermaidSource(content.mermaid),
  );

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSource(normalizeMermaidSource(content.mermaid)),
      280,
    );
    return () => window.clearTimeout(timer);
  }, [content.mermaid]);

  const handleMermaidChange = (value: string) => {
    onChange({ format: "diagram", mermaid: normalizeMermaidSource(value) });
  };

  return (
    <div className="flex w-full flex-col">
      <div className="overflow-x-auto border-b border-border/60 bg-[#f6f8fa] dark:bg-[#0d1117]">
        <PlanMermaidDiagram source={debouncedSource} />
      </div>
      <div className="px-4 py-3 sm:px-5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Edit Mermaid
        </p>
        <textarea
          value={content.mermaid}
          onChange={(event) => handleMermaidChange(event.target.value)}
          rows={12}
          spellCheck={false}
          className={cn(
            studioRadius,
            "mt-2 w-full resize-y border border-border/60 bg-muted/10 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground outline-none focus:border-primary/40",
          )}
          placeholder="flowchart LR&#10;  start[Start] --> end[End]"
        />
      </div>
    </div>
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
  return (
    <div className="p-4 sm:p-5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {deliverable.id === "title" ? "Project title" : "Edit document"}
      </p>
      <textarea
        value={content.text}
        onChange={(event) => onChange({ format: "document", text: event.target.value })}
        rows={deliverable.id === "title" ? 2 : 16}
        className={cn(
          studioRadius,
          "mt-2 w-full resize-y border border-border/60 bg-muted/10 px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none focus:border-primary/40",
        )}
        placeholder="Write section content in Markdown…"
      />
    </div>
  );
}

function MatrixEditor({
  content,
  onChange,
}: {
  content: PlanMatrixContent;
  onChange: (content: PlanMatrixContent) => void;
}) {
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
    <div className="space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border/60">
              {content.headers.map((header, index) => (
                <th key={`header-${index}`} className="px-2 py-2">
                  <input
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
    </div>
  );
}

export function PlanDeliverableEditor({ deliverable, content, onChange }: EditorProps) {
  if (deliverable.format === "diagram") {
    const diagramContent =
      content.format === "diagram"
        ? content
        : coerceDiagramContent(deliverable, content, "");
    if (diagramContent.format === "diagram") {
      return <DiagramEditor content={diagramContent} onChange={onChange} />;
    }
  }
  if (content.format === "matrix") {
    return <MatrixEditor content={content} onChange={onChange} />;
  }
  return <DocumentEditor deliverable={deliverable} content={content} onChange={onChange} />;
}
