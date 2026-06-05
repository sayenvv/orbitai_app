import type { UIMessageChunk } from "ai";

/** Mirrors AI SDK internal helper (not exported from `ai` v6). */
export function transformTextToUiMessageStream({
  stream,
}: {
  stream: ReadableStream<string>;
}): ReadableStream<UIMessageChunk> {
  return stream.pipeThrough(
    new TransformStream<string, UIMessageChunk>({
      start(controller) {
        controller.enqueue({ type: "start" });
        controller.enqueue({ type: "start-step" });
        controller.enqueue({ type: "text-start", id: "text-1" });
      },
      transform(part, controller) {
        controller.enqueue({ type: "text-delta", id: "text-1", delta: part });
      },
      flush(controller) {
        controller.enqueue({ type: "text-end", id: "text-1" });
        controller.enqueue({ type: "finish-step" });
        controller.enqueue({ type: "finish" });
      },
    }),
  );
}
