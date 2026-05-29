import { AgentEditor } from "@/components/agent-editor";

export default function EditAgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  return <AgentEditor params={params} />;
}
