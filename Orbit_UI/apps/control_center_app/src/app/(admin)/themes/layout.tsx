import { AgentSectionLayout } from "@/components/agent-section-layout";

export default function ThemesLayout({ children }: { children: React.ReactNode }) {
  return <AgentSectionLayout section="themes">{children}</AgentSectionLayout>;
}
