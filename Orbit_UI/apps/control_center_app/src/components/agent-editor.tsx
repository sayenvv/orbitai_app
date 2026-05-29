"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentForm } from "@/components/agent-form";
import { FormAlert } from "@/components/form-alert";
import { useControlAgent } from "@/hooks/use-control-agents";
import { getApiErrorMessage } from "@/lib/orbit-api";

export function AgentEditor({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params);
  const searchParams = useSearchParams();
  const { data: agent, isLoading, error } = useControlAgent(agentId);
  const flashSuccess =
    searchParams.get("created") === "1"
      ? "Agent created successfully. You can continue editing below."
      : undefined;

  if (isLoading) {
    return (
      <>
        <PageHeader title="Edit agent" description="Loading…" />
        <PageBody>
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading agent…
          </div>
        </PageBody>
      </>
    );
  }

  if (error || !agent) {
    return (
      <>
        <PageHeader title="Edit agent" description="Agent not found" />
        <PageBody>
          <FormAlert variant="error" title="Could not load agent">
            {getApiErrorMessage(error, "This agent may have been removed or you may not have access.")}
          </FormAlert>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Edit · ${agent.name}`}
        description="Update identity, appearance, and starter behavior for this agent."
      />
      <PageBody>
        <AgentForm
          mode="edit"
          flashSuccess={flashSuccess}
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
