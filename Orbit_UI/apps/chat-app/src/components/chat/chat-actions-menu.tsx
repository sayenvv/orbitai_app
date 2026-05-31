"use client";

import { useCallback, useState } from "react";
import {
  Check,
  Copy,
  Link2,
  MessageSquarePlus,
  Share2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { conversationPath } from "@/lib/chat-navigation";
import type { Message } from "@/types";

type ChatActionsMenuProps = {
  conversationId: string | null;
  conversationTitle?: string;
  messages: Message[];
  canDelete?: boolean;
  onDelete?: () => void | Promise<void>;
  onNewChat?: () => void;
  variant?: "floating" | "rail";
};

type CopiedAction = "link" | "conversation" | null;

type ActionItem = {
  id: string;
  label: string;
  icon: typeof Share2;
  onClick: () => void;
  active?: boolean;
  destructive?: boolean;
};

function ActionButton({
  label,
  icon: Icon,
  onClick,
  active,
  destructive,
  tooltipSide = "left",
}: Omit<ActionItem, "id"> & { tooltipSide?: "left" | "right" }) {
  return (
    <div className="group/action relative">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={cn(
          "press flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
          destructive
            ? "text-destructive hover:bg-destructive/10"
            : active
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-card/95 px-2.5 py-1.5 text-xs font-medium text-foreground opacity-0 backdrop-blur-sm transition-all duration-150 group-hover/action:opacity-100 group-focus-within/action:opacity-100",
          tooltipSide === "left"
            ? "right-[calc(100%+0.5rem)] -translate-x-1 group-hover/action:translate-x-0 group-focus-within/action:translate-x-0"
            : "left-[calc(100%+0.5rem)] translate-x-1 group-hover/action:translate-x-0 group-focus-within/action:translate-x-0",
          destructive && "text-destructive",
          active && "text-primary",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function ChatActionsMenu({
  conversationId,
  conversationTitle,
  messages,
  canDelete = false,
  onDelete,
  onNewChat,
  variant = "floating",
}: ChatActionsMenuProps) {
  const [copied, setCopied] = useState<CopiedAction>(null);

  const flashCopied = useCallback((action: CopiedAction) => {
    setCopied(action);
    window.setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleCopyLink = async () => {
    const url = conversationId
      ? `${window.location.origin}${conversationPath(conversationId)}`
      : window.location.href;

    await navigator.clipboard.writeText(url);
    flashCopied("link");
  };

  const handleCopyConversation = async () => {
    const title = conversationTitle?.trim() || "Chat";
    const body = messages
      .filter((msg) => msg.content.trim())
      .map((msg) => {
        const label = msg.role === "user" ? "You" : "Assistant";
        return `${label}:\n${msg.content.trim()}`;
      })
      .join("\n\n");

    await navigator.clipboard.writeText(`${title}\n\n${body}`.trim());
    flashCopied("conversation");
  };

  const handleShare = async () => {
    const url = conversationId
      ? `${window.location.origin}${conversationPath(conversationId)}`
      : window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: conversationTitle || "Clovai chat",
          text: "Check out this conversation on Clovai",
          url,
        });
        return;
      } catch {
        // fall through to copy
      }
    }

    await handleCopyLink();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    await onDelete();
  };

  const items: ActionItem[] = [
    {
      id: "share",
      label: "Share",
      icon: Share2,
      onClick: () => void handleShare(),
    },
    {
      id: "link",
      label: copied === "link" ? "Link copied" : "Copy link",
      icon: copied === "link" ? Check : Link2,
      onClick: () => void handleCopyLink(),
      active: copied === "link",
    },
    {
      id: "copy",
      label: copied === "conversation" ? "Copied" : "Copy chat",
      icon: copied === "conversation" ? Check : Copy,
      onClick: () => void handleCopyConversation(),
      active: copied === "conversation",
    },
  ];

  if (onNewChat) {
    items.push({
      id: "new",
      label: "New chat",
      icon: MessageSquarePlus,
      onClick: onNewChat,
    });
  }

  if (canDelete && onDelete) {
    items.push({
      id: "delete",
      label: "Delete",
      icon: Trash2,
      onClick: () => void handleDelete(),
      destructive: true,
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center overflow-visible",
        variant === "floating"
          ? "gap-2 rounded-2xl border border-border/50 bg-card/80 p-1.5 shadow-mac backdrop-blur-xl"
          : "gap-1 p-0",
      )}
    >
      {items.map(({ id, ...item }) => (
        <ActionButton key={id} {...item} tooltipSide="left" />
      ))}
    </div>
  );
}
