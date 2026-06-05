import { Suspense } from "react";
import { ChatInterfaceLazy } from "@/components/chat/chat-interface-lazy";
import { LegacyChatQueryRedirect } from "@/components/chat/legacy-chat-query-redirect";
import { ChatThreadShimmer } from "@/components/ui/skeleton";

function ChatPageFallback() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <ChatThreadShimmer />
    </div>
  );
}

export default function NewChatPage() {
  return (
    <Suspense fallback={<ChatPageFallback />}>
      <LegacyChatQueryRedirect />
      <ChatInterfaceLazy />
    </Suspense>
  );
}
