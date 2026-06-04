import {
  BookOpen,
  FileText,
  Globe,
  Layers,
  Lightbulb,
  MessageSquare,
  ScrollText,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { ResearchCompanionGeneratableInsightType } from "./insight-types";

/** Workspace mode selected when creating a new Insights workspace. */
export type ResearchCompanionWorkspaceTypeId = "academic-research" | "literature-review";

export type WorksheetTabKind = "document" | "insight" | "deliverable";

export type WorksheetTabDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  hint: string;
  icon: LucideIcon;
  kind: WorksheetTabKind;
  /** Maps research insight worksheet tabs to API insight types. */
  insightType?: ResearchCompanionGeneratableInsightType;
};

export type ResearchCompanionWorkspaceTypeDefinition = {
  id: ResearchCompanionWorkspaceTypeId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  /** Matches `recentAccentKeys` / home card rotation. */
  accentKey: "emerald" | "teal" | "cyan" | "violet" | "amber" | "rose";
  workflowSteps: readonly string[];
  worksheetTabs: readonly WorksheetTabDefinition[];
  /** Shown on home type cards */
  highlights: readonly string[];
};

export const RESEARCH_COMPANION_WORKSPACE_TYPES: ResearchCompanionWorkspaceTypeDefinition[] = [
  {
    id: "academic-research",
    label: "Academic research",
    shortLabel: "Research",
    description:
      "Upload papers and sources, generate AI insights, and navigate summaries, evidence, and study notes.",
    icon: BookOpen,
    accentKey: "emerald",
    highlights: ["Summaries", "Evidence maps", "Keyword clouds", "Discussion Q&A"],
    workflowSteps: [
      "Choose research workspace",
      "Attach source documents",
      "Generate AI insights",
      "Review findings and annotate",
    ],
    worksheetTabs: [
      {
        id: "document",
        label: "Document",
        shortLabel: "Document",
        hint: "Source PDF and annotations",
        icon: FileText,
        kind: "document",
      },
      {
        id: "summary",
        label: "Insights summary",
        shortLabel: "Summary",
        hint: "Priority takeaways from the source",
        icon: Sparkles,
        kind: "insight",
        insightType: "summary",
      },
      {
        id: "notes",
        label: "Important notes",
        shortLabel: "Notes",
        hint: "Highlights and marked passages",
        icon: ScrollText,
        kind: "insight",
      },
      {
        id: "evidence",
        label: "Evidence map",
        shortLabel: "Evidence",
        hint: "Claims, methods, and citations",
        icon: Target,
        kind: "insight",
        insightType: "evidence",
      },
      {
        id: "keywords",
        label: "Keyword cloud",
        shortLabel: "Keywords",
        hint: "Important terms and topics",
        icon: Lightbulb,
        kind: "insight",
        insightType: "keywords",
      },
      {
        id: "concepts",
        label: "Concept summary",
        shortLabel: "Concepts",
        hint: "Themes and concept groupings",
        icon: Layers,
        kind: "insight",
        insightType: "concepts",
      },
      {
        id: "questions",
        label: "Discussion Q&A",
        shortLabel: "Q&A",
        hint: "Review prompts and guided questions",
        icon: MessageSquare,
        kind: "insight",
        insightType: "questions",
      },
    ],
  },
  {
    id: "literature-review",
    label: "Literature review",
    shortLabel: "Literature",
    description:
      "Compare and synthesize multiple papers with themed summaries and citation-focused views.",
    icon: Globe,
    accentKey: "violet",
    highlights: ["Multi-source", "Themes", "Gaps", "Bibliography"],
    workflowSteps: [
      "Add sources to the workspace",
      "Extract themes across papers",
      "Map gaps and contributions",
      "Export synthesis notes",
    ],
    worksheetTabs: [
      {
        id: "document",
        label: "Sources",
        shortLabel: "Sources",
        hint: "Primary and secondary sources",
        icon: FileText,
        kind: "document",
      },
      {
        id: "synthesis",
        label: "Synthesis",
        shortLabel: "Synthesis",
        hint: "Cross-paper themes and narrative",
        icon: Sparkles,
        kind: "deliverable",
      },
      {
        id: "themes",
        label: "Themes",
        shortLabel: "Themes",
        hint: "Topic clusters across literature",
        icon: Layers,
        kind: "deliverable",
      },
      {
        id: "gaps",
        label: "Research gaps",
        shortLabel: "Gaps",
        hint: "Open questions and opportunities",
        icon: Lightbulb,
        kind: "deliverable",
      },
      {
        id: "citations",
        label: "Citations",
        shortLabel: "Citations",
        hint: "Bibliography and reference map",
        icon: BookOpen,
        kind: "deliverable",
      },
    ],
  },
];

const workspaceTypeMap = new Map(
  RESEARCH_COMPANION_WORKSPACE_TYPES.map((type) => [type.id, type]),
);

export const DEFAULT_WORKSPACE_TYPE_ID: ResearchCompanionWorkspaceTypeId = "academic-research";

export function getWorkspaceTypeDefinition(
  id: ResearchCompanionWorkspaceTypeId | string | null | undefined,
): ResearchCompanionWorkspaceTypeDefinition {
  if (id && workspaceTypeMap.has(id as ResearchCompanionWorkspaceTypeId)) {
    return workspaceTypeMap.get(id as ResearchCompanionWorkspaceTypeId)!;
  }
  return workspaceTypeMap.get(DEFAULT_WORKSPACE_TYPE_ID)!;
}

export function parseWorkspaceTypeParam(
  value: string | null | undefined,
): ResearchCompanionWorkspaceTypeId {
  if (value && workspaceTypeMap.has(value as ResearchCompanionWorkspaceTypeId)) {
    return value as ResearchCompanionWorkspaceTypeId;
  }
  return DEFAULT_WORKSPACE_TYPE_ID;
}

export function getDefaultWorksheetTabId(
  workspaceTypeId: ResearchCompanionWorkspaceTypeId,
): string {
  const type = getWorkspaceTypeDefinition(workspaceTypeId);
  return type.worksheetTabs[0]?.id ?? "document";
}

export function isResearchInsightTab(
  workspaceTypeId: ResearchCompanionWorkspaceTypeId,
  tabId: string,
): tabId is ResearchCompanionGeneratableInsightType | "notes" {
  return workspaceTypeId === "academic-research" && tabId !== "document";
}
