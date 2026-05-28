import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentHeader } from "@/components/agent-header";
import { loadAgent } from "@/lib/agent-page";
import { resolveGradient } from "@/lib/data";
import { cn } from "@/lib/utils";

type Params = Promise<{ agentId: string }>;

// Theme presets derive from the same COLOR_MAP used by the data layer,
// so adding a new color in lib/data.ts automatically surfaces it here.
const PRESET_KEYS = ["indigo", "emerald", "rose", "amber", "sky", "slate"] as const;
const PRESETS = PRESET_KEYS.map((k) => ({
  id: k,
  name: k[0].toUpperCase() + k.slice(1),
  color: resolveGradient(k),
}));

const TOKEN_ROWS = [
  { label: "Border radius", value: "0.625rem" },
  { label: "Density", value: "comfortable" },
  { label: "Font (sans)", value: "Inter" },
  { label: "Bubble style", value: "rounded" },
  { label: "Dark mode", value: "follow system" },
];

export default async function AgentThemePage({ params }: { params: Params }) {
  const agent = await loadAgent(params);

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
          subtitle={`Current preset: ${agent.colorKey}`}
        />

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Color Preset
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {PRESETS.map((p) => {
              const isCurrent = agent.colorKey === p.id;
              return (
                <button
                  key={p.id}
                  className={cn(
                    "rounded-xl border bg-card p-4 text-left hover:shadow-sm transition-shadow",
                    isCurrent && "ring-2 ring-primary"
                  )}
                >
                  <div className={cn("h-16 w-full rounded-lg bg-gradient-to-br mb-3 shadow-inner", p.color)} />
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isCurrent ? "Current" : "primary scale"}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8 max-w-3xl">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Tokens
          </h2>
          <div className="rounded-xl border bg-card divide-y">
            {TOKEN_ROWS.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm">{row.label}</span>
                <code className="text-[11px] font-mono text-muted-foreground">{row.value}</code>
              </div>
            ))}
          </div>
        </section>
      </PageBody>
    </>
  );
}
