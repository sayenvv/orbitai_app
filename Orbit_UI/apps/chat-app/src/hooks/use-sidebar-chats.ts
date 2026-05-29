"use client";

import { useCallback, useEffect, useState } from "react";
import { chatApi, mapConversationSummary } from "@/lib/orbit-api";
import type { Conversation } from "@/types";
import { useAuthStore } from "@/store/auth-store";

export function useSidebarChats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setConversations([]);
      return;
    }
    setLoading(true);
    try {
      const data = await chatApi.listConversations();
      setConversations(data.data.map(mapConversationSummary));
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const removeConversation = useCallback(async (id: string) => {
    await chatApi.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { conversations, loading, refresh, removeConversation };
}
