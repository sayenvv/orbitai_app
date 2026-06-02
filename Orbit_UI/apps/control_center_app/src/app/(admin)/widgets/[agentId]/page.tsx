import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentHeader } from "@/components/agent-header";
import { WidgetToggles } from "@/components/widget-toggles";
import { loadAgent } from "@/lib/agent-page";
import { fetchAgentWidgets } from "@/lib/control-api-server";

type Params = Promise<{ agentId: string }>;

export default async function AgentWidgetsPage({ params }: { params: Params }) {
  const agent = await loadAgent(params);
  const { widgets, enabledWidgetIds } = await fetchAgentWidgets(agent.id);

  return (
    <>
      <PageHeader
        title={`${agent.name} · Widgets`}
        description="Pick which UI widgets this agent is allowed to render in responses."
      />
      <PageBody>
        <AgentHeader
          icon={agent.icon}
          gradient={agent.color}
          name={agent.name}
          subtitle={`${enabledWidgetIds.length} widgets enabled`}
        />

        <WidgetToggles
          agentId={agent.id}
          widgets={widgets}
          initialEnabledIds={enabledWidgetIds}
        />
      </PageBody>
    </>
  );
}
