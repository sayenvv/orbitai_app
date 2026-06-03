import { create } from "zustand";
import { chatApi, mapConversationSummary } from "@/lib/orbit-api";
import { Conversation, Message } from "@/types";

function dedupeMessages(messages: Message[]): Message[] {
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  const result: Message[] = [];

  for (const msg of messages) {
    if (seenIds.has(msg.id)) continue;
    const contentKey = `${msg.role}:${msg.content.trim()}`;
    if (msg.content.trim() && seenContent.has(contentKey)) continue;
    seenIds.add(msg.id);
    if (msg.content.trim()) seenContent.add(contentKey);
    result.push(msg);
  }

  return result;
}

function dedupeConversations(conversations: Conversation[]): Conversation[] {
  const byId = new Map<string, Conversation>();

  for (const conv of conversations) {
    const existing = byId.get(conv.id);
    if (!existing) {
      byId.set(conv.id, { ...conv, messages: dedupeMessages(conv.messages) });
      continue;
    }
    byId.set(conv.id, {
      ...existing,
      ...conv,
      messages: dedupeMessages([...existing.messages, ...conv.messages]),
      updatedAt:
        new Date(conv.updatedAt) > new Date(existing.updatedAt)
          ? conv.updatedAt
          : existing.updatedAt,
    });
  }

  return Array.from(byId.values());
}

const CONVERSATIONS_PAGE_SIZE = 20;

type ChatState = {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  conversationsLoading: boolean;
  conversationsLoadingMore: boolean;
  conversationsHasMore: boolean;
  conversationsNextOffset: number;
  conversationsHydrated: boolean;
  setActiveConversation: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  addMessage: (conversationId: string, message: Message, options?: { touchUpdatedAt?: boolean }) => void;
  setConversationMessages: (conversationId: string, messages: Message[]) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  updateConversationId: (oldId: string, newId: string) => void;
  setConversations: (conversations: Conversation[]) => void;
  appendConversationsPage: (conversations: Conversation[]) => void;
  fetchConversationsPage: (options?: { reset?: boolean }) => Promise<void>;
  refreshConversationsList: () => Promise<void>;
  loadMoreConversationsList: () => Promise<void>;
  deleteConversation: (id: string) => void;
  setLoading: (loading: boolean) => void;
  clearConversations: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  conversationsLoading: false,
  conversationsLoadingMore: false,
  conversationsHasMore: true,
  conversationsNextOffset: 0,
  conversationsHydrated: false,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: dedupeConversations([
        { ...conversation, messages: dedupeMessages(conversation.messages) },
        ...state.conversations.filter((c) => c.id !== conversation.id),
      ]),
      activeConversationId: conversation.id,
    })),

  addMessage: (conversationId, message, options) =>
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id !== conversationId) return conv;
        const next = dedupeMessages([...conv.messages, message]);
        const touchUpdatedAt = options?.touchUpdatedAt !== false;
        return {
          ...conv,
          messages: next,
          ...(touchUpdatedAt ? { updatedAt: new Date() } : {}),
        };
      }),
    })),

  setConversationMessages: (conversationId, messages) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: dedupeMessages(messages) }
          : conv,
      ),
    })),

  updateMessage: (conversationId, messageId, content) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === messageId ? { ...msg, content } : msg
              ),
              updatedAt: new Date(),
            }
          : conv
      ),
    })),

  updateConversationId: (oldId, newId) =>
    set((state) => ({
      conversations: dedupeConversations(
        state.conversations.map((conv) =>
          conv.id === oldId ? { ...conv, id: newId, updatedAt: new Date() } : conv,
        ),
      ),
      activeConversationId:
        state.activeConversationId === oldId ? newId : state.activeConversationId,
    })),

  setConversations: (incoming) =>
    set((state) => {
      const foldedLocal = (apiConv: Conversation) => {
        const existing = state.conversations.find((c) => c.id === apiConv.id);
        const orphan = state.conversations.find((c) => {
          if (c.id === apiConv.id) return false;
          if (c.messages.length === 0) return false;
          if (!c.title || !apiConv.title || c.title !== apiConv.title) return false;
          const delta = Math.abs(
            new Date(c.updatedAt).getTime() - new Date(apiConv.updatedAt).getTime(),
          );
          return delta < 120_000;
        });
        const messages = existing?.messages.length
          ? existing.messages
          : orphan?.messages ?? [];
        if (messages.length > 0) {
          return {
            ...apiConv,
            messages: dedupeMessages(messages),
            updatedAt: apiConv.updatedAt,
          };
        }
        return apiConv;
      };

      const merged = incoming.map(foldedLocal);
      const localOnly = state.conversations.filter((c) => {
        if (incoming.some((ic) => ic.id === c.id)) return false;
        const superseded = incoming.some((ic) => {
          if (!c.title || !ic.title || c.title !== ic.title) return false;
          if (c.messages.length === 0) return false;
          const delta = Math.abs(
            new Date(c.updatedAt).getTime() - new Date(ic.updatedAt).getTime(),
          );
          return delta < 120_000;
        });
        return !superseded;
      });
      return { conversations: dedupeConversations([...localOnly, ...merged]) };
    }),

  appendConversationsPage: (incoming) =>
    set((state) => {
      const existingIds = new Set(state.conversations.map((c) => c.id));
      const toAdd = incoming.filter((c) => !existingIds.has(c.id));
      return { conversations: dedupeConversations([...state.conversations, ...toAdd]) };
    }),

  fetchConversationsPage: async (options) => {
    const reset = options?.reset ?? false;
    const state = get();

    if (!reset) {
      if (!state.conversationsHasMore || state.conversationsLoadingMore || state.conversationsLoading) {
        return;
      }
      set({ conversationsLoadingMore: true });
    } else {
      set({ conversationsLoading: true, conversationsNextOffset: 0, conversationsHasMore: true });
    }

    const offset = reset ? 0 : state.conversationsNextOffset;

    try {
      const data = await chatApi.listConversations({
        limit: CONVERSATIONS_PAGE_SIZE,
        offset,
      });
      const mapped = data.data.map(mapConversationSummary);

      if (reset) {
        get().setConversations(mapped);
      } else {
        get().appendConversationsPage(mapped);
      }

      set({
        conversationsHasMore: data.has_more,
        conversationsNextOffset: data.next_offset ?? offset + mapped.length,
      });
    } catch {
      // keep local state on failure
    } finally {
      set({
        conversationsLoading: false,
        conversationsLoadingMore: false,
        conversationsHydrated: true,
      });
    }
  },

  refreshConversationsList: async () => {
    await get().fetchConversationsPage({ reset: true });
  },

  loadMoreConversationsList: async () => {
    await get().fetchConversationsPage({ reset: false });
  },

  deleteConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  clearConversations: () =>
    set({
      conversations: [],
      activeConversationId: null,
      conversationsHydrated: false,
      conversationsHasMore: true,
      conversationsNextOffset: 0,
      conversationsLoading: false,
      conversationsLoadingMore: false,
    }),
}));
