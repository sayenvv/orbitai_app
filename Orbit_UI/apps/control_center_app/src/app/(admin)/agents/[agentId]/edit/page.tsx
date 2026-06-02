import { Suspense } from "react";
import { AgentEditor } from "@/components/agent-editor";

type Params = Promise<{ agentId: string }>;

export default function EditAgentPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading editor…</div>}>
      <AgentEditor params={params} />
    </Suspense>
  );
}
