"use client";

import { useCallback, useMemo } from "react";
import { chatApi } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";

export function useSidebarChats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const conversations = useChatStore((s) => s.conversations);
  const loading = useChatStore((s) => s.conversationsLoading);
  const refreshConversationsList = useChatStore((s) => s.refreshConversationsList);
  const deleteConversation = useChatStore((s) => s.deleteConversation);

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [conversations],
  );

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    await refreshConversationsList();
  }, [isAuthenticated, refreshConversationsList]);

  const removeConversation = useCallback(
    async (id: string) => {
      await chatApi.deleteConversation(id);
      deleteConversation(id);
    },
    [deleteConversation],
  );

  return {
    conversations: sortedConversations,
    loading,
    refresh,
    removeConversation,
  };
}
