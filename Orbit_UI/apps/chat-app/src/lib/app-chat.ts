import type { Conversation } from "@/types";

import { findCatalogApp, getAppLaunchHref, getAppWorkspaceHref } from "@orbit/clovai-apps";

export const APP_SLUG_LABELS: Record<string, string> = {
  "research-companion": "Clovai Insights",
};

export function isAppChatConversation(conv: Conversation): boolean {
  return Boolean(conv.appSlug?.trim());
}

export function getAppChatLabel(conv: Conversation): string | null {
  if (!conv.appSlug) return null;
  return APP_SLUG_LABELS[conv.appSlug] ?? conv.appSlug;
}

export function buildAppChatHref(conv: Conversation): string | null {
  if (!conv.appSlug || !conv.sourceId) return null;

  const app = findCatalogApp(conv.appSlug);
  if (!app || !getAppLaunchHref(app)) return null;

  const params = new URLSearchParams({
    sourceId: conv.sourceId,
    sourceType: "uploaded-file",
    panel: "chat",
    chatId: conv.id,
  });
  return `${getAppWorkspaceHref(app)}?${params.toString()}`;
}

export function isSameWorkspaceAppChat(
  conv: Conversation,
  workspaceSourceId: string | null | undefined,
): boolean {
  if (!workspaceSourceId) return false;
  return conv.sourceId === workspaceSourceId;
}

export function partitionConversations(conversations: Conversation[]): {
  appChats: Conversation[];
  chats: Conversation[];
} {
  const appChats: Conversation[] = [];
  const chats: Conversation[] = [];

  for (const conv of conversations) {
    if (isAppChatConversation(conv)) {
      appChats.push(conv);
    } else {
      chats.push(conv);
    }
  }

  return { appChats, chats };
}
