import { AgentSectionLayout } from "@/components/agent-section-layout";

export default function WidgetsLayout({ children }: { children: React.ReactNode }) {
  return <AgentSectionLayout section="widgets">{children}</AgentSectionLayout>;
}
