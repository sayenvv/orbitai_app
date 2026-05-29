"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useControlAgents } from "@/hooks/use-control-agents";
import { cn } from "@/lib/utils";

type AgentRailProps = {
  section: string;
};

export function AgentRail({ section }: AgentRailProps) {
  const params = useParams<{ agentId?: string }>();
  const activeId = params?.agentId;
  const { data: agents = [], isLoading } = useControlAgents();

  return (
    <aside className="hidden lg:flex w-52 shrink-0 flex-col border-r bg-card/30">
      <div className="px-4 h-12 flex items-center border-b">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Agents
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        {agents.map((agent) => {
          const Icon = agent.icon;
          const isActive = activeId === agent.id || activeId === agent.slug;
          return (
            <Link
              key={agent.id}
              href={`/${section}/${agent.id}`}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors group",
                isActive
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "hover:bg-accent/40 text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "h-6 w-6 rounded-md flex items-center justify-center bg-gradient-to-br shrink-0",
                  agent.color,
                )}
              >
                <Icon className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate leading-none">{agent.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-none truncate">
                  {agent.status}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
