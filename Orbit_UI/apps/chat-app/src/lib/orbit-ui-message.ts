import type { TextUIPart, UIMessage } from "ai";
import type { Message } from "@/types";

export function messageToUIMessage(
  message: Message,
  options?: { streaming?: boolean },
): UIMessage {
  const streaming = options?.streaming ?? false;
  const text = message.content;

  if (!text.trim()) {
    return {
      id: message.id,
      role: message.role,
      parts: streaming
        ? [{ type: "text", text: "", state: "streaming" } satisfies TextUIPart]
        : [],
    };
  }

  return {
    id: message.id,
    role: message.role,
    parts: [
      {
        type: "text",
        text,
        state: streaming ? "streaming" : "done",
      } satisfies TextUIPart,
    ],
  };
}

export function textFromUIMessage(message: UIMessage | undefined): string {
  if (!message) return "";
  return message.parts
    .filter((part): part is TextUIPart => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function createStreamingAssistantUIMessage(id: string): UIMessage {
  return {
    id,
    role: "assistant",
    parts: [{ type: "text", text: "", state: "streaming" }],
  };
}
