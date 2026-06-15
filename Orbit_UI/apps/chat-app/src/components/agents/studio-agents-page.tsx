"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Bot } from "lucide-react";

import { studioRadius } from "@/components/studio/studio-ui";
import { studioAgentHref, STUDIO_WORKFLOW_AGENTS } from "@/lib/studio-agents";
import { cn } from "@/lib/utils";

export function StudioAgentsPage() {
  const router = useRouter();

  return (
    <div className="plan-agent-shell flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-8 md:px-8 md:py-12">
      <div className="plan-agent-inner w-full max-w-[1080px]">
        <header className="max-w-2xl">
          <span className="plan-agent-eyebrow">
            <Bot className="size-3" strokeWidth={2} />
            Studio Agents
          </span>
          <h1 className="mt-4 text-[1.85rem] font-semibold tracking-[-0.035em] text-foreground md:text-[2.1rem] md:leading-[1.1]">
            Workflow agents
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
            Purpose-built agents for design, planning, and development. Each opens the correct Studio
            workspace with the right deliverables and tooling pre-configured.
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STUDIO_WORKFLOW_AGENTS.map((agent, index) => {
            const Icon = agent.icon;
            const isAvailable = agent.status === "available";

            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => router.push(studioAgentHref(agent.phase))}
                className={cn(
                  "plan-agent-panel group flex h-full flex-col overflow-hidden text-left transition-shadow hover:shadow-[0_28px_56px_-36px_color-mix(in_oklab,var(--foreground)_18%,transparent)]",
                )}
              >
                <div className="plan-agent-panel-header flex items-start justify-between gap-3 px-4 py-3.5">
                  <span className="plan-agent-package-icon flex size-9 items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground">
                    <Icon className="size-4" strokeWidth={1.6} />
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="flex flex-1 flex-col px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {agent.subtitle}
                  </p>
                  <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                    {agent.name}
                  </h2>
                  <p className="mt-2 flex-1 text-[12px] leading-relaxed text-muted-foreground">
                    {agent.description}
                  </p>

                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {agent.capabilities.map((capability) => (
                      <li key={capability} className={cn("plan-agent-format-pill", studioRadius)}>
                        {capability}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border/50 bg-muted/10 px-4 py-3">
                  <span
                    className={cn(
                      "border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                      studioRadius,
                      isAvailable
                        ? "border-border/70 bg-background/80 text-foreground"
                        : "border-border/60 bg-background text-muted-foreground",
                    )}
                  >
                    {isAvailable ? "Available" : "Coming soon"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                    Open in Studio
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Agents run inside Studio — your brief, package selection, and workspace persist across phases.
        </p>
      </div>
    </div>
  );
}
