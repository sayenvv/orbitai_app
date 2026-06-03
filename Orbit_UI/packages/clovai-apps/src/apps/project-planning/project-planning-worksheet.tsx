"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, ExternalLink, ImageIcon } from "lucide-react";
import type { PlanningArtifact } from "./project-planning-catalog";
import { cn } from "./project-planning-dashboard-ui";
import {
  renderRichText,
  wrapSelectionWithColor,
  wrapSelectionWithLink,
} from "./project-planning-worksheet-format";
import {
  readWorksheetTextSelection,
  type WorksheetTextSelection,
} from "./project-planning-worksheet-selection";

export type { WorksheetTextSelection } from "./project-planning-worksheet-selection";

export type WorksheetTextBlockType = "heading" | "paragraph" | "caption";

export type WorksheetTextBlock = {
  id: string;
  type: WorksheetTextBlockType;
  text: string;
};

export type WorksheetFlowNode = {
  id: string;
  text: string;
};

export type WorksheetFlowchartBlock = {
  id: string;
  type: "flowchart";
  nodes: WorksheetFlowNode[];
};

export type WorksheetMatrixBlock = {
  id: string;
  type: "matrix";
  headers: string[];
  rows: string[][];
};

export type WorksheetTableBlock = {
  id: string;
  type: "table";
  headers: string[];
  rows: string[][];
};

export type WorksheetLinkBlock = {
  id: string;
  type: "link";
  label: string;
  url: string;
};

export type WorksheetImageBlock = {
  id: string;
  type: "image";
  url: string;
  alt: string;
  caption?: string;
};

export type WorksheetBlock =
  | WorksheetTextBlock
  | WorksheetFlowchartBlock
  | WorksheetMatrixBlock
  | WorksheetTableBlock
  | WorksheetLinkBlock
  | WorksheetImageBlock;

export type PlanningWorksheetContent = {
  blocks: WorksheetBlock[];
};

export function makeWorksheetBlockId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function blockId(prefix: string): string {
  return makeWorksheetBlockId(prefix);
}

export type WorksheetToolId =
  | "paragraph"
  | "heading"
  | "link"
  | "image"
  | "table"
  | "flowchart"
  | "matrix"
  | "flow-node"
  | "table-row"
  | "matrix-row"
  | "format-link"
  | "color-emphasis"
  | "color-muted"
  | "color-accent"
  | "remove-last";

export type WorksheetToolOptions = {
  selection?: WorksheetTextSelection | null;
  url?: string;
  color?: string;
};

function findLastFlowchart(blocks: WorksheetBlock[]): WorksheetFlowchartBlock | undefined {
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i];
    if (block?.type === "flowchart") return block;
  }
  return undefined;
}

function findLastMatrix(blocks: WorksheetBlock[]): WorksheetMatrixBlock | undefined {
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i];
    if (block?.type === "matrix") return block;
  }
  return undefined;
}

function findLastTable(blocks: WorksheetBlock[]): WorksheetTableBlock | undefined {
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i];
    if (block?.type === "table") return block;
  }
  return undefined;
}

function isTextBlock(block: WorksheetBlock): block is WorksheetTextBlock {
  return block.type === "heading" || block.type === "paragraph" || block.type === "caption";
}

const FORMAT_COLORS: Record<"color-emphasis" | "color-muted" | "color-accent", string> = {
  "color-emphasis": "#0f172a",
  "color-muted": "#64748b",
  "color-accent": "#2563eb",
};

export function getWorksheetToolAvailability(
  content: PlanningWorksheetContent,
  selection?: WorksheetTextSelection | null,
): Record<WorksheetToolId, boolean> {
  const blocks = content.blocks;
  const flow = findLastFlowchart(blocks);
  const matrix = findLastMatrix(blocks);
  const table = findLastTable(blocks);
  const hasFlowchart = blocks.some((b) => b.type === "flowchart");
  const hasMatrix = blocks.some((b) => b.type === "matrix");
  const hasSelection = Boolean(selection?.selectedText.trim());
  const selectionOnTextBlock = Boolean(
    selection && blocks.some((b) => b.id === selection.blockId && isTextBlock(b)),
  );

  return {
    paragraph: true,
    heading: true,
    link: true,
    image: true,
    table: true,
    flowchart: !hasFlowchart,
    matrix: !hasMatrix,
    "flow-node": Boolean(flow && flow.nodes.length < 12),
    "table-row": Boolean(table && table.rows.length < 24),
    "matrix-row": Boolean(matrix && matrix.rows.length < 20),
    "format-link": hasSelection && selectionOnTextBlock,
    "color-emphasis": hasSelection && selectionOnTextBlock,
    "color-muted": hasSelection && selectionOnTextBlock,
    "color-accent": hasSelection && selectionOnTextBlock,
    "remove-last": blocks.length > 1,
  };
}

export function applyWorksheetTool(
  content: PlanningWorksheetContent,
  toolId: WorksheetToolId,
  options: WorksheetToolOptions = {},
): PlanningWorksheetContent {
  if (!getWorksheetToolAvailability(content, options.selection)[toolId]) return content;

  const blocks = [...content.blocks];

  if (toolId === "paragraph") {
    blocks.push({
      id: blockId("paragraph"),
      type: "paragraph",
      text: "",
    });
    return { blocks };
  }

  if (toolId === "heading") {
    blocks.push({
      id: blockId("heading"),
      type: "heading",
      text: "Section",
    });
    return { blocks };
  }

  if (toolId === "flowchart") {
    blocks.push(defaultFlowchartBlock());
    return { blocks };
  }

  if (toolId === "matrix") {
    blocks.push(defaultMatrixBlock());
    return { blocks };
  }

  if (toolId === "link") {
    blocks.push({
      id: blockId("link"),
      type: "link",
      label: "Link label",
      url: "https://",
    });
    return { blocks };
  }

  if (toolId === "image") {
    blocks.push({
      id: blockId("image"),
      type: "image",
      url: "",
      alt: "Image",
      caption: "",
    });
    return { blocks };
  }

  if (toolId === "table") {
    blocks.push(defaultTableBlock());
    return { blocks };
  }

  if (toolId === "format-link" && options.selection && options.url?.trim()) {
    const sel = options.selection;
    return {
      blocks: blocks.map((block) =>
        block.id === sel.blockId && isTextBlock(block)
          ? {
              ...block,
              text: wrapSelectionWithLink(block.text, sel.start, sel.end, options.url!.trim()),
            }
          : block,
      ),
    };
  }

  if (
    (toolId === "color-emphasis" || toolId === "color-muted" || toolId === "color-accent") &&
    options.selection
  ) {
    const sel = options.selection;
    const color = options.color ?? FORMAT_COLORS[toolId];
    return {
      blocks: blocks.map((block) =>
        block.id === sel.blockId && isTextBlock(block)
          ? {
              ...block,
              text: wrapSelectionWithColor(block.text, sel.start, sel.end, color),
            }
          : block,
      ),
    };
  }

  if (toolId === "flow-node") {
    const flow = findLastFlowchart(blocks);
    if (!flow) return content;
    return {
      blocks: blocks.map((block) =>
        block.id === flow.id && block.type === "flowchart"
          ? {
              ...block,
              nodes: [...block.nodes, { id: blockId("node"), text: "Step" }],
            }
          : block,
      ),
    };
  }

  if (toolId === "matrix-row") {
    const matrix = findLastMatrix(blocks);
    if (!matrix) return content;
    const emptyRow = matrix.headers.map(() => "");
    return {
      blocks: blocks.map((block) =>
        block.id === matrix.id && block.type === "matrix"
          ? { ...block, rows: [...block.rows, emptyRow] }
          : block,
      ),
    };
  }

  if (toolId === "table-row") {
    const table = findLastTable(blocks);
    if (!table) return content;
    const emptyRow = table.headers.map(() => "");
    return {
      blocks: blocks.map((block) =>
        block.id === table.id && block.type === "table"
          ? { ...block, rows: [...block.rows, emptyRow] }
          : block,
      ),
    };
  }

  if (toolId === "remove-last") {
    return { blocks: blocks.slice(0, -1) };
  }

  return content;
}

export function getWorksheetTitle(content: PlanningWorksheetContent, fallback: string): string {
  const heading = content.blocks.find(
    (block): block is WorksheetTextBlock => block.type === "heading",
  );
  const title = heading?.text.trim();
  return title || fallback;
}

function defaultTextBlocks(artifact: PlanningArtifact): WorksheetTextBlock[] {
  return [
    { id: blockId("heading"), type: "heading", text: artifact.label },
    { id: blockId("paragraph"), type: "paragraph", text: artifact.description },
    {
      id: blockId("paragraph"),
      type: "paragraph",
      text: "Double-click any text to edit. Add paragraphs, notes, and detail as you work through this deliverable.",
    },
  ];
}

function defaultFlowchartBlock(): WorksheetFlowchartBlock {
  return {
    id: blockId("flow"),
    type: "flowchart",
    nodes: [
      { id: blockId("node"), text: "Start" },
      { id: blockId("node"), text: "Process" },
      { id: blockId("node"), text: "Decision" },
      { id: blockId("node"), text: "Outcome" },
    ],
  };
}

function defaultMatrixBlock(): WorksheetMatrixBlock {
  return {
    id: blockId("matrix"),
    type: "matrix",
    headers: ["Criteria", "Option A", "Option B"],
    rows: [
      ["Weight", "", ""],
      ["Score", "", ""],
      ["Notes", "", ""],
    ],
  };
}

function defaultTableBlock(): WorksheetTableBlock {
  return {
    id: blockId("table"),
    type: "table",
    headers: ["Column 1", "Column 2", "Column 3"],
    rows: [
      ["", "", ""],
      ["", "", ""],
    ],
  };
}

export function createDefaultWorksheetContent(artifact: PlanningArtifact): PlanningWorksheetContent {
  const blocks: WorksheetBlock[] = [...defaultTextBlocks(artifact)];

  if (artifact.format === "diagram") {
    blocks.push(defaultFlowchartBlock());
  } else if (artifact.format === "matrix") {
    blocks.push(defaultMatrixBlock());
  }

  return { blocks };
}

type TextSelectionRange = { start: number; end: number };

const WORD_CHAR = /[\p{L}\p{N}_'-]/u;

function getTextOffsetFromClick(element: HTMLElement, clientX: number, clientY: number): number {
  const doc = element.ownerDocument;
  const range =
    doc.caretRangeFromPoint?.(clientX, clientY) ??
    (() => {
      const caret = doc.caretPositionFromPoint?.(clientX, clientY);
      if (!caret) return null;
      const r = doc.createRange();
      r.setStart(caret.offsetNode, caret.offset);
      r.collapse(true);
      return r;
    })();
  if (!range || !element.contains(range.startContainer)) return 0;

  const pre = doc.createRange();
  pre.selectNodeContents(element);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

function getWordRangeAtOffset(text: string, offset: number): TextSelectionRange {
  const index = Math.max(0, Math.min(offset, text.length));
  if (text.length === 0) return { start: 0, end: 0 };

  let start = index;
  let end = index;

  if (index < text.length && WORD_CHAR.test(text[index] ?? "")) {
    while (start > 0 && WORD_CHAR.test(text[start - 1] ?? "")) start -= 1;
    while (end < text.length && WORD_CHAR.test(text[end] ?? "")) end += 1;
    return { start, end };
  }

  if (index > 0 && WORD_CHAR.test(text[index - 1] ?? "")) {
    end = index;
    start = index - 1;
    while (start > 0 && WORD_CHAR.test(text[start - 1] ?? "")) start -= 1;
    return { start, end };
  }

  return { start: index, end: Math.min(index + 1, text.length) };
}

type WorksheetInlineTextProps = {
  blockId: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSelectionChange?: (selection: WorksheetTextSelection | null) => void;
  richDisplay?: boolean;
  className?: string;
  as?: "h1" | "p" | "span";
  multiline?: boolean;
};

function WorksheetInlineText({
  blockId,
  value,
  placeholder,
  onChange,
  onSelectionChange,
  richDisplay = false,
  className,
  as: Tag = "p",
  multiline = true,
}: WorksheetInlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pendingSelection, setPendingSelection] = useState<TextSelectionRange | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    const el = areaRef.current;
    if (!el) return;
    el.focus();
    const range = pendingSelection ?? { start: el.value.length, end: el.value.length };
    el.setSelectionRange(range.start, range.end);
    setPendingSelection(null);
  }, [editing, pendingSelection]);

  const beginEditing = useCallback(
    (element: HTMLElement, clientX: number, clientY: number) => {
      if (!value.trim()) {
        setPendingSelection({ start: 0, end: 0 });
        setEditing(true);
        return;
      }
      const offset = getTextOffsetFromClick(element, clientX, clientY);
      setPendingSelection(getWordRangeAtOffset(value, offset));
      setEditing(true);
    },
    [value],
  );

  const commit = useCallback(() => {
    onChange(draft);
    setEditing(false);
  }, [draft, onChange]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  };

  const reportSelection = useCallback(() => {
    if (!onSelectionChange) return;
    onSelectionChange(readWorksheetTextSelection(blockId, value));
  }, [blockId, onSelectionChange, value]);

  if (editing) {
    return (
      <textarea
        ref={areaRef}
        value={draft}
        rows={multiline ? Math.max(2, draft.split("\n").length) : 1}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={cn(
          "w-full resize-none bg-transparent text-foreground",
          "border-0 border-b border-foreground/20 pb-0.5",
          "focus:outline-none focus:border-foreground/40",
          "placeholder:text-muted-foreground/50",
          className,
        )}
        placeholder={placeholder}
      />
    );
  }

  const empty = !value.trim();

  return (
    <Tag
      data-worksheet-block-id={blockId}
      onMouseDown={(e) => {
        if (e.detail >= 2) e.preventDefault();
      }}
      onMouseUp={reportSelection}
      onKeyUp={reportSelection}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.getSelection()?.removeAllRanges();
        onSelectionChange?.(null);
        beginEditing(e.currentTarget, e.clientX, e.clientY);
      }}
      title="Select text for tools & AI · double-click a word to edit"
      className={cn(
        "cursor-text whitespace-pre-wrap select-text",
        empty && "text-muted-foreground/60 italic",
        className,
      )}
    >
      {empty ? placeholder : richDisplay ? renderRichText(value, blockId) : value}
    </Tag>
  );
}

function updateTextBlock(
  blocks: WorksheetBlock[],
  blockId: string,
  text: string,
): WorksheetBlock[] {
  return blocks.map((block) =>
    block.id === blockId && isTextBlock(block) ? { ...block, text } : block,
  );
}

function updateLinkBlock(
  blocks: WorksheetBlock[],
  blockId: string,
  patch: Partial<Pick<WorksheetLinkBlock, "label" | "url">>,
): WorksheetBlock[] {
  return blocks.map((block) =>
    block.id === blockId && block.type === "link" ? { ...block, ...patch } : block,
  );
}

function updateImageBlock(
  blocks: WorksheetBlock[],
  blockId: string,
  patch: Partial<Pick<WorksheetImageBlock, "url" | "alt" | "caption">>,
): WorksheetBlock[] {
  return blocks.map((block) =>
    block.id === blockId && block.type === "image" ? { ...block, ...patch } : block,
  );
}

function updateTableHeader(
  blocks: WorksheetBlock[],
  blockId: string,
  colIndex: number,
  text: string,
): WorksheetBlock[] {
  return blocks.map((block) => {
    if (block.id !== blockId || block.type !== "table") return block;
    const headers = [...block.headers];
    headers[colIndex] = text;
    return { ...block, headers };
  });
}

function updateTableCell(
  blocks: WorksheetBlock[],
  blockId: string,
  rowIndex: number,
  colIndex: number,
  text: string,
): WorksheetBlock[] {
  return blocks.map((block) => {
    if (block.id !== blockId || block.type !== "table") return block;
    const rows = block.rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? text : cell)) : row,
    );
    return { ...block, rows };
  });
}

function updateFlowNode(
  blocks: WorksheetBlock[],
  blockId: string,
  nodeId: string,
  text: string,
): WorksheetBlock[] {
  return blocks.map((block) => {
    if (block.id !== blockId || block.type !== "flowchart") return block;
    return {
      ...block,
      nodes: block.nodes.map((node) => (node.id === nodeId ? { ...node, text } : node)),
    };
  });
}

function updateMatrixHeader(
  blocks: WorksheetBlock[],
  blockId: string,
  colIndex: number,
  text: string,
): WorksheetBlock[] {
  return blocks.map((block) => {
    if (block.id !== blockId || block.type !== "matrix") return block;
    const headers = [...block.headers];
    headers[colIndex] = text;
    return { ...block, headers };
  });
}

function updateMatrixCell(
  blocks: WorksheetBlock[],
  blockId: string,
  rowIndex: number,
  colIndex: number,
  text: string,
): WorksheetBlock[] {
  return blocks.map((block) => {
    if (block.id !== blockId || block.type !== "matrix") return block;
    const rows = block.rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? text : cell)) : row,
    );
    return { ...block, rows };
  });
}

function WorksheetTextBlockView({
  block,
  onTextChange,
  onSelectionChange,
}: {
  block: WorksheetTextBlock;
  onTextChange: (text: string) => void;
  onSelectionChange?: (selection: WorksheetTextSelection | null) => void;
}) {
  const common = {
    blockId: block.id,
    value: block.text,
    onChange: onTextChange,
    onSelectionChange,
  };

  if (block.type === "heading") {
    return (
      <WorksheetInlineText
        {...common}
        as="h1"
        placeholder="Title"
        multiline={false}
        className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
      />
    );
  }
  if (block.type === "caption") {
    return (
      <WorksheetInlineText
        {...common}
        as="p"
        placeholder="Caption"
        richDisplay
        className="text-xs text-muted-foreground"
      />
    );
  }
  return (
    <WorksheetInlineText
      {...common}
      as="p"
      placeholder="Write here…"
      richDisplay
      className="text-[15px] leading-[1.75] text-foreground/90"
    />
  );
}

function WorksheetFlowchartView({
  block,
  onNodeTextChange,
}: {
  block: WorksheetFlowchartBlock;
  onNodeTextChange: (nodeId: string, text: string) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 py-4 md:gap-3"
      role="img"
      aria-label="Flowchart"
    >
      {block.nodes.map((node, index) => (
        <div key={node.id} className="flex items-center gap-2 md:gap-3">
          <div
            className={cn(
              "min-w-[6.5rem] max-w-[11rem] rounded-lg border border-border/70 bg-muted/15 px-4 py-3 text-center shadow-sm",
              "transition-colors hover:border-border",
            )}
          >
            <WorksheetInlineText
              blockId={`${block.id}-${node.id}`}
              as="span"
              value={node.text}
              placeholder="Label"
              onChange={(text) => onNodeTextChange(node.id, text)}
              multiline={false}
              className="block text-sm font-medium text-foreground"
            />
          </div>
          {index < block.nodes.length - 1 ? (
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function WorksheetMatrixView({
  block,
  onHeaderChange,
  onCellChange,
}: {
  block: WorksheetMatrixBlock;
  onHeaderChange: (colIndex: number, text: string) => void;
  onCellChange: (rowIndex: number, colIndex: number, text: string) => void;
}) {
  return (
    <div className="overflow-x-auto py-2">
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <thead>
          <tr>
            {block.headers.map((header, colIndex) => (
              <th
                key={`h-${colIndex}`}
                className="border border-border/60 bg-muted/20 px-3 py-2 text-left font-semibold text-foreground"
              >
                <WorksheetInlineText
                  blockId={`${block.id}-h-${colIndex}`}
                  as="span"
                  value={header}
                  placeholder="Column"
                  onChange={(text) => onHeaderChange(colIndex, text)}
                  multiline={false}
                  className="text-sm font-semibold"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={`r-${rowIndex}`}>
              {row.map((cell, colIndex) => (
                <td
                  key={`c-${colIndex}`}
                  className="border border-border/50 px-3 py-2 align-top text-foreground/90"
                >
                  <WorksheetInlineText
                    blockId={`${block.id}-r-${rowIndex}-c-${colIndex}`}
                    as="span"
                    value={cell}
                    placeholder="—"
                    onChange={(text) => onCellChange(rowIndex, colIndex, text)}
                    multiline
                    className="text-sm leading-snug"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorksheetTableView({
  block,
  onHeaderChange,
  onCellChange,
}: {
  block: WorksheetTableBlock;
  onHeaderChange: (colIndex: number, text: string) => void;
  onCellChange: (rowIndex: number, colIndex: number, text: string) => void;
}) {
  return (
    <div className="overflow-x-auto py-2">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Table</p>
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <thead>
          <tr>
            {block.headers.map((header, colIndex) => (
              <th
                key={`h-${colIndex}`}
                className="border border-border/60 bg-muted/15 px-3 py-2 text-left font-semibold text-foreground"
              >
                <WorksheetInlineText
                  blockId={`${block.id}-h-${colIndex}`}
                  as="span"
                  value={header}
                  placeholder="Column"
                  onChange={(text) => onHeaderChange(colIndex, text)}
                  multiline={false}
                  className="text-sm font-semibold"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={`r-${rowIndex}`}>
              {row.map((cell, colIndex) => (
                <td
                  key={`c-${colIndex}`}
                  className="border border-border/50 px-3 py-2 align-top text-foreground/90"
                >
                  <WorksheetInlineText
                    blockId={`${block.id}-r-${rowIndex}-c-${colIndex}`}
                    as="span"
                    value={cell}
                    placeholder="—"
                    onChange={(text) => onCellChange(rowIndex, colIndex, text)}
                    multiline
                    className="text-sm leading-snug"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorksheetLinkBlockView({
  block,
  onChange,
}: {
  block: WorksheetLinkBlock;
  onChange: (patch: Partial<Pick<WorksheetLinkBlock, "label" | "url">>) => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 px-4 py-3">
      <div className="flex items-start gap-2">
        <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <WorksheetInlineText
            blockId={`${block.id}-label`}
            as="span"
            value={block.label}
            placeholder="Link label"
            onChange={(label) => onChange({ label })}
            multiline={false}
            className="block text-sm font-semibold text-foreground"
          />
          <WorksheetInlineText
            blockId={`${block.id}-url`}
            as="span"
            value={block.url}
            placeholder="https://"
            onChange={(url) => onChange({ url })}
            multiline={false}
            className="block break-all text-xs text-muted-foreground"
          />
          {block.url.trim() ? (
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-xs font-medium text-foreground underline underline-offset-2"
            >
              Open link
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WorksheetImageBlockView({
  block,
  onChange,
}: {
  block: WorksheetImageBlock;
  onChange: (patch: Partial<Pick<WorksheetImageBlock, "url" | "alt" | "caption">>) => void;
}) {
  const hasUrl = Boolean(block.url.trim());

  return (
    <figure className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" aria-hidden />
        Image
      </div>
      <div className="overflow-hidden rounded-lg border border-border/50 bg-muted/10">
        {hasUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={block.url} alt={block.alt || "Worksheet image"} className="max-h-80 w-full object-contain" />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Paste an image URL below
          </div>
        )}
      </div>
      <WorksheetInlineText
        blockId={`${block.id}-url`}
        as="p"
        value={block.url}
        placeholder="Image URL"
        onChange={(url) => onChange({ url })}
        multiline={false}
        className="text-xs text-muted-foreground"
      />
      <WorksheetInlineText
        blockId={`${block.id}-alt`}
        as="p"
        value={block.alt}
        placeholder="Alt text"
        onChange={(alt) => onChange({ alt })}
        multiline={false}
        className="text-xs text-muted-foreground"
      />
      <WorksheetInlineText
        blockId={`${block.id}-caption`}
        as="p"
        value={block.caption ?? ""}
        placeholder="Caption (optional)"
        onChange={(caption) => onChange({ caption })}
        richDisplay
        className="text-xs text-muted-foreground"
      />
    </figure>
  );
}

type PlanningDeliverableWorksheetProps = {
  content: PlanningWorksheetContent;
  onChange: (content: PlanningWorksheetContent) => void;
  selection?: WorksheetTextSelection | null;
  onSelectionChange?: (selection: WorksheetTextSelection | null) => void;
};

export function PlanningDeliverableWorksheet({
  content,
  onChange,
  selection: _selection,
  onSelectionChange,
}: PlanningDeliverableWorksheetProps) {
  const setBlocks = (blocks: WorksheetBlock[]) => onChange({ blocks });

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-6"
      data-worksheet-canvas=""
      onMouseDown={() => {
        const sel = window.getSelection();
        if (sel && !sel.toString().trim()) onSelectionChange?.(null);
      }}
    >
      {content.blocks.map((block) => {
        if (block.type === "heading" || block.type === "paragraph" || block.type === "caption") {
          return (
            <WorksheetTextBlockView
              key={block.id}
              block={block}
              onTextChange={(text) => setBlocks(updateTextBlock(content.blocks, block.id, text))}
              onSelectionChange={onSelectionChange}
            />
          );
        }
        if (block.type === "link") {
          return (
            <WorksheetLinkBlockView
              key={block.id}
              block={block}
              onChange={(patch) => setBlocks(updateLinkBlock(content.blocks, block.id, patch))}
            />
          );
        }
        if (block.type === "image") {
          return (
            <WorksheetImageBlockView
              key={block.id}
              block={block}
              onChange={(patch) => setBlocks(updateImageBlock(content.blocks, block.id, patch))}
            />
          );
        }
        if (block.type === "table") {
          return (
            <WorksheetTableView
              key={block.id}
              block={block}
              onHeaderChange={(colIndex, text) =>
                setBlocks(updateTableHeader(content.blocks, block.id, colIndex, text))
              }
              onCellChange={(rowIndex, colIndex, text) =>
                setBlocks(updateTableCell(content.blocks, block.id, rowIndex, colIndex, text))
              }
            />
          );
        }
        if (block.type === "flowchart") {
          return (
            <WorksheetFlowchartView
              key={block.id}
              block={block}
              onNodeTextChange={(nodeId, text) =>
                setBlocks(updateFlowNode(content.blocks, block.id, nodeId, text))
              }
            />
          );
        }
        if (block.type === "matrix") {
          return (
            <WorksheetMatrixView
              key={block.id}
              block={block}
              onHeaderChange={(colIndex, text) =>
                setBlocks(updateMatrixHeader(content.blocks, block.id, colIndex, text))
              }
              onCellChange={(rowIndex, colIndex, text) =>
                setBlocks(updateMatrixCell(content.blocks, block.id, rowIndex, colIndex, text))
              }
            />
          );
        }
        return null;
      })}
    </div>
  );
}
