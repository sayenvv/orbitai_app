import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentHeader } from "@/components/agent-header";
import { AdaptiveCardEditor } from "@/components/adaptive-card-editor";
import { loadAgent } from "@/lib/agent-page";
import { fetchAgentAdaptiveCards } from "@/lib/control-api-server";

type Params = Promise<{ agentId: string }>;

export default async function AgentAdaptiveCardsPage({ params }: { params: Params }) {
  const agent = await loadAgent(params);
  const cards = await fetchAgentAdaptiveCards(agent.id);

  return (
    <>
      <PageHeader
        title={`${agent.name} · Adaptive Cards`}
        description="Define the Adaptive Card templates this agent can render. Edit as JSON."
      />
      <PageBody>
        <AgentHeader
          icon={agent.icon}
          gradient={agent.color}
          name={agent.name}
          subtitle={`${cards.length} card${cards.length === 1 ? "" : "s"} configured`}
        />
        <AdaptiveCardEditor agentId={agent.id} agentName={agent.name} initialCards={cards} />
      </PageBody>
    </>
  );
}
