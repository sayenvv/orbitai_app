import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import {
  useChatSessionStore,
  type PendingChatLaunch,
} from "@/store/chat-session-store";
import { expandChatSideRail } from "@/store/chat-side-rail-store";
import { useChatStore } from "@/store/chat-store";

export function conversationPath(conversationId: string): string {
  return `/c/${conversationId}`;
}

export function parseConversationIdFromPath(pathname: string): string | null {
  const match = /^\/c\/([^/?#]+)$/.exec(pathname);
  return match?.[1] ?? null;
}

export function isChatRoute(pathname: string): boolean {
  return pathname === "/c" || pathname.startsWith("/c/");
}

export function navigateToNewChat(router: AppRouterInstance) {
  useChatSessionStore.getState().clearPending();
  useChatStore.getState().setActiveConversation(null);
  expandChatSideRail();
  router.push("/");
}

export function navigateToAgentChat(router: AppRouterInstance, agentSlug: string) {
  useChatSessionStore.getState().setPendingAgent(agentSlug);
  useChatStore.getState().setActiveConversation(null);
  expandChatSideRail();
  router.push("/c");
}

export function navigateToConversation(router: AppRouterInstance, conversationId: string) {
  useChatStore.getState().setActiveConversation(conversationId);
  router.push(conversationPath(conversationId));
}

export function navigateToChatLaunch(router: AppRouterInstance, launch: PendingChatLaunch) {
  useChatSessionStore.getState().setPendingLaunch(launch);
  useChatStore.getState().setActiveConversation(null);
  expandChatSideRail();
  router.push("/c");
}
