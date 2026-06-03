"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Bot,
  GitBranch,
  Heading2,
  ImageIcon,
  Link2,
  Palette,
  Plus,
  Table2,
  Text,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { PlanningArtifact, PlanningArtifactFormat } from "./project-planning-catalog";
import {
  applyWorksheetTool,
  getWorksheetToolAvailability,
  type PlanningWorksheetContent,
  type WorksheetToolId,
  type WorksheetTextSelection,
} from "./project-planning-worksheet";
import { cn, studioMono } from "./project-planning-dashboard-ui";

type ToolButtonProps = {
  icon: LucideIcon;
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick: () => void;
};

function WorksheetToolTooltip({
  label,
  hint,
  side = "left",
  enabled = true,
  centerTrigger = false,
  children,
}: {
  label: string;
  hint?: string;
  side?: "left" | "top";
  enabled?: boolean;
  centerTrigger?: boolean;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const showTooltip = useCallback(() => {
    if (!enabled) return;
    const node = triggerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (side === "top") {
      setPosition({ top: rect.top - 8, left: rect.left + rect.width / 2 });
      return;
    }
    setPosition({ top: rect.top + rect.height / 2, left: rect.left - 10 });
  }, [enabled, side]);

  const hideTooltip = useCallback(() => setPosition(null), []);

  const tooltip =
    enabled && position && typeof document !== "undefined"
      ? createPortal(
          <div
            role="tooltip"
            style={{ top: position.top, left: position.left }}
            className={cn(
              "pointer-events-none fixed z-[200] max-w-[12rem] rounded-lg border border-border/50 bg-popover px-2.5 py-1.5 shadow-md",
              side === "top" ? "-translate-x-1/2 -translate-y-full" : "-translate-x-full -translate-y-1/2",
            )}
          >
            <span className="block text-xs font-semibold text-foreground">{label}</span>
            {hint ? (
              <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{hint}</span>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={triggerRef}
        className={cn(
          "relative",
          centerTrigger ? "flex w-full justify-center" : side === "top" ? "w-full" : "w-full shrink-0",
        )}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {tooltip}
    </>
  );
}

function WorksheetToolButton({
  icon: Icon,
  label,
  hint,
  disabled,
  onClick,
}: ToolButtonProps) {
  return (
    <WorksheetToolTooltip
      label={label}
      hint={disabled ? `${hint ?? label} (unavailable)` : hint}
      side="top"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={hint ?? label}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-border/50 bg-background px-2 py-2.5 text-center transition-colors",
          "hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-40",
        )}
      >
        <Icon className="h-4 w-4 text-foreground" strokeWidth={1.75} />
        <span className="text-[10px] font-medium leading-tight text-foreground">{label}</span>
      </button>
    </WorksheetToolTooltip>
  );
}

function WorksheetToolIconButton({
  icon: Icon,
  label,
  hint,
  disabled,
  onClick,
}: ToolButtonProps) {
  return (
    <WorksheetToolTooltip
      label={label}
      hint={disabled ? `${hint ?? label} (unavailable)` : hint}
      side="left"
      centerTrigger
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={hint ?? label}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors",
          "hover:bg-muted/50 hover:text-foreground",
          "disabled:pointer-events-none disabled:opacity-35",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      </button>
    </WorksheetToolTooltip>
  );
}

const TOOL_META: Record<
  WorksheetToolId,
  { icon: LucideIcon; label: string; hint: string; group: "text" | "media" | "structure" | "format" | "edit" }
> = {
  paragraph: {
    icon: Text,
    label: "Paragraph",
    hint: "Add a paragraph block",
    group: "text",
  },
  heading: {
    icon: Heading2,
    label: "Heading",
    hint: "Add a section heading",
    group: "text",
  },
  link: {
    icon: Link2,
    label: "Link",
    hint: "Insert a link block",
    group: "media",
  },
  image: {
    icon: ImageIcon,
    label: "Image",
    hint: "Insert an image block",
    group: "media",
  },
  table: {
    icon: Table2,
    label: "Table",
    hint: "Insert a data table",
    group: "structure",
  },
  flowchart: {
    icon: GitBranch,
    label: "Flow",
    hint: "Add a flowchart",
    group: "structure",
  },
  matrix: {
    icon: Table2,
    label: "Matrix",
    hint: "Add a decision matrix",
    group: "structure",
  },
  "format-link": {
    icon: Link2,
    label: "Link text",
    hint: "Wrap selection as a link",
    group: "format",
  },
  "color-emphasis": {
    icon: Palette,
    label: "Dark",
    hint: "Apply dark color to selection",
    group: "format",
  },
  "color-muted": {
    icon: Palette,
    label: "Muted",
    hint: "Apply muted color to selection",
    group: "format",
  },
  "color-accent": {
    icon: Palette,
    label: "Accent",
    hint: "Apply accent color to selection",
    group: "format",
  },
  "flow-node": {
    icon: Plus,
    label: "Node",
    hint: "Add a flowchart step",
    group: "edit",
  },
  "table-row": {
    icon: Plus,
    label: "Row",
    hint: "Add a table row",
    group: "edit",
  },
  "matrix-row": {
    icon: Plus,
    label: "Row",
    hint: "Add a matrix row",
    group: "edit",
  },
  "remove-last": {
    icon: Trash2,
    label: "Remove",
    hint: "Remove the last block",
    group: "edit",
  },
};

function toolsForFormat(format: PlanningArtifactFormat): WorksheetToolId[] {
  const base: WorksheetToolId[] = [
    "paragraph",
    "heading",
    "link",
    "image",
    "table",
    "format-link",
    "color-emphasis",
    "color-muted",
    "color-accent",
  ];
  if (format === "diagram") {
    return [...base, "flowchart", "flow-node", "table-row", "remove-last"];
  }
  if (format === "matrix") {
    return [...base, "matrix", "matrix-row", "table-row", "remove-last"];
  }
  return [...base, "flowchart", "matrix", "flow-node", "matrix-row", "table-row", "remove-last"];
}

type PlanningWorksheetToolsPanelProps = {
  artifact: PlanningArtifact;
  content: PlanningWorksheetContent;
  onChange: (content: PlanningWorksheetContent) => void;
  onOpenAiChat?: () => void;
  collapsed?: boolean;
  selection?: WorksheetTextSelection | null;
  onSelectionClear?: () => void;
};

export function PlanningWorksheetToolsPanel({
  artifact,
  content,
  onChange,
  onOpenAiChat,
  collapsed = false,
  selection = null,
}: PlanningWorksheetToolsPanelProps) {
  const availability = getWorksheetToolAvailability(content, selection);
  const toolIds = toolsForFormat(artifact.format);

  const run = (toolId: WorksheetToolId) => {
    if (toolId === "format-link") {
      const url = window.prompt("Link URL", "https://");
      if (!url?.trim()) return;
      onChange(applyWorksheetTool(content, toolId, { selection, url }));
      return;
    }
    if (toolId === "color-emphasis" || toolId === "color-muted" || toolId === "color-accent") {
      onChange(applyWorksheetTool(content, toolId, { selection }));
      return;
    }
    onChange(applyWorksheetTool(content, toolId, { selection }));
  };

  const selectionSnippet =
    selection?.selectedText.trim().slice(0, 80) ??
    (selection?.selectedText ? selection.selectedText : "");

  const renderTool = (toolId: WorksheetToolId, compact: boolean) => {
    const meta = TOOL_META[toolId];
    const enabled = availability[toolId];
    const props = {
      icon: meta.icon,
      label: meta.label,
      hint: meta.hint,
      disabled: !enabled,
      onClick: () => run(toolId),
    };
    return compact ? (
      <WorksheetToolIconButton key={toolId} {...props} />
    ) : (
      <WorksheetToolButton key={toolId} {...props} />
    );
  };

  if (collapsed) {
    const insertIds = toolIds.filter(
      (id) => TOOL_META[id].group === "text" || TOOL_META[id].group === "media" || TOOL_META[id].group === "structure",
    );
    const formatIds = toolIds.filter((id) => TOOL_META[id].group === "format");
    const editIds = toolIds.filter((id) => TOOL_META[id].group === "edit");

    return (
      <div className="flex w-full flex-col items-center gap-1 px-1 py-2">
        {selectionSnippet ? (
          <p
            className="mb-1 max-w-[2.5rem] truncate text-center text-[8px] leading-tight text-muted-foreground"
            title={selection?.selectedText}
          >
            Sel
          </p>
        ) : null}
        {insertIds.map((id) => renderTool(id, true))}
        <div className="my-0.5 h-px w-7 bg-border/50" aria-hidden />
        {formatIds.map((id) => renderTool(id, true))}
        <div className="my-0.5 h-px w-7 bg-border/50" aria-hidden />
        {editIds.map((id) => renderTool(id, true))}
        {onOpenAiChat ? (
          <>
            <div className="my-0.5 h-px w-7 bg-border/50" aria-hidden />
            <WorksheetToolIconButton
              icon={Bot}
              label="AI assistant"
              hint="Chat to edit this deliverable"
              onClick={onOpenAiChat}
            />
          </>
        ) : null}
      </div>
    );
  }

  const groups: Array<{ title: string; ids: WorksheetToolId[] }> = [
    {
      title: "Insert",
      ids: toolIds.filter(
        (id) =>
          TOOL_META[id].group === "text" || TOOL_META[id].group === "media" || TOOL_META[id].group === "structure",
      ),
    },
    {
      title: "Selection",
      ids: toolIds.filter((id) => TOOL_META[id].group === "format"),
    },
    { title: "Edit", ids: toolIds.filter((id) => TOOL_META[id].group === "edit") },
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tools</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Select text on the canvas, then format or ask AI
        </p>
      </div>

      {selection?.selectedText.trim() ? (
        <div className={cn("rounded-md border border-border/50 px-2.5 py-2", studioMono.accentSoft)}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Selected</p>
          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-foreground">
            &ldquo;{selection.selectedText.trim()}&rdquo;
          </p>
        </div>
      ) : (
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Highlight text in a paragraph or heading to enable link and color tools.
        </p>
      )}

      {groups.map((group) =>
        group.ids.length === 0 ? null : (
          <div key={group.title}>
            <p className="mb-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {group.title}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {group.ids.map((toolId) => renderTool(toolId, false))}
            </div>
          </div>
        ),
      )}

      {onOpenAiChat ? (
        <WorksheetToolTooltip
          label="AI assistant"
          hint="Uses your text selection as context when provided"
          side="top"
        >
          <button
            type="button"
            onClick={onOpenAiChat}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg border border-border/50 px-3 py-2.5 text-xs font-medium transition-colors",
              studioMono.accent,
              "hover:opacity-90",
            )}
          >
            <Bot className="h-4 w-4" />
            Chat with AI
          </button>
        </WorksheetToolTooltip>
      ) : null}

      <p className={cn("rounded-md px-2 py-1.5 text-[10px] leading-relaxed", studioMono.accentSoft)}>
        Double-click a word to edit inline. Selection is sent to AI when you chat.
      </p>
    </div>
  );
}
