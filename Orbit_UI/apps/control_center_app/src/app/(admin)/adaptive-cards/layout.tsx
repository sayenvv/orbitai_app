import { AgentSectionLayout } from "@/components/agent-section-layout";

export default function AdaptiveCardsLayout({ children }: { children: React.ReactNode }) {
  return <AgentSectionLayout section="adaptive-cards">{children}</AgentSectionLayout>;
}
