import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentHeader, IdBadge } from "@/components/agent-header";
import { Section, Row, Toggle } from "@/components/ui/field";
import { loadAgent } from "@/lib/agent-page";
import { getConfigurationForAgent } from "@/lib/data";

type Params = Promise<{ agentId: string }>;

export default async function AgentConfigurationPage({ params }: { params: Params }) {
  const agent = await loadAgent(params);
  const config = getConfigurationForAgent(agent.id);

  return (
    <>
      <PageHeader
        title={`${agent.name} · Configuration`}
        description="Model, prompts, and runtime behaviour for this agent."
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors">
            Save changes
          </button>
        }
      />
      <PageBody>
        <AgentHeader
          icon={agent.icon}
          gradient={agent.color}
          name={agent.name}
          subtitle={agent.description}
          trailing={config && <IdBadge label="Configuration ID" value={config.id} />}
        />

        <div className="space-y-4 max-w-3xl">
          <Section title="Identity">
            <Row label="Display name">
              <input
                defaultValue={agent.name}
                className="rounded-lg border bg-background px-3 py-1.5 text-sm w-72"
              />
            </Row>
            <Row label="Slug">
              <input
                defaultValue={agent.slug}
                disabled
                className="rounded-lg border bg-muted/50 px-3 py-1.5 text-sm w-72 text-muted-foreground"
              />
            </Row>
            <Row label="Agent ID">
              <input
                defaultValue={agent.id}
                disabled
                className="rounded-lg border bg-muted/50 px-3 py-1.5 text-sm w-72 text-muted-foreground font-mono text-[11px]"
              />
            </Row>
            <Row label="Status">
              <select defaultValue={agent.status} className="rounded-lg border bg-background px-3 py-1.5 text-sm">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </Row>
          </Section>

          <Section title="Model">
            <Row label="Provider">
              <select className="rounded-lg border bg-background px-3 py-1.5 text-sm">
                <option>OpenAI</option>
                <option>Azure OpenAI</option>
                <option>Anthropic</option>
              </select>
            </Row>
            <Row label="Model">
              <input
                defaultValue={config?.model ?? "gpt-4o-mini"}
                className="rounded-lg border bg-background px-3 py-1.5 text-sm w-56"
              />
            </Row>
            <Row label="Temperature">
              <input
                type="number"
                defaultValue={config?.temperature ?? 0.7}
                step={0.1}
                className="rounded-lg border bg-background px-3 py-1.5 text-sm w-24"
              />
            </Row>
            <Row label="Max tokens">
              <input
                type="number"
                defaultValue={config?.maxTokens ?? 2048}
                className="rounded-lg border bg-background px-3 py-1.5 text-sm w-24"
              />
            </Row>
          </Section>

          <Section title="System prompt">
            <div className="p-4">
              <textarea
                defaultValue={config?.systemPrompt ?? `You are ${agent.name}. ${agent.description}.`}
                rows={6}
                className="w-full rounded-lg border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </Section>

          <Section title="Rate limits">
            <Row label="Requests / minute (free)">
              <input type="number" defaultValue={20} className="rounded-lg border bg-background px-3 py-1.5 text-sm w-24" />
            </Row>
            <Row label="Requests / minute (pro)">
              <input type="number" defaultValue={200} className="rounded-lg border bg-background px-3 py-1.5 text-sm w-24" />
            </Row>
          </Section>

          <Section title="Feature flags">
            <Toggle label="Enable streaming responses" defaultOn />
            <Toggle label="Enable file uploads" defaultOn />
            <Toggle label="Enable voice input" />
            <Toggle label="Allow web search" />
          </Section>
        </div>
      </PageBody>
    </>
  );
}
