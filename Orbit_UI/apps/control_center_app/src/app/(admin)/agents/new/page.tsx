import { PageHeader, PageBody } from "@/components/page-shell";
import { AgentForm } from "@/components/agent-form";

export default function NewAgentPage() {
  return (
    <>
      <PageHeader
        title="New agent"
        description="Create a new AI agent. You can fine-tune model, tools and theme afterwards."
      />
      <PageBody>
        <AgentForm mode="create" />
      </PageBody>
    </>
  );
}
