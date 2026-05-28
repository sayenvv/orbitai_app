import { AgentRail } from "@/components/agent-rail";

/**
 * Two-column layout used by every per-agent section (configuration, widgets,
 * personalization, themes, tools). The rail on the left shows the agent list;
 * the right column hosts the page content.
 */
export function AgentSectionLayout({
  section,
  children,
}: {
  section: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-0">
      <AgentRail section={section} />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}
