import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentHeader } from "@/components/agent-header";
import { ToolCatalogEditor } from "@/components/tool-catalog-editor";
import { loadAgent } from "@/lib/agent-page";
import { fetchAgentTools } from "@/lib/control-api-server";

type Params = Promise<{ agentId: string }>;

export default async function AgentToolsPage({ params }: { params: Params }) {
  const agent = await loadAgent(params);
  const tools = await fetchAgentTools(agent.id);

  return (
    <>
      <PageHeader
        title={`${agent.name} · Tools`}
        description="Define the tool catalog this agent can call. Edit as JSON."
      />
      <PageBody>
        <AgentHeader
          icon={agent.icon}
          gradient={agent.color}
          name={agent.name}
          subtitle={`${tools.length} tools available`}
        />
        <ToolCatalogEditor agentId={agent.id} agentName={agent.name} initialTools={tools} />
      </PageBody>
    </>
  );
}
