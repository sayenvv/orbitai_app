"use client";

import Link from "next/link";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { AGENT_SECTIONS, agentSectionHref } from "@/lib/agent-sections";
import { useControlAgents } from "@/hooks/use-control-agents";
import { AgentListingIcon } from "@orbit/ui";
import { FormAlert } from "@/components/form-alert";
import { getApiErrorMessage } from "@/lib/orbit-api";

export function AgentsListPage() {
  const { data: agents = [], isLoading, error } = useControlAgents();

  return (
    <>
      <PageHeader
        title="Agents"
        description="Configure the AI agents available across your apps."
        actions={
          <Link
            href="/agents/new"
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white px-3.5 py-2 text-xs font-semibold shadow-sm hover:shadow-md hover:from-indigo-600 hover:to-violet-700 transition-all"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
              <Plus className="h-3 w-3" />
            </span>
            New agent
          </Link>
        }
      />
      <PageBody>
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading agents…
          </div>
        )}
        {error && (
          <FormAlert variant="error" title="Could not load agents">
            {getApiErrorMessage(error, "Failed to load agents. Is the API running on port 8000?")}
          </FormAlert>
        )}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="relative rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow group"
                >
                  <Link
                    href={`/agents/${agent.id}/edit`}
                    title="Edit agent"
                    className="absolute top-3 right-3 inline-flex items-center justify-center h-7 w-7 rounded-md border bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-accent transition-all"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>

                  <div className="flex items-start justify-between mb-3 pr-9">
                    <AgentListingIcon
                      iconKey={agent.iconKey}
                      colorKey={agent.colorKey}
                      size="md"
                      iconClassName="h-4 w-4"
                      className="h-9 w-9 rounded-lg p-0"
                    />
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                          (agent.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground")
                        }
                      >
                        {agent.status}
                      </span>
                      {agent.slug === "clovai" && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Default chat
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/agents/${agent.id}/edit`}
                    className="block group-hover:text-primary transition-colors"
                  >
                    <p className="text-sm font-semibold tracking-tight">{agent.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{agent.description}</p>
                  </Link>

                  <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                    {AGENT_SECTIONS.map((q) => {
                      const Qicon = q.icon;
                      return (
                        <Link
                          key={q.section}
                          href={agentSectionHref(agent.id, q.section)}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium hover:bg-accent transition-colors"
                        >
                          <Qicon className="h-3 w-3" />
                          {q.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

            <Link
              href="/agents/new"
              className="rounded-xl border border-dashed bg-card/40 p-4 flex flex-col items-center justify-center text-center min-h-[180px] hover:border-primary/60 hover:bg-card transition-colors group"
            >
              <span className="h-9 w-9 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary transition-colors">
                <Plus className="h-4 w-4" />
              </span>
              <p className="text-sm font-medium mt-3">Create new agent</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[180px]">
                Set up a new agent with its own icon, theme and tool catalog.
              </p>
            </Link>
          </div>
        )}
      </PageBody>
    </>
  );
}
