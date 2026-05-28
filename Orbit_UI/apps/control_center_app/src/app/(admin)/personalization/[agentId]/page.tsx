import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentHeader, IdBadge } from "@/components/agent-header";
import { Card } from "@/components/ui/field";
import { loadAgent } from "@/lib/agent-page";
import { getPersonalizationForAgent } from "@/lib/data";
import { cn } from "@/lib/utils";

type Params = Promise<{ agentId: string }>;

const TONE_OPTIONS = ["Friendly", "Concise", "Formal", "Playful", "Empathetic"];
const LENGTH_OPTIONS = ["Short", "Medium", "Long"];
const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "Hindi"];

export default async function AgentPersonalizationPage({ params }: { params: Params }) {
  const agent = await loadAgent(params);
  const personalization = getPersonalizationForAgent(agent.id);

  const greeting = personalization?.greeting ?? `Hi! I'm ${agent.name}. How can I help?`;
  const avatar = personalization?.avatarEmoji ?? "🤖";
  const promptsText = (personalization?.quickPrompts ?? ["How can I help?"]).join("\n");
  const tone = personalization?.tone ?? "Friendly";
  const length = personalization?.responseLength ?? "Medium";

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
          trailing={personalization && <IdBadge label="Personalization ID" value={personalization.id} />}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
          <Card title="Greeting" description="Shown on first open">
            <input
              defaultValue={greeting}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Card>

          <Card title="Avatar emoji" description="Quick visual identifier">
            <input
              defaultValue={avatar}
              className="w-24 rounded-lg border bg-background px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Card>

          <Card title="Quick prompts" description="Suggestions shown above the chat input">
            <textarea
              defaultValue={promptsText}
              rows={6}
              className="w-full rounded-lg border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Card>

          <Card title="Tone" description="Default response style">
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs hover:bg-accent transition-colors",
                    t === tone && "bg-accent text-accent-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Response length" description="Token budget guide for replies">
            <select defaultValue={length} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
              {LENGTH_OPTIONS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Card>

          <Card title="Language" description="Preferred reply language">
            <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
