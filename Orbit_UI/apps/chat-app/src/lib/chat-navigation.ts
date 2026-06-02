import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { routes } from "@/lib/routes";
import {
  useChatSessionStore,
  type PendingChatLaunch,
} from "@/store/chat-session-store";
import { expandChatSideRail } from "@/store/chat-side-rail-store";
import { useChatStore } from "@/store/chat-store";

export { parseConversationIdFromPath, isChatPath as isChatRoute } from "@/lib/routes";

export function conversationPath(conversationId: string): string {
  return routes.chat.conversation(conversationId);
}

export function navigateToNewChat(router: AppRouterInstance) {
  useChatSessionStore.getState().clearPending();
  useChatStore.getState().setActiveConversation(null);
  expandChatSideRail();
  router.push(routes.home);
}

export function navigateToAgentChat(router: AppRouterInstance, agentSlug: string) {
  useChatSessionStore.getState().setPendingAgent(agentSlug);
  useChatStore.getState().setActiveConversation(null);
  expandChatSideRail();
  router.push(routes.chat.root);
}

export function navigateToConversation(router: AppRouterInstance, conversationId: string) {
  useChatStore.getState().setActiveConversation(conversationId);
  router.push(conversationPath(conversationId));
}

export function navigateToChatLaunch(router: AppRouterInstance, launch: PendingChatLaunch) {
  useChatSessionStore.getState().setPendingLaunch(launch);
  useChatStore.getState().setActiveConversation(null);
  expandChatSideRail();
  router.push(routes.chat.root);
}
