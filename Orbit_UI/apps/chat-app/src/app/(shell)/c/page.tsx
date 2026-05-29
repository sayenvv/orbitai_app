import { ChatInterface } from "@/components/chat/chat-interface";
import { StudySource } from "@/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ChatPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const agent = typeof params.agent === "string" ? params.agent : undefined;
  const conversation =
    typeof params.conversation === "string" ? params.conversation : undefined;
  const prompt = typeof params.prompt === "string" ? params.prompt : undefined;
  const sourceId = typeof params.sourceId === "string" ? params.sourceId : undefined;
  const sourceName = typeof params.sourceName === "string" ? params.sourceName : undefined;
  const sourceType = typeof params.sourceType === "string" ? params.sourceType : undefined;
  const sourceSubject = typeof params.sourceSubject === "string" ? params.sourceSubject : undefined;

  let initialSource: StudySource | null = null;
  if (sourceId && sourceName && sourceType) {
    initialSource = {
      id: sourceId,
      name: sourceName,
      type: sourceType as "study-material" | "uploaded-file",
      subject: sourceSubject,
      createdAt: new Date(),
    };
  }

  return (
    <ChatInterface
      initialSource={initialSource}
      agentId={agent}
      initialConversationId={conversation}
      initialPrompt={prompt}
    />
  );
}
