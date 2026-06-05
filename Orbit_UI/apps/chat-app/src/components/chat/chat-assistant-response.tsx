"use client";

import type { UIMessage } from "ai";
import { memo } from "react";
import { ChatStreamdown } from "@/components/chat/chat-streamdown";
import { textFromUIMessage } from "@/lib/orbit-ui-message";

type ChatAssistantResponseProps = {
  message: UIMessage;
  isStreaming?: boolean;
};

export const ChatAssistantResponse = memo(function ChatAssistantResponse({
  message,
  isStreaming = false,
}: ChatAssistantResponseProps) {
  const hasRenderablePart = message.parts.some(
    (part) => part.type === "text" && part.text.trim().length > 0,
  );

  if (!hasRenderablePart && isStreaming) {
    return (
      <span className="inline-flex items-center py-1" aria-hidden>
        <span className="animate-cursor inline-block h-[1.125rem] w-0.5 rounded-full bg-primary/60" />
      </span>
    );
  }

  if (!hasRenderablePart) {
    return null;
  }

  return (
    <>
      {message.parts.map((part, index) => {
        if (part.type !== "text") return null;

        const partStreaming =
          isStreaming && (part.state === "streaming" || part.state === undefined);

        if (!part.text.trim() && partStreaming) {
          return (
            <span key={`${message.id}-${index}`} className="inline-flex items-center py-1" aria-hidden>
              <span className="animate-cursor inline-block h-[1.125rem] w-0.5 rounded-full bg-primary/60" />
            </span>
          );
        }

        if (!part.text.trim()) return null;

        return (
          <ChatStreamdown
            key={`${message.id}-${index}`}
            content={part.text}
            isStreaming={partStreaming}
          />
        );
      })}
    </>
  );
});

export function assistantCopyText(message: UIMessage): string {
  return textFromUIMessage(message);
}
