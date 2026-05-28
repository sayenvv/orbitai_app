import { create } from "zustand";
import { Conversation, Message } from "@/types";

type ChatState = {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  setActiveConversation: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  updateConversationId: (oldId: string, newId: string) => void;
  setConversations: (conversations: Conversation[]) => void;
  deleteConversation: (id: string) => void;
  setLoading: (loading: boolean) => void;
  clearConversations: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: conversation.id,
    })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, message], updatedAt: new Date() }
          : conv
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
            }
          : conv
      ),
    })),

  updateConversationId: (oldId, newId) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === oldId ? { ...conv, id: newId } : conv
      ),
      activeConversationId: state.activeConversationId === oldId ? newId : state.activeConversationId,
    })),

  setConversations: (conversations) => set({ conversations }),

  deleteConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  clearConversations: () => set({ conversations: [], activeConversationId: null }),
}));
