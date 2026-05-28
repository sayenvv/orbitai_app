import { AgentSectionLayout } from "@/components/agent-section-layout";

export default function PersonalizationLayout({ children }: { children: React.ReactNode }) {
  return <AgentSectionLayout section="personalization">{children}</AgentSectionLayout>;
}
