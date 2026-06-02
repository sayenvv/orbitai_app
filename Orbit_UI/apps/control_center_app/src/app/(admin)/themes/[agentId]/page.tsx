import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentHeader } from "@/components/agent-header";
import { ThemeEditor } from "@/components/theme-editor";
import { loadAgent } from "@/lib/agent-page";
import { fetchAgentTheme } from "@/lib/control-api-server";

type Params = Promise<{ agentId: string }>;

export default async function AgentThemePage({ params }: { params: Params }) {
  const agent = await loadAgent(params);
  const theme = await fetchAgentTheme(agent.id);

  return (
    <>
      <PageHeader
        title={`${agent.name} · Theme`}
        description="Colors, density, and visual identity for this agent."
      />
      <PageBody>
        <AgentHeader
          icon={agent.icon}
          gradient={agent.color}
          name={agent.name}
          subtitle={`Current preset: ${theme.color_key}`}
        />

        <ThemeEditor agentId={agent.id} initialTheme={theme} />
      </PageBody>
    </>
  );
}
