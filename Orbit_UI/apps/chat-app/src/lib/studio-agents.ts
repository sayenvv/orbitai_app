import { buildHomeAgent, type HomeAgent } from "@/lib/agent-display";
import { studioWithPhase, type StudioPhase } from "@/lib/routes";

export type StudioWorkflowAgent = HomeAgent & {
  phase: StudioPhase;
  subtitle: string;
  status: "available" | "coming-soon";
  capabilities: string[];
};

export const STUDIO_WORKFLOW_AGENTS: StudioWorkflowAgent[] = [
  {
    ...buildHomeAgent({
      id: "ui-design",
      name: "UI Design Agent",
      shortName: "Design",
      description:
        "Turn product intent into interface direction — layouts, component structure, and design-ready specifications.",
      iconKey: "PenTool",
      colorKey: "violet",
    }),
    phase: "design",
    subtitle: "Interface & experience design",
    status: "coming-soon",
    capabilities: ["Wireframes", "Design systems", "Component specs"],
  },
  {
    ...buildHomeAgent({
      id: "project-planning",
      name: "Project Planning Agent",
      shortName: "Plan",
      description:
        "Generate structured project synopses and documentation from a brief or uploaded document.",
      iconKey: "BookOpen",
      colorKey: "indigo",
    }),
    phase: "plan",
    subtitle: "Synopsis & documentation",
    status: "available",
    capabilities: ["Project briefs", "Synopsis packages", "Section inventory"],
  },
  {
    ...buildHomeAgent({
      id: "development",
      name: "Development Agent",
      shortName: "Build",
      description:
        "Orchestrate code generation, workspace scaffolding, and delivery pipelines from your approved plan.",
      iconKey: "Code",
      colorKey: "emerald",
    }),
    phase: "development",
    subtitle: "Code & delivery pipeline",
    status: "available",
    capabilities: ["Workspace setup", "Code generation", "Pipeline execution"],
  },
];

export function studioAgentHref(phase: StudioPhase): string {
  return studioWithPhase(phase);
}
