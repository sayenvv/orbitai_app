import { ChatInterface } from "@/components/chat/chat-interface";
import { StudySource } from "@/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ChatPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const agent = typeof params.agent === "string" ? params.agent : undefined;
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
    <main className="flex h-screen flex-col">
      <ChatInterface initialSource={initialSource} agentId={agent} />
    </main>
  );
}
