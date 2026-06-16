"use client";

import dynamic from "next/dynamic";

export const PlanMarkdownContent = dynamic(
  () =>
    import("@/components/chat/chat-streamdown").then((mod) => ({
      default: function PlanMarkdownContent({
        content,
        isStreaming = false,
      }: {
        content: string;
        isStreaming?: boolean;
      }) {
        return <mod.ChatStreamdown content={content} isStreaming={isStreaming} compact />;
      },
    })),
  { ssr: false },
);
