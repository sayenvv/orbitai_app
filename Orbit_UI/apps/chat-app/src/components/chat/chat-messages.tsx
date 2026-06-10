"use client";

import { Message } from "@/types";
import { AssistantReplyShimmer } from "@/components/ui/skeleton";
import { UpgradeCtaButton } from "@/components/plans/upgrade-cta";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";
import { Bot, Copy, Check } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  assistantCopyText,
  ChatAssistantResponse,
} from "@/components/chat/chat-assistant-response";
import { ChatAdaptiveCards } from "@/components/chat/chat-adaptive-cards";
import { messageToUIMessage } from "@/lib/orbit-ui-message";

type ChatMessagesProps = {
  messages: Message[];
  isLoading: boolean;
  streamingMsgId?: string | null;
  upgradeMessageId?: string | null;
  onUpgrade?: () => void;
  contentClassName?: string;
  threadClassName?: string;
  className?: string;
  style?: CSSProperties;
  footer?: ReactNode;
  renderMessageFooter?: (message: Message) => ReactNode;
};

function hasStreamPlaceholder(messages: Message[], streamingMsgId?: string | null) {
  if (streamingMsgId) {
    return messages.some((message) => message.id === streamingMsgId);
  }
  return messages.some(
    (message) => message.role === "assistant" && !message.content.trim(),
  );
}

export function ChatMessages({
  messages,
  isLoading,
  streamingMsgId,
  upgradeMessageId,
  onUpgrade,
  contentClassName,
  threadClassName,
  className,
  style,
  footer,
  renderMessageFooter,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const scrollRafRef = useRef<number | null>(null);
  useEffect(() => {
    if (scrollRafRef.current != null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: streamingMsgId ? "instant" : "smooth",
        block: "end",
      });
    });
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [messages, isLoading, streamingMsgId, footer]);

  return (
    <div
      ref={scrollRef}
      className={cn("min-h-0 flex-1 overflow-y-auto scroll-smooth w-full", className)}
      style={style}
    >
      <div
        className={cn(
          contentClassName,
          threadClassName ?? "chat-thread space-y-5 py-6 sm:space-y-6 sm:py-10",
        )}
      >
        {messages.map((message, index) => {
          const prev = messages[index - 1];
          const isNewTurn = !prev || prev.role !== message.role;
          const messageFooter = renderMessageFooter?.(message);

          return (
            <motion.div
              key={message.id}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className={cn(isNewTurn && index > 0 && "mt-2 sm:mt-3")}
            >
              <MessageBubble
                message={message}
                isStreaming={message.id === streamingMsgId}
                showUpgrade={message.id === upgradeMessageId && Boolean(onUpgrade)}
                onUpgrade={onUpgrade}
              />
              {messageFooter ? <div className="mt-2">{messageFooter}</div> : null}
            </motion.div>
          );
        })}
        {isLoading && !hasStreamPlaceholder(messages, streamingMsgId) ? (
          <AssistantReplyShimmer />
        ) : null}
        {footer}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming,
  showUpgrade,
  onUpgrade,
}: {
  message: Message;
  isStreaming?: boolean;
  showUpgrade?: boolean;
  onUpgrade?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const uiMessage = messageToUIMessage(message, { streaming: isStreaming });

  const handleCopy = () => {
    navigator.clipboard.writeText(isUser ? message.content : assistantCopyText(uiMessage));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="chat-user-bubble max-w-[min(85%,42rem)] px-4 py-3 sm:px-5 sm:py-3.5">
          <p className="whitespace-pre-wrap text-[15px] leading-[1.65] tracking-[-0.011em]">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group chat-assistant-row flex gap-3 sm:gap-3.5">
      <div
        className="chat-assistant-avatar flex h-8 w-8 shrink-0 items-center justify-center sm:h-9 sm:w-9"
        aria-hidden
      >
        <Bot className="h-4 w-4 text-primary/80 sm:h-[18px] sm:w-[18px]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <ChatAssistantResponse message={uiMessage} isStreaming={isStreaming} />
        {(message.metadata?.cards?.length || message.metadata?.images?.length) ? (
          <ChatAdaptiveCards
            cards={message.metadata?.cards}
            images={
              message.metadata?.cards?.length ? undefined : message.metadata?.images
            }
          />
        ) : null}
        {showUpgrade && onUpgrade && (
          <div className="mt-4">
            <UpgradeCtaButton onClick={onUpgrade} className="text-sm" />
          </div>
        )}
        {!isStreaming && assistantCopyText(uiMessage) && !showUpgrade && (
          <div className="mt-3 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button
              type="button"
              onClick={handleCopy}
              className="chat-message-action inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium"
              title="Copy message"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
