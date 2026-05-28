import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentHeader } from "@/components/agent-header";
import { loadAgent } from "@/lib/agent-page";
import { listWidgets, getWidgetIdsForAgent } from "@/lib/data";
import { cn } from "@/lib/utils";

type Params = Promise<{ agentId: string }>;

export default async function AgentWidgetsPage({ params }: { params: Params }) {
  const agent = await loadAgent(params);
  const widgets = listWidgets();
  const enabledSet = new Set(getWidgetIdsForAgent(agent.id));

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
          subtitle={`${enabledSet.size} widgets enabled`}
        />

        <div className="rounded-xl border bg-card">
          {widgets.map((w, i) => {
            const Wicon = w.icon;
            const enabled = enabledSet.has(w.id);
            return (
              <div
                key={w.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  i !== widgets.length - 1 && "border-b"
                )}
              >
                <div className="h-9 w-9 rounded-lg bg-accent/60 flex items-center justify-center">
                  <Wicon className="h-4 w-4 text-foreground/80" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none">{w.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{w.description}</p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                  {w.key}
                </span>
                <button
                  type="button"
                  aria-label={`Toggle ${w.name}`}
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    enabled ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                      enabled ? "left-[18px]" : "left-0.5"
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
