import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentHeader } from "@/components/agent-header";
import { AdaptiveCardEditor } from "@/components/adaptive-card-editor";
import { loadAgent } from "@/lib/agent-page";
import { getAdaptiveCardsForAgent } from "@/lib/data";

type Params = Promise<{ agentId: string }>;

export default async function AgentAdaptiveCardsPage({ params }: { params: Params }) {
  const agent = await loadAgent(params);
  const cards = getAdaptiveCardsForAgent(agent.id);

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
        <AdaptiveCardEditor agentName={agent.name} initialCards={cards} />
      </PageBody>
    </>
  );
}
