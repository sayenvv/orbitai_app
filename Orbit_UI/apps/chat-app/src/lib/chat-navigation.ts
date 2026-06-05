import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { chatApi, mapConversationSummary } from "@/lib/orbit-api";
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

export async function navigateToChatLaunch(
  router: AppRouterInstance,
  launch: PendingChatLaunch,
) {
  let conversationId = launch.conversationId;

  if (!conversationId) {
    const title =
      launch.prompt?.trim().slice(0, 50) ||
      launch.source?.name?.slice(0, 50) ||
      "New chat";
    const created = await chatApi.createConversation({
      title,
      agent_id: launch.agentSlug ?? null,
    });
    conversationId = created.id;
    const mapped = mapConversationSummary(created);
    if (launch.source) {
      mapped.sourceId = launch.source.id;
      mapped.contextSource = launch.source;
    }
    useChatStore.getState().addConversation(mapped);
  }

  useChatSessionStore.getState().setPendingLaunch({
    ...launch,
    conversationId,
  });
  useChatStore.getState().setActiveConversation(conversationId);
  expandChatSideRail();
  router.push(conversationPath(conversationId));
}
