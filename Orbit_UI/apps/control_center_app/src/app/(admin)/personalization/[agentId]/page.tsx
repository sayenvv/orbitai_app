import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentHeader } from "@/components/agent-header";
import { PersonalizationEditor } from "@/components/personalization-editor";
import { loadAgent } from "@/lib/agent-page";
import { fetchAgentPersonalization } from "@/lib/control-api-server";

type Params = Promise<{ agentId: string }>;

export default async function AgentPersonalizationPage({ params }: { params: Params }) {
  const agent = await loadAgent(params);
  const personalization = await fetchAgentPersonalization(agent.id);

  return (
    <>
      <PageHeader
        title={`${agent.name} · Personalization`}
        description="Greeting, prompts, and tone for this agent."
      />
      <PageBody>
        <AgentHeader
          icon={agent.icon}
          gradient={agent.color}
          name={agent.name}
          subtitle={agent.description}
        />

        <PersonalizationEditor
          agentId={agent.id}
          agentName={agent.name}
          initial={personalization}
        />
      </PageBody>
    </>
  );
}
