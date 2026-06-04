import {
  Bot,
  Boxes,
  Calendar,
  ClipboardList,
  Database,
  GitBranch,
  Layers,
  Layout,
  Network,
  Search,
  Shield,
  TestTube,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { PlanningArtifact, PlanningPhase } from "./project-planning-catalog";
import type { ProjectPlanningDocument, ProjectPlanningPhaseRecord } from "./project-planning-document";

const PHASE_ICONS: Record<string, LucideIcon> = {
  "research-discovery": Search,
  "requirements-analysis": ClipboardList,
  "business-process-design": Workflow,
  "frontend-design": Layout,
  "backend-design": Database,
  "system-architecture": Boxes,
  "ai-systems-design": Bot,
  "security-design": Shield,
  "software-design-uml": Layers,
  "integration-design": Network,
  "testing-qa": TestTube,
  "devops-deployment": GitBranch,
  "project-management": Calendar,
};

export function planningPhasesFromDocument(
  phaseRecords: ProjectPlanningPhaseRecord[],
): PlanningPhase[] {
  return phaseRecords.map((phase) => ({
    id: phase.id,
    label: phase.label,
    icon: PHASE_ICONS[phase.id] ?? Layers,
    artifacts: phase.artifacts.map(
      (artifact): PlanningArtifact => ({
        id: artifact.id,
        phaseId: artifact.phaseId,
        label: artifact.label,
        description: artifact.description,
        format: artifact.format,
      }),
    ),
  }));
}

export function applyDocumentToWorkspaceState(document: ProjectPlanningDocument): {
  phases: PlanningPhase[];
  reviewedIds: Set<string>;
  activePhaseId: string;
  activeArtifactId: string | null;
  worksheetsByArtifactId: ProjectPlanningDocument["state"]["worksheetsByArtifactId"];
} {
  return {
    phases: planningPhasesFromDocument(document.phases),
    reviewedIds: new Set(document.state.reviewedArtifactIds),
    activePhaseId: document.state.activePhaseId,
    activeArtifactId: document.state.activeArtifactId,
    worksheetsByArtifactId: document.state.worksheetsByArtifactId,
  };
}

export function buildDocumentFromWorkspace(
  base: ProjectPlanningDocument,
  input: {
    phases: PlanningPhase[];
    reviewedIds: Set<string>;
    activePhaseId: string;
    activeArtifactId: string | null;
    worksheetsByArtifactId: Record<string, import("./project-planning-worksheet").PlanningWorksheetContent>;
  },
): ProjectPlanningDocument {
  const phaseRecords: ProjectPlanningPhaseRecord[] = input.phases.map((phase) => ({
    id: phase.id,
    label: phase.label,
    artifacts: phase.artifacts.map((artifact) => ({
      id: artifact.id,
      phaseId: artifact.phaseId,
      label: artifact.label,
      description: artifact.description,
      format: artifact.format,
      worksheet: input.worksheetsByArtifactId[artifact.id],
    })),
  }));

  return {
    ...base,
    phases: phaseRecords,
    state: {
      reviewedArtifactIds: [...input.reviewedIds],
      activePhaseId: input.activePhaseId,
      activeArtifactId: input.activeArtifactId,
      worksheetsByArtifactId: input.worksheetsByArtifactId,
    },
    updatedAt: new Date().toISOString(),
  };
}
