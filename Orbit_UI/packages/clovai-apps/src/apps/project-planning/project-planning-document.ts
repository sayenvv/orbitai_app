import type { PlanningArtifactFormat } from "./project-planning-catalog";
import type { PlanningWorksheetContent, WorksheetBlock } from "./project-planning-worksheet";
import { PROJECT_PLANNING_PHASES } from "./project-planning-catalog";

export const CRIMINAL_DETECTION_PROJECT_ID = "criminal-detection-python-flutter";

export type ProjectPlanningArtifactRecord = {
  id: string;
  phaseId: string;
  label: string;
  description: string;
  format: PlanningArtifactFormat;
  worksheet?: PlanningWorksheetContent;
};

export type ProjectPlanningPhaseRecord = {
  id: string;
  label: string;
  artifacts: ProjectPlanningArtifactRecord[];
};

export type ProjectPlanningWorkspaceState = {
  reviewedArtifactIds: string[];
  activePhaseId: string;
  activeArtifactId: string | null;
  worksheetsByArtifactId: Record<string, PlanningWorksheetContent>;
};

export type ProjectPlanningDocument = {
  id: string;
  name: string;
  summary: string;
  stack: { backend: string; mobile: string };
  phases: ProjectPlanningPhaseRecord[];
  state: ProjectPlanningWorkspaceState;
  updatedAt: string;
};

function stableBlockId(artifactId: string, suffix: string): string {
  return `${artifactId}--${suffix}`;
}

function criminalDetectionDescription(phaseLabel: string, artifactLabel: string): string {
  return (
    `${artifactLabel} for the Criminal Detection program (${phaseLabel}). ` +
    "Python powers detection pipelines, case APIs, evidence storage, and model serving; " +
    "Flutter delivers mobile workflows for reporting, officer alerts, and case follow-up."
  );
}

function criminalDetectionWorksheet(
  artifactId: string,
  label: string,
  description: string,
  format: PlanningArtifactFormat,
): PlanningWorksheetContent {
  const blocks: WorksheetBlock[] = [
    { id: stableBlockId(artifactId, "heading"), type: "heading", text: label },
    { id: stableBlockId(artifactId, "purpose"), type: "paragraph", text: description },
    {
      id: stableBlockId(artifactId, "body"),
      type: "paragraph",
      text:
        "Outline detection scenarios (CCTV feeds, citizen reports, officer uploads), data sources, " +
        "privacy constraints, and integration points between the Python backend and Flutter clients.",
    },
  ];

  if (format === "diagram") {
    blocks.push({
      id: stableBlockId(artifactId, "flow"),
      type: "flowchart",
      nodes: [
        { id: stableBlockId(artifactId, "n1"), text: "Report / Feed" },
        { id: stableBlockId(artifactId, "n2"), text: "Python analyze" },
        { id: stableBlockId(artifactId, "n3"), text: "Score & route" },
        { id: stableBlockId(artifactId, "n4"), text: "Flutter alert" },
      ],
    });
  } else if (format === "matrix") {
    blocks.push({
      id: stableBlockId(artifactId, "matrix"),
      type: "matrix",
      headers: ["Criteria", "MVP", "Scale-up"],
      rows: [
        ["Detection accuracy", "", ""],
        ["Mobile UX", "", ""],
        ["Ops cost", "", ""],
      ],
    });
  }

  return { blocks };
}

export function buildCriminalDetectionProjectDocument(): ProjectPlanningDocument {
  const phases: ProjectPlanningPhaseRecord[] = PROJECT_PLANNING_PHASES.map((phase) => ({
    id: phase.id,
    label: phase.label,
    artifacts: phase.artifacts.map((artifact) => {
      const description = criminalDetectionDescription(phase.label, artifact.label);
      return {
        id: artifact.id,
        phaseId: artifact.phaseId,
        label: artifact.label,
        format: artifact.format,
        description,
        worksheet: criminalDetectionWorksheet(
          artifact.id,
          artifact.label,
          description,
          artifact.format,
        ),
      };
    }),
  }));

  const firstPhase = phases[0];
  const firstArtifact = firstPhase?.artifacts[0];
  const worksheetsByArtifactId: Record<string, PlanningWorksheetContent> = {};
  for (const phase of phases) {
    for (const artifact of phase.artifacts) {
      if (artifact.worksheet) {
        worksheetsByArtifactId[artifact.id] = artifact.worksheet;
      }
    }
  }

  return {
    id: CRIMINAL_DETECTION_PROJECT_ID,
    name: "Criminal Detection",
    summary:
      "End-to-end criminal detection platform using Python for ML pipelines, APIs, and evidence services, " +
      "with Flutter mobile apps for citizens and field officers.",
    stack: { backend: "Python", mobile: "Flutter" },
    phases,
    state: {
      reviewedArtifactIds: [],
      activePhaseId: firstPhase?.id ?? "research-discovery",
      activeArtifactId: firstArtifact?.id ?? null,
      worksheetsByArtifactId,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function documentToPersistedJson(document: ProjectPlanningDocument): string {
  return JSON.stringify(document, null, 2);
}
