import {
  Bot,
  Boxes,
  Calendar,
  ClipboardList,
  Database,
  GitBranch,
  Layers,
  Layout,
  Lightbulb,
  Network,
  Search,
  Shield,
  TestTube,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type PlanningArtifactFormat = "diagram" | "document" | "matrix";

export type PlanningArtifact = {
  id: string;
  phaseId: string;
  label: string;
  description: string;
  format: PlanningArtifactFormat;
};

export type PlanningPhase = {
  id: string;
  label: string;
  icon: LucideIcon;
  artifacts: PlanningArtifact[];
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function artifact(
  phaseId: string,
  label: string,
  format: PlanningArtifactFormat = "diagram",
): PlanningArtifact {
  return {
    id: `${phaseId}--${slug(label)}`,
    phaseId,
    label,
    format,
    description: `Create and maintain a ${label} for this phase of the project.`,
  };
}

function phase(
  id: string,
  label: string,
  icon: LucideIcon,
  items: Array<{ label: string; format?: PlanningArtifactFormat }>,
): PlanningPhase {
  return {
    id,
    label,
    icon,
    artifacts: items.map((item) => artifact(id, item.label, item.format ?? "diagram")),
  };
}

/** Full Project Planning & Development hierarchy. */
export const PROJECT_PLANNING_ROOT_LABEL = "Project Planning & Development";

export const PROJECT_PLANNING_PHASES: PlanningPhase[] = [
  phase("research-discovery", "Research & Discovery", Search, [
    { label: "Mind Map" },
    { label: "Stakeholder Map" },
    { label: "SWOT Analysis", format: "matrix" },
    { label: "Competitor Analysis", format: "document" },
    { label: "Feasibility Study", format: "document" },
    { label: "Scope Diagram" },
    { label: "Business Model Canvas", format: "document" },
  ]),
  phase("requirements-analysis", "Requirements Analysis", ClipboardList, [
    { label: "User Persona", format: "document" },
    { label: "User Journey Map" },
    { label: "User Story Map", format: "document" },
    { label: "Use Case Diagram" },
    { label: "Functional Requirements", format: "document" },
    { label: "Non-Functional Requirements", format: "document" },
  ]),
  phase("business-process-design", "Business Process Design", Workflow, [
    { label: "Process Flow Diagram" },
    { label: "Workflow Diagram" },
    { label: "BPMN Diagram" },
    { label: "SIPOC Diagram" },
    { label: "Value Stream Map" },
    { label: "Decision Tree Diagram" },
  ]),
  phase("frontend-design", "Frontend Design", Layout, [
    { label: "Information Architecture", format: "document" },
    { label: "Site Map" },
    { label: "Navigation Flow" },
    { label: "User Flow" },
    { label: "Screen Flow" },
    { label: "Wireframes", format: "document" },
    { label: "Mockups", format: "document" },
    { label: "Design System", format: "document" },
    { label: "Component Hierarchy" },
  ]),
  phase("backend-design", "Backend Design", Database, [
    { label: "ERD" },
    { label: "Database Schema", format: "document" },
    { label: "Data Flow Diagram" },
    { label: "Data Mapping Diagram" },
    { label: "Data Lineage Diagram" },
    { label: "API Flow Diagram" },
    { label: "Service Dependency Diagram" },
    { label: "Domain Model Diagram" },
  ]),
  phase("system-architecture", "System Architecture", Boxes, [
    { label: "High-Level Architecture" },
    { label: "Solution Architecture" },
    { label: "Component Diagram" },
    { label: "Microservice Architecture" },
    { label: "Cloud Architecture" },
    { label: "Network Architecture" },
    { label: "Infrastructure Architecture" },
    { label: "Deployment Architecture" },
  ]),
  phase("ai-systems-design", "AI Systems Design", Bot, [
    { label: "AI Workflow Diagram" },
    { label: "LLM Integration Diagram" },
    { label: "Prompt Flow Diagram" },
    { label: "Agent Flow Diagram" },
    { label: "Multi-Agent Architecture" },
    { label: "RAG Architecture Diagram" },
    { label: "Vector Database Architecture" },
    { label: "Knowledge Graph Diagram" },
    { label: "Model Routing Diagram" },
    { label: "AI Pipeline Diagram" },
    { label: "Training Pipeline Diagram" },
    { label: "Inference Pipeline Diagram" },
    { label: "MCP Architecture Diagram" },
    { label: "Tool Calling Diagram" },
    { label: "Context Management Diagram" },
    { label: "Memory Architecture Diagram" },
    { label: "AI Evaluation Flow" },
  ]),
  phase("security-design", "Security Design", Shield, [
    { label: "Authentication Flow" },
    { label: "Authorization Diagram" },
    { label: "Threat Model", format: "document" },
    { label: "Trust Boundary Diagram" },
    { label: "Attack Tree" },
    { label: "Security Architecture" },
  ]),
  phase("software-design-uml", "Software Design (UML)", Layers, [
    { label: "Class Diagram" },
    { label: "Object Diagram" },
    { label: "Package Diagram" },
    { label: "Component Diagram" },
    { label: "Sequence Diagram" },
    { label: "Activity Diagram" },
    { label: "State Machine Diagram" },
    { label: "Communication Diagram" },
    { label: "Timing Diagram" },
    { label: "Interaction Overview Diagram" },
  ]),
  phase("integration-design", "Integration Design", Network, [
    { label: "System Integration Diagram" },
    { label: "API Integration Diagram" },
    { label: "Event Flow Diagram" },
    { label: "Message Queue Diagram" },
    { label: "Webhook Flow Diagram" },
    { label: "Third-Party Integration Diagram" },
  ]),
  phase("testing-qa", "Testing & QA", TestTube, [
    { label: "Test Workflow Diagram" },
    { label: "Test Coverage Matrix", format: "matrix" },
    { label: "Traceability Matrix", format: "matrix" },
    { label: "Defect Lifecycle Diagram" },
    { label: "Performance Testing Flow" },
  ]),
  phase("devops-deployment", "DevOps & Deployment", GitBranch, [
    { label: "CI/CD Pipeline Diagram" },
    { label: "Release Flow Diagram" },
    { label: "Environment Diagram" },
    { label: "Kubernetes Architecture" },
    { label: "Monitoring Architecture" },
    { label: "Logging Architecture" },
    { label: "Infrastructure Diagram" },
  ]),
  phase("project-management", "Project Management", Calendar, [
    { label: "Work Breakdown Structure" },
    { label: "Gantt Chart", format: "document" },
    { label: "Roadmap Diagram" },
    { label: "Milestone Diagram" },
    { label: "Dependency Diagram" },
    { label: "RACI Matrix", format: "matrix" },
    { label: "Risk Matrix", format: "matrix" },
    { label: "Resource Allocation Diagram" },
  ]),
];

const defaultAllArtifacts = PROJECT_PLANNING_PHASES.flatMap((p) => p.artifacts);

export const PROJECT_PLANNING_ARTIFACT_COUNT = defaultAllArtifacts.length;

function resolvePhases(phases?: PlanningPhase[]): PlanningPhase[] {
  return phases ?? PROJECT_PLANNING_PHASES;
}

function indexPhases(phases: PlanningPhase[]) {
  const allArtifacts = phases.flatMap((p) => p.artifacts);
  return {
    phases,
    allArtifacts,
    artifactById: new Map(allArtifacts.map((a) => [a.id, a])),
    phaseById: new Map(phases.map((p) => [p.id, p])),
  };
}

export function getPlanningPhase(id: string, phases?: PlanningPhase[]): PlanningPhase | undefined {
  return indexPhases(resolvePhases(phases)).phaseById.get(id);
}

export function getPlanningArtifact(id: string, phases?: PlanningPhase[]): PlanningArtifact | undefined {
  return indexPhases(resolvePhases(phases)).artifactById.get(id);
}

export function getDefaultPlanningArtifactId(phases?: PlanningPhase[]): string {
  const { allArtifacts } = indexPhases(resolvePhases(phases));
  return allArtifacts[0]?.id ?? "";
}

export function getDefaultPlanningPhaseId(phases?: PlanningPhase[]): string {
  return resolvePhases(phases)[0]?.id ?? "";
}

/** 1-based step index in the full hierarchy (1…13). */
export function getPhaseStepNumber(phaseId: string, phases?: PlanningPhase[]): number {
  const list = resolvePhases(phases);
  const index = list.findIndex((phase) => phase.id === phaseId);
  return index >= 0 ? index + 1 : 0;
}

export type PlanningArtifactPosition = {
  phase: PlanningPhase;
  artifact: PlanningArtifact;
  phaseStep: number;
  phaseCount: number;
  itemIndex: number;
  itemNumber: number;
  itemsInPhase: number;
};

export function getPlanningArtifactPosition(
  artifactId: string,
  phases?: PlanningPhase[],
): PlanningArtifactPosition | undefined {
  const list = resolvePhases(phases);
  const artifact = getPlanningArtifact(artifactId, list);
  if (!artifact) return undefined;
  const phase = getPlanningPhase(artifact.phaseId, list);
  if (!phase) return undefined;
  const itemIndex = phase.artifacts.findIndex((item) => item.id === artifactId);
  if (itemIndex < 0) return undefined;
  return {
    phase,
    artifact,
    phaseStep: getPhaseStepNumber(phase.id, list),
    phaseCount: list.length,
    itemIndex,
    itemNumber: itemIndex + 1,
    itemsInPhase: phase.artifacts.length,
  };
}

export function getAdjacentPlanningArtifact(
  artifactId: string,
  direction: "prev" | "next",
  phases?: PlanningPhase[],
): PlanningArtifact | undefined {
  const position = getPlanningArtifactPosition(artifactId, phases);
  if (!position) return undefined;
  const { phase, itemIndex } = position;
  const nextIndex = direction === "next" ? itemIndex + 1 : itemIndex - 1;
  return phase.artifacts[nextIndex];
}

export function getAdjacentPlanningPhase(
  phaseId: string,
  direction: "prev" | "next",
  phases?: PlanningPhase[],
): PlanningPhase | undefined {
  const list = resolvePhases(phases);
  const index = list.findIndex((phase) => phase.id === phaseId);
  if (index < 0) return undefined;
  const nextIndex = direction === "next" ? index + 1 : index - 1;
  return list[nextIndex];
}

export type PlanningSearchResult = {
  phases: Array<{
    phase: PlanningPhase;
    artifacts: PlanningArtifact[];
  }>;
  totalMatches: number;
};

export function searchPlanningCatalog(query: string, catalogPhases?: PlanningPhase[]): PlanningSearchResult {
  const source = resolvePhases(catalogPhases);
  const artifactCount = source.flatMap((p) => p.artifacts).length;
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      phases: source.map((phase) => ({
        phase,
        artifacts: phase.artifacts,
      })),
      totalMatches: artifactCount,
    };
  }

  const phases = source.map((phase) => {
    const phaseMatch = phase.label.toLowerCase().includes(q);
    const artifacts = phase.artifacts.filter(
      (item) =>
        phaseMatch ||
        item.label.toLowerCase().includes(q) ||
        item.format.includes(q) ||
        item.description.toLowerCase().includes(q),
    );
    return { phase, artifacts };
  }).filter((entry) => entry.artifacts.length > 0);

  const totalMatches = phases.reduce((sum, entry) => sum + entry.artifacts.length, 0);
  return { phases, totalMatches };
}
