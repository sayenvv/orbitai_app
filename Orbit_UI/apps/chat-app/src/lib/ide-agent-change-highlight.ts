import {
  RangeSet,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  GutterMarker,
  WidgetType,
  gutter,
  type DecorationSet,
} from "@codemirror/view";
import {
  buildLineDiff,
  computeRemovedBlocks,
  getHighlightedNewLines,
  splitLines,
} from "@/lib/agent-change-diff";

export type AgentChangeHighlightPayload = {
  previousContent: string;
  newContent: string;
  /** Currently focused added line (for navigation emphasis). */
  focusedAddedLine?: number | null;
} | null;

export const setAgentChangeHighlight = StateEffect.define<AgentChangeHighlightPayload>();

type AgentChangeHighlightState = {
  previousContent: string | null;
  newContent: string | null;
  focusedAddedLine: number | null;
  decorations: DecorationSet;
};

const emptyHighlightState: AgentChangeHighlightState = {
  previousContent: null,
  newContent: null,
  focusedAddedLine: null,
  decorations: Decoration.none,
};

class AddedLineGutterMarker extends GutterMarker {
  constructor(readonly lineNumber: number) {
    super();
  }

  eq(other: AddedLineGutterMarker) {
    return other.lineNumber === this.lineNumber;
  }

  toDOM() {
    const wrap = document.createElement("div");
    wrap.className = "cm-agent-diff-gutter-added";
    wrap.setAttribute("aria-label", `Added line ${this.lineNumber}`);

    const sign = document.createElement("span");
    sign.className = "cm-agent-diff-gutter-sign-add";
    sign.textContent = "+";

    const line = document.createElement("span");
    line.className = "cm-agent-diff-gutter-line-num";
    line.textContent = String(this.lineNumber);

    wrap.appendChild(sign);
    wrap.appendChild(line);
    return wrap;
  }
}

class DiffGutterSpacer extends GutterMarker {
  toDOM() {
    return document.createElement("span");
  }
}

class RemovedLinesWidget extends WidgetType {
  constructor(readonly lines: string[]) {
    super();
  }

  eq(other: RemovedLinesWidget) {
    return other.lines.join("\u0000") === this.lines.join("\u0000");
  }

  toDOM() {
    const block = document.createElement("div");
    block.className = "cm-agent-change-removed-block";
    block.setAttribute("contenteditable", "false");

    for (const line of this.lines) {
      const row = document.createElement("div");
      row.className = "cm-agent-change-removed-line";

      const sign = document.createElement("span");
      sign.className = "cm-agent-change-removed-sign";
      sign.textContent = "−";

      const text = document.createElement("span");
      text.className = "cm-agent-change-removed-text";
      text.textContent = line.length > 0 ? line : " ";

      row.appendChild(sign);
      row.appendChild(text);
      block.appendChild(row);
    }

    return block;
  }

  ignoreEvent() {
    return true;
  }
}

function widgetPosition(state: EditorState, beforeLine: number): number {
  const doc = state.doc;
  if (doc.lines === 0) return 0;
  if (beforeLine <= 1) return doc.line(1).from;
  if (beforeLine > doc.lines) return doc.length;
  return doc.line(beforeLine).from;
}

function buildDecorationSet(
  state: EditorState,
  previousContent: string,
  newContent: string,
  focusedAddedLine: number | null,
): DecorationSet {
  const diff = buildLineDiff(previousContent, newContent);
  const addedLines = new Set(getHighlightedNewLines(diff));
  const removedBlocks = computeRemovedBlocks(diff);
  const targetLineCount = splitLines(newContent).length;

  const marks: Array<{ from: number; value: Decoration; sort: number }> = [];

  for (const block of removedBlocks) {
    marks.push({
      from: widgetPosition(state, block.beforeLine),
      sort: 0,
      value: Decoration.widget({
        widget: new RemovedLinesWidget(block.lines),
        block: true,
        side: -1,
      }),
    });
  }

  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
    const line = state.doc.line(lineNumber);
    if (addedLines.has(lineNumber)) {
      if (targetLineCount > 0 && lineNumber > targetLineCount) continue;
      const isFocused = focusedAddedLine === lineNumber;
      marks.push({
        from: line.from,
        sort: 1,
        value: Decoration.line({
          class: isFocused ? "cm-agent-change-added cm-agent-change-added-focus" : "cm-agent-change-added",
        }),
      });
      continue;
    }

    marks.push({
      from: line.from,
      sort: 2,
      value: Decoration.line({ class: "cm-agent-change-context" }),
    });
  }

  marks.sort((a, b) => a.from - b.from || a.sort - b.sort);
  return Decoration.set(
    marks.map((mark) => mark.value.range(mark.from)),
    true,
  );
}

function buildDiffGutterMarkers(state: EditorState) {
  const highlight = state.field(agentChangeHighlightField, false);
  if (highlight?.previousContent === null || highlight?.previousContent === undefined) {
    return RangeSet.empty;
  }

  const targetContent = highlight.newContent ?? state.doc.toString();
  const diff = buildLineDiff(highlight.previousContent, targetContent);
  const addedLines = new Set(getHighlightedNewLines(diff));
  const builder = new RangeSetBuilder<GutterMarker>();

  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
    if (!addedLines.has(lineNumber)) continue;
    const line = state.doc.line(lineNumber);
    builder.add(line.from, line.from, new AddedLineGutterMarker(lineNumber));
  }

  return builder.finish();
}

const agentChangeHighlightField = StateField.define<AgentChangeHighlightState>({
  create() {
    return emptyHighlightState;
  },
  update(state, tr) {
    let previousContent = state.previousContent;
    let newContent = state.newContent;
    let focusedAddedLine = state.focusedAddedLine;

    for (const effect of tr.effects) {
      if (effect.is(setAgentChangeHighlight)) {
        if (effect.value === null) {
          previousContent = null;
          newContent = null;
          focusedAddedLine = null;
        } else {
          previousContent = effect.value.previousContent;
          newContent = effect.value.newContent;
          focusedAddedLine = effect.value.focusedAddedLine ?? null;
        }
      }
    }

    if (previousContent === null) {
      return emptyHighlightState;
    }

    const targetContent = newContent ?? tr.state.doc.toString();
    if (
      tr.docChanged ||
      previousContent !== state.previousContent ||
      newContent !== state.newContent ||
      focusedAddedLine !== state.focusedAddedLine
    ) {
      return {
        previousContent,
        newContent,
        focusedAddedLine,
        decorations: buildDecorationSet(
          tr.state,
          previousContent,
          targetContent,
          focusedAddedLine,
        ),
      };
    }

    return state;
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

const diffSignGutter = gutter({
  class: "cm-agent-diff-gutter",
  markers: (view) => buildDiffGutterMarkers(view.state),
  initialSpacer: () => new DiffGutterSpacer(),
});

const agentChangeDiffTheme = EditorView.baseTheme({
  ".cm-agent-diff-gutter": {
    width: "2.35rem",
    minWidth: "2.35rem",
    backgroundColor: "rgba(46, 160, 67, 0.04)",
    borderRight: "1px solid rgba(46, 160, 67, 0.12)",
  },
  ".cm-agent-diff-gutter .cm-gutterElement": {
    padding: "0 4px 0 0",
    textAlign: "center",
  },
  ".cm-agent-diff-gutter-added": {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1px",
    lineHeight: "1.1",
  },
  ".cm-agent-diff-gutter-sign-add": {
    color: "#1a7f37",
    fontWeight: "800",
    fontSize: "10px",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
  },
  ".cm-agent-diff-gutter-line-num": {
    color: "rgba(26, 127, 55, 0.72)",
    fontSize: "9px",
    fontWeight: "600",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
  },
  ".cm-line.cm-agent-change-added": {
    backgroundColor: "rgba(46, 160, 67, 0.18) !important",
    boxShadow: "inset 3px 0 0 rgba(46, 160, 67, 0.9)",
  },
  ".cm-line.cm-agent-change-added-focus": {
    backgroundColor: "rgba(46, 160, 67, 0.28) !important",
    boxShadow:
      "inset 3px 0 0 rgba(46, 160, 67, 1), inset 0 0 0 1px rgba(46, 160, 67, 0.25)",
  },
  ".cm-line.cm-agent-change-context": {
    opacity: "0.42",
  },
  ".cm-agent-change-removed-block": {
    margin: "0",
    padding: "0",
  },
  ".cm-agent-change-removed-line": {
    display: "flex",
    alignItems: "stretch",
    minHeight: "1.55em",
    backgroundColor: "rgba(248, 81, 73, 0.12)",
    boxShadow: "inset 3px 0 0 rgba(207, 34, 46, 0.85)",
    color: "#82071e",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
    fontSize: "inherit",
    lineHeight: "1.55",
    whiteSpace: "pre",
  },
  ".cm-agent-change-removed-sign": {
    flex: "0 0 1.35rem",
    textAlign: "center",
    color: "#cf222e",
    fontWeight: "700",
    userSelect: "none",
  },
  ".cm-agent-change-removed-text": {
    flex: "1 1 auto",
    paddingRight: "16px",
    textDecoration: "line-through",
    textDecorationColor: "rgba(207, 34, 46, 0.45)",
    opacity: "0.92",
  },
  ".dark .cm-agent-diff-gutter-sign-add, html.dark .cm-agent-diff-gutter-sign-add": {
    color: "#3fb950",
  },
  ".dark .cm-agent-diff-gutter-line-num, html.dark .cm-agent-diff-gutter-line-num": {
    color: "rgba(63, 185, 80, 0.75)",
  },
  ".dark .cm-agent-diff-gutter, html.dark .cm-agent-diff-gutter": {
    backgroundColor: "rgba(63, 185, 80, 0.05)",
    borderRightColor: "rgba(63, 185, 80, 0.14)",
  },
  ".dark .cm-line.cm-agent-change-added, html.dark .cm-line.cm-agent-change-added": {
    backgroundColor: "rgba(63, 185, 80, 0.2) !important",
    boxShadow: "inset 3px 0 0 rgba(63, 185, 80, 0.95)",
  },
  ".dark .cm-line.cm-agent-change-added-focus, html.dark .cm-line.cm-agent-change-added-focus": {
    backgroundColor: "rgba(63, 185, 80, 0.32) !important",
    boxShadow:
      "inset 3px 0 0 rgba(63, 185, 80, 1), inset 0 0 0 1px rgba(63, 185, 80, 0.3)",
  },
  ".dark .cm-line.cm-agent-change-context, html.dark .cm-line.cm-agent-change-context": {
    opacity: "0.38",
  },
  ".dark .cm-agent-change-removed-line, html.dark .cm-agent-change-removed-line": {
    backgroundColor: "rgba(248, 81, 73, 0.14)",
    boxShadow: "inset 3px 0 0 rgba(248, 81, 73, 0.85)",
    color: "#ffaba8",
  },
  ".dark .cm-agent-change-removed-sign, html.dark .cm-agent-change-removed-sign": {
    color: "#f85149",
  },
});

export const agentChangeHighlightExtension: Extension = [
  agentChangeHighlightField,
  agentChangeDiffTheme,
  diffSignGutter,
];

export function reconfigureAgentChangeHighlight(
  view: EditorView | null,
  payload: AgentChangeHighlightPayload,
): void {
  if (!view) return;
  view.dispatch({
    effects: setAgentChangeHighlight.of(payload),
  });
}
