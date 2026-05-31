import { Suspense } from "react";

import { ChatInterface } from "@/components/chat/chat-interface";

type Params = Promise<{ conversationId: string }>;

export default async function ConversationChatPage({ params }: { params: Params }) {
  const { conversationId } = await params;

  return (
    <Suspense fallback={null}>
      <ChatInterface conversationId={conversationId} />
    </Suspense>
  );
}
