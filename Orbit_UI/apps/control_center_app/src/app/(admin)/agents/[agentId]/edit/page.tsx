import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentForm } from "@/components/agent-form";
import { loadAgent } from "@/lib/agent-page";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const agent = await loadAgent(params);

  return (
    <>
      <PageHeader
        title={`Edit · ${agent.name}`}
        description="Update identity, appearance, and starter behavior for this agent."
      />
      <PageBody>
        <AgentForm
          mode="edit"
          agent={{
            id: agent.id,
            slug: agent.slug,
            name: agent.name,
            shortName: agent.shortName,
            description: agent.description,
            status: agent.status,
            iconKey: agent.iconKey,
            colorKey: agent.colorKey,
          }}
        />
      </PageBody>
    </>
  );
}
