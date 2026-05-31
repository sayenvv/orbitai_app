import { Suspense } from "react";

import { ChatInterface } from "@/components/chat/chat-interface";
import { LegacyChatQueryRedirect } from "@/components/chat/legacy-chat-query-redirect";

export default function NewChatPage() {
  return (
    <Suspense fallback={null}>
      <LegacyChatQueryRedirect />
      <ChatInterface />
    </Suspense>
  );
}
