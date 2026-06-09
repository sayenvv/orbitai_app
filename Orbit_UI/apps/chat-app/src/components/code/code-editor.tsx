"use client";

import { useEffect, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { indentWithTab } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { DEFAULT_CODE_WORKSPACE_PREFERENCES } from "@/lib/code-workspace-preferences";
import { useTheme } from "next-themes";
import { getIdeCodeMirrorLanguage } from "@/lib/ide-codemirror-extensions";
import type { IdeCursorPosition } from "@/lib/ide-cursor";
import { cn } from "@/lib/utils";

type CodeEditorProps = {
  value: string;
  language?: string;
  onChange: (value: string) => void;
  onCursorChange?: (cursor: IdeCursorPosition, selectionChars: number) => void;
  tabSize?: number;
  fontSize?: number;
  wordWrap?: boolean;
  lineNumbers?: boolean;
  scrollToLine?: number | null;
  onScrollToLineComplete?: () => void;
  className?: string;
};

const IDE_EDITOR_DARK_BG = "#0d1117";
const IDE_EDITOR_DARK_GUTTER = "#010409";

function ideEditorTheme(isDark: boolean, fontSize: number): Extension {
  return EditorView.theme(
    {
      "&": {
        backgroundColor: isDark ? IDE_EDITOR_DARK_BG : "transparent",
        height: "100%",
        fontSize: `${fontSize}px`,
      },
      "&.cm-focused": {
        outline: "none",
      },
      ".cm-scroller": {
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        lineHeight: "1.55",
        backgroundColor: isDark ? IDE_EDITOR_DARK_BG : "transparent",
      },
      ".cm-content": {
        padding: "12px 16px",
        fontSize: `${fontSize}px`,
        caretColor: isDark
          ? "#e6edf3"
          : "color-mix(in oklab, var(--foreground) 92%, transparent)",
      },
      ".cm-gutters": {
        backgroundColor: isDark
          ? IDE_EDITOR_DARK_GUTTER
          : "color-mix(in oklab, var(--ide-surface-muted) 80%, transparent)",
        borderRight: isDark
          ? "1px solid rgb(255 255 255 / 0.08)"
          : "1px solid var(--ide-border-subtle)",
        color: isDark ? "rgb(255 255 255 / 0.38)" : "var(--ide-text-muted)",
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        fontSize: "11.5px",
        lineHeight: "1.55",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        padding: "0 8px",
        minWidth: "2.75rem",
      },
      ".cm-activeLineGutter": {
        backgroundColor: isDark
          ? "rgb(255 255 255 / 0.06)"
          : "color-mix(in oklab, var(--primary) 8%, transparent)",
        color: isDark ? "rgb(255 255 255 / 0.62)" : "color-mix(in oklab, var(--foreground) 72%, transparent)",
      },
      "&.cm-focused .cm-cursor": {
        borderLeftColor: isDark
          ? "#e6edf3"
          : "color-mix(in oklab, var(--foreground) 92%, transparent)",
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: isDark
          ? "rgb(56 139 253 / 0.35) !important"
          : "color-mix(in oklab, var(--primary) 28%, transparent) !important",
      },
      ".cm-panels": {
        backgroundColor: isDark ? IDE_EDITOR_DARK_BG : "var(--ide-surface)",
        color: isDark ? "#e6edf3" : "var(--foreground)",
      },
    },
    { dark: isDark },
  );
}

export function CodeEditor({
  value,
  language = "text",
  onChange,
  onCursorChange,
  tabSize = DEFAULT_CODE_WORKSPACE_PREFERENCES.tabSize,
  fontSize = DEFAULT_CODE_WORKSPACE_PREFERENCES.fontSize,
  wordWrap = DEFAULT_CODE_WORKSPACE_PREFERENCES.wordWrap,
  lineNumbers = DEFAULT_CODE_WORKSPACE_PREFERENCES.lineNumbers,
  scrollToLine = null,
  onScrollToLineComplete,
  className,
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const viewRef = useRef<EditorView | null>(null);
  const onCursorChangeRef = useRef(onCursorChange);
  const onScrollToLineCompleteRef = useRef(onScrollToLineComplete);
  const lastScrolledLineRef = useRef<number | null>(null);

  onCursorChangeRef.current = onCursorChange;
  onScrollToLineCompleteRef.current = onScrollToLineComplete;

  const extensions = useMemo(() => {
    const viewCapture = EditorView.updateListener.of((update) => {
      viewRef.current = update.view;
    });
    const cursorListener = EditorView.updateListener.of((update) => {
      const notifyCursor = onCursorChangeRef.current;
      if (!notifyCursor) return;
      if (!update.selectionSet && !update.docChanged) return;

      const selection = update.state.selection.main;
      const line = update.state.doc.lineAt(selection.head);
      notifyCursor(
        {
          line: line.number,
          column: selection.head - line.from + 1,
        },
        Math.max(0, selection.to - selection.from),
      );
    });

    const next: Extension[] = [
      ...getIdeCodeMirrorLanguage(language),
      isDark ? githubDark : githubLight,
      ideEditorTheme(isDark, fontSize),
      indentUnit.of(" ".repeat(tabSize)),
      keymap.of([indentWithTab]),
      viewCapture,
      cursorListener,
    ];

    if (wordWrap) next.push(EditorView.lineWrapping);

    return next;
  }, [fontSize, isDark, language, tabSize, wordWrap]);

  const basicSetup = useMemo(
    () => ({
      lineNumbers,
      highlightActiveLineGutter: true,
      highlightActiveLine: false,
      foldGutter: false,
      dropCursor: true,
      allowMultipleSelections: true,
      indentOnInput: true,
      bracketMatching: true,
      closeBrackets: true,
      autocompletion: false,
      rectangularSelection: true,
      crosshairCursor: false,
      highlightSelectionMatches: false,
      searchKeymap: false,
    }),
    [lineNumbers],
  );

  useEffect(() => {
    if (scrollToLine == null || scrollToLine < 1) {
      lastScrolledLineRef.current = null;
      return;
    }

    if (lastScrolledLineRef.current === scrollToLine) return;

    const view = viewRef.current;
    if (!view) return;
    if (scrollToLine > view.state.doc.lines) return;

    const line = view.state.doc.line(scrollToLine);
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    });
    view.focus();
    lastScrolledLineRef.current = scrollToLine;
    onScrollToLineCompleteRef.current?.();
  }, [scrollToLine, value]);

  return (
    <div className={cn("ide-editor-surface ide-codemirror-host min-h-full min-w-0", className)}>
      <CodeMirror
        value={value}
        extensions={extensions}
        onChange={onChange}
        basicSetup={basicSetup}
        className="ide-codemirror h-full min-h-full"
        height="100%"
      />
    </div>
  );
}
