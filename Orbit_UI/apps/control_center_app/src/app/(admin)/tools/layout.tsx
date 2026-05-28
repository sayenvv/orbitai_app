import { AgentSectionLayout } from "@/components/agent-section-layout";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <AgentSectionLayout section="tools">{children}</AgentSectionLayout>;
}
