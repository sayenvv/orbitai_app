"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HighlightResult } from "@streamdown/code";
import { highlightIdeCode, highlightTokenStyle } from "@/lib/ide-code-highlighter";
import type { IdeCursorPosition } from "@/lib/ide-cursor";
import { cn } from "@/lib/utils";

type CodeEditorProps = {
  value: string;
  language?: string;
  onChange: (value: string) => void;
  onCursorChange?: (cursor: IdeCursorPosition, selectionChars: number) => void;
  className?: string;
};

function EditorCodeLines({
  lines,
  highlight,
}: {
  lines: string[];
  highlight: HighlightResult | null;
}) {
  return (
    <code className="ide-editor-highlight-code block min-w-full">
      {highlight
        ? highlight.tokens.map((line, lineIndex) => (
            <div key={lineIndex} className="ide-editor-highlight-line whitespace-pre">
              {line.length > 0 ? (
                line.map((token, tokenIndex) => (
                  <span key={tokenIndex} style={highlightTokenStyle(token)}>
                    {token.content}
                  </span>
                ))
              ) : (
                "\u00a0"
              )}
            </div>
          ))
        : lines.map((line, lineIndex) => (
            <div key={lineIndex} className="ide-editor-highlight-line whitespace-pre">
              {line || "\u00a0"}
            </div>
          ))}
    </code>
  );
}

export function CodeEditor({
  value,
  language = "text",
  onChange,
  onCursorChange,
  className,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [highlight, setHighlight] = useState<HighlightResult | null>(null);

  const lines = useMemo(() => value.split("\n"), [value]);
  const lineCount = Math.max(lines.length, 1);

  useEffect(() => {
    let cancelled = false;

    const applyHighlight = (result: HighlightResult) => {
      if (!cancelled) setHighlight(result);
    };

    const cached = highlightIdeCode(value, language, applyHighlight);
    if (cached) setHighlight(cached);

    return () => {
      cancelled = true;
    };
  }, [language, value]);

  const emitCursor = useCallback(
    (target: HTMLTextAreaElement) => {
      if (!onCursorChange) return;
      const before = value.slice(0, target.selectionStart);
      const lineLines = before.split("\n");
      onCursorChange(
        {
          line: lineLines.length,
          column: (lineLines.at(-1)?.length ?? 0) + 1,
        },
        Math.max(0, target.selectionEnd - target.selectionStart),
      );
    },
    [onCursorChange, value],
  );

  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const gutter = gutterRef.current;
    const highlightLayer = highlightRef.current;
    if (!textarea) return;

    if (gutter) gutter.scrollTop = textarea.scrollTop;
    if (highlightLayer) {
      highlightLayer.scrollTop = textarea.scrollTop;
      highlightLayer.scrollLeft = textarea.scrollLeft;
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Tab") {
        event.preventDefault();
        const textarea = event.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const next = `${value.slice(0, start)}  ${value.slice(end)}`;
        onChange(next);
        requestAnimationFrame(() => {
          textarea.selectionStart = start + 2;
          textarea.selectionEnd = start + 2;
          emitCursor(textarea);
        });
      }
    },
    [emitCursor, onChange, value],
  );

  return (
    <div className={cn("ide-editor-surface flex min-h-full min-w-0", className)}>
      <div
        ref={gutterRef}
        className="ide-editor-gutter sticky left-0 shrink-0 select-none overflow-hidden py-3 text-right font-mono text-[11.5px] leading-[1.55]"
        aria-hidden
      >
        {Array.from({ length: lineCount }, (_, index) => (
          <div key={index + 1} className="px-2">
            {index + 1}
          </div>
        ))}
      </div>

      <div className="ide-editor-body relative min-h-full min-w-0 flex-1">
        <pre
          ref={highlightRef}
          className="ide-editor-highlight pointer-events-none absolute inset-0 m-0 overflow-hidden px-4 py-3 font-mono text-[12px] leading-[1.55]"
          aria-hidden
        >
          <EditorCodeLines lines={lines} highlight={highlight} />
        </pre>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            emitCursor(event.target);
          }}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          onKeyUp={(event) => emitCursor(event.currentTarget)}
          onClick={(event) => emitCursor(event.currentTarget)}
          onSelect={(event) => emitCursor(event.currentTarget)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Code editor"
          className="code-editor-input ide-editor-input relative z-[1] min-h-full w-full resize-none border-0 bg-transparent px-4 py-3 font-mono text-[12px] leading-[1.55] outline-none"
        />
      </div>
    </div>
  );
}
