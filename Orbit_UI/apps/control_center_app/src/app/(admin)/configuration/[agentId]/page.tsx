import { AgentConfigurationEditor } from "@/components/agent-configuration-editor";

type Params = Promise<{ agentId: string }>;

export default function AgentConfigurationPage({ params }: { params: Params }) {
  return <AgentConfigurationEditor params={params} />;
}
