"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { conversationPath } from "@/lib/chat-navigation";
import { routes } from "@/lib/routes";
import { useChatSessionStore } from "@/store/chat-session-store";

/** One-time migration from legacy `/c?agent=…&conversation=…` URLs. */
export function LegacyChatQueryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const migratedRef = useRef(false);

  useEffect(() => {
    if (migratedRef.current) return;

    const conversation = searchParams.get("conversation");
    if (conversation) {
      migratedRef.current = true;
      router.replace(conversationPath(conversation));
      return;
    }

    const agent = searchParams.get("agent");
    const prompt = searchParams.get("prompt");
    const send = searchParams.get("send");
    const sourceId = searchParams.get("sourceId");
    const sourceName = searchParams.get("sourceName");
    const sourceType = searchParams.get("sourceType");
    const sourceSubject = searchParams.get("sourceSubject");
    const sourceStatus = searchParams.get("sourceStatus");

    if (!agent && !prompt && !sourceId) return;

    migratedRef.current = true;

    let source = null;
    if (sourceId && sourceName && sourceType) {
      source = {
        id: sourceId,
        name: sourceName,
        type: sourceType as "study-material" | "uploaded-file" | "webpage",
        subject: sourceSubject ?? undefined,
        status: sourceStatus as "ready" | "processing" | "failed" | undefined,
        createdAt: new Date(),
      };
    }

    useChatSessionStore.getState().setPendingLaunch({
      agentSlug: agent ?? undefined,
      prompt: prompt ?? undefined,
      sendKey: send ?? undefined,
      source,
    });

    router.replace(routes.chat.root);
  }, [router, searchParams]);

  return null;
}
