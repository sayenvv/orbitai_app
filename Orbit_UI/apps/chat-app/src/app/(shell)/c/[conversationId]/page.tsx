import { Suspense } from "react";
import { ChatInterfaceLazy } from "@/components/chat/chat-interface-lazy";
import { ChatThreadShimmer } from "@/components/ui/skeleton";

type Params = Promise<{ conversationId: string }>;

function ChatPageFallback() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <ChatThreadShimmer />
    </div>
  );
}

export default async function ConversationChatPage({ params }: { params: Params }) {
  const { conversationId } = await params;

  return (
    <Suspense fallback={<ChatPageFallback />}>
      <ChatInterfaceLazy conversationId={conversationId} />
    </Suspense>
  );
}
