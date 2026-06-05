import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import {
  ApiError,
  getApiBaseUrl,
  type ApiAdaptiveCard,
  type ApiWebSearchImage,
  type StreamEvent,
} from "@/lib/orbit-api";
import type { AdaptiveCard, WebSearchImage } from "@/types";
import { textFromUIMessage } from "@/lib/orbit-ui-message";
import { transformTextToUiMessageStream } from "@/lib/transform-text-to-ui-message-stream";

export type OrbitChatRequestBody = {
  conversation_id?: string | null;
  agent_id?: string | null;
  app_slug?: string | null;
  source_id?: string | null;
  source_type?: string | null;
};

type DoneStreamEvent = Extract<StreamEvent, { type: "done" }>;

function mapStreamImage(raw: ApiWebSearchImage): WebSearchImage {
  return {
    imageUrl: raw.image_url,
    thumbnailUrl: raw.thumbnail_url ?? null,
    pageUrl: raw.page_url ?? null,
    title: raw.title ?? null,
    alt: raw.alt ?? null,
    source: raw.source ?? null,
  };
}

function mapStreamCard(raw: ApiAdaptiveCard): AdaptiveCard {
  return {
    type: raw.type,
    id: raw.id,
    title: raw.title,
    subtitle: raw.subtitle ?? null,
    description: raw.description ?? null,
    imageUrl: raw.image_url ?? null,
    thumbnailUrl: raw.thumbnail_url ?? null,
    url: raw.url ?? null,
    address: raw.address ?? null,
    rating: raw.rating ?? null,
    price: raw.price ?? null,
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    company: raw.company ?? null,
    salary: raw.salary ?? null,
    experienceLevel: raw.experience_level ?? null,
    source: raw.source ?? null,
    badges: raw.badges ?? [],
  };
}

export type OrbitStreamSideEffect =
  | { type: "start"; conversation_id?: string; session_id?: string }
  | {
      type: "done";
      usage?: DoneStreamEvent["usage"];
      images?: WebSearchImage[];
      cards?: AdaptiveCard[];
    }
  | { type: "images"; images: WebSearchImage[] }
  | { type: "cards"; cards: AdaptiveCard[] }
  | { type: "meta"; event: StreamEvent }
  | { type: "error"; detail: string };

async function* parseOrbitSse(
  response: Response,
  onSideEffect?: (effect: OrbitStreamSideEffect) => void,
): AsyncGenerator<string> {
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const detail =
      typeof error === "object" && error && "detail" in error
        ? String((error as { detail: unknown }).detail)
        : "Failed to stream message";
    onSideEffect?.({ type: "error", detail });
    throw new ApiError(detail, response.status);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onSideEffect?.({ type: "error", detail: "No response stream" });
    throw new Error("No response stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;

      let event: StreamEvent;
      try {
        event = JSON.parse(jsonStr) as StreamEvent;
      } catch {
        continue;
      }

      if (event.type === "start") {
        onSideEffect?.({
          type: "start",
          conversation_id: event.conversation_id,
          session_id: event.session_id,
        });
      } else if (event.type === "images") {
        onSideEffect?.({
          type: "images",
          images: event.images.map(mapStreamImage),
        });
      } else if (event.type === "cards") {
        onSideEffect?.({
          type: "cards",
          cards: event.cards.map(mapStreamCard),
        });
      } else if (event.type === "done") {
        onSideEffect?.({
          type: "done",
          usage: event.usage,
          images: event.images?.map(mapStreamImage),
          cards: event.cards?.map(mapStreamCard),
        });
      } else if (event.type === "meta" || event.type === "message" || event.type === "routing") {
        onSideEffect?.({ type: "meta", event });
      } else if (event.type === "token") {
        yield event.content;
      } else if (event.type === "error") {
        yield event.detail;
        onSideEffect?.({ type: "error", detail: event.detail });
      }
    }
  }
}

export class OrbitChatTransport implements ChatTransport<UIMessage> {
  constructor(
    private readonly options: {
      api?: string;
      getRequestBody?: () => OrbitChatRequestBody;
      onSideEffect?: (effect: OrbitStreamSideEffect) => void;
    } = {},
  ) {}

  async sendMessages({
    messages,
    body,
    abortSignal,
  }: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]): Promise<ReadableStream<UIMessageChunk>> {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    const task = textFromUIMessage(lastUser);
    const orbitBody = {
      ...this.options.getRequestBody?.(),
      ...((body ?? {}) as OrbitChatRequestBody),
    };
    const api = this.options.api ?? `${getApiBaseUrl()}/chat/message/stream`;

    const response = await fetch(api, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: task,
        conversation_id: orbitBody.conversation_id ?? null,
        agent_id: orbitBody.agent_id ?? null,
        app_slug: orbitBody.app_slug ?? null,
        source_id: orbitBody.source_id ?? null,
      }),
      signal: abortSignal,
    });

    const onSideEffect = this.options.onSideEffect;
    const textStream = new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of parseOrbitSse(response, onSideEffect)) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return transformTextToUiMessageStream({ stream: textStream });
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}
