"use client";

import { createCodePlugin } from "@streamdown/code";
import { memo, useMemo } from "react";
import { Streamdown, type BundledTheme } from "streamdown";
import "streamdown/styles.css";
import { normalizeAssistantMarkdown } from "@/lib/message-markdown";
import { cn } from "@/lib/utils";

const SHIKI_THEMES: [BundledTheme, BundledTheme] = ["github-light", "github-dark"];
const code = createCodePlugin({ themes: SHIKI_THEMES });

type ChatStreamdownProps = {
  content: string;
  isStreaming?: boolean;
  compact?: boolean;
};

export const ChatStreamdown = memo(function ChatStreamdown({
  content,
  isStreaming = false,
  compact = false,
}: ChatStreamdownProps) {
  const displayContent = useMemo(() => normalizeAssistantMarkdown(content), [content]);

  if (!displayContent.trim()) {
    return null;
  }

  return (
    <div className="chat-markdown min-w-0 max-w-full">
      <Streamdown
        mode={isStreaming ? "streaming" : "static"}
        isAnimating={isStreaming}
        animated={false}
        parseIncompleteMarkdown
        normalizeHtmlIndentation={false}
        plugins={{ code }}
        shikiTheme={SHIKI_THEMES}
        lineNumbers={false}
        controls={{ code: { download: false }, table: true, mermaid: false }}
        className={cn(
          compact
            ? "size-full !space-y-2 text-[13px] leading-snug tracking-[-0.01em] text-foreground"
            : "size-full !space-y-3.5 text-[15px] leading-[1.65] tracking-[-0.011em] text-foreground",
          "[&_p]:text-foreground/95",
          "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        )}
        caret={isStreaming ? "block" : undefined}
      >
        {displayContent}
      </Streamdown>
    </div>
  );
});
