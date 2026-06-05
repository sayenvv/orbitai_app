import { readUIMessageStream, type UIMessage } from "ai";
import type { OrbitChatRequestBody, OrbitStreamSideEffect } from "@/lib/orbit-chat-transport";
import { OrbitChatTransport } from "@/lib/orbit-chat-transport";
import { createStreamingAssistantUIMessage, textFromUIMessage } from "@/lib/orbit-ui-message";
import { createStreamRenderFlusher } from "@/lib/stream-render";

export type StreamOrbitAssistantOptions = {
  assistantMessageId: string;
  body: OrbitChatRequestBody;
  messages: UIMessage[];
  onTextUpdate: (text: string) => void;
  onSideEffect?: (effect: OrbitStreamSideEffect) => void;
  abortSignal?: AbortSignal;
};

export async function streamOrbitAssistantReply(
  options: StreamOrbitAssistantOptions,
): Promise<string> {
  const transport = new OrbitChatTransport({
    onSideEffect: options.onSideEffect,
  });

  const chunkStream = await transport.sendMessages({
    trigger: "submit-message",
    chatId: options.body.conversation_id ?? "orbit-chat",
    messageId: undefined,
    messages: options.messages,
    body: options.body,
    abortSignal: options.abortSignal,
  });

  const seed = createStreamingAssistantUIMessage(options.assistantMessageId);
  const flusher = createStreamRenderFlusher(options.onTextUpdate);
  let finalText = "";

  flusher.start();
  try {
    const uiStream = readUIMessageStream({
      message: seed,
      stream: chunkStream,
    });

    for await (const message of uiStream) {
      finalText = textFromUIMessage(message);
      flusher.setBuffer(finalText);
    }
  } finally {
    flusher.stop();
  }

  return finalText;
}
