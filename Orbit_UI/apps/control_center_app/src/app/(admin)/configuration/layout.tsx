import { AgentSectionLayout } from "@/components/agent-section-layout";

export default function ConfigurationLayout({ children }: { children: React.ReactNode }) {
  return <AgentSectionLayout section="configuration">{children}</AgentSectionLayout>;
}
