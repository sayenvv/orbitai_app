"use client";

import dynamic from "next/dynamic";
import { ChatThreadShimmer } from "@/components/ui/skeleton";
import { chatContentClass } from "@/lib/chat-layout";
import { cn } from "@/lib/utils";

function ChatLoadingFallback() {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", chatContentClass())}>
      <ChatThreadShimmer />
    </div>
  );
}

export const ChatInterfaceLazy = dynamic(
  () => import("./chat-interface").then((m) => ({ default: m.ChatInterface })),
  { loading: ChatLoadingFallback },
);
