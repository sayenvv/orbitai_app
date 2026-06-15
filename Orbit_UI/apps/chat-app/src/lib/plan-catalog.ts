import { PROJECT_DOCUMENTATION_SECTIONS } from "@/lib/plan-documentation-catalog";
import type { CustomSynopsisSection } from "@/lib/plan-custom-sections";
import { resolveSynopsisSection } from "@/lib/plan-custom-sections";
import { mergeSynopsisSections } from "@/lib/plan-synopsis-section-order";
import {
  PROJECT_SYNOPSIS_SECTIONS,
  type SynopsisSection,
} from "@/lib/plan-synopsis-catalog";

export type PlanWorkspaceView = "synopsis" | "documentation";

export const PLAN_WORKSPACE_VIEWS: Array<{
  id: PlanWorkspaceView;
  label: string;
  description: string;
}> = [
  {
    id: "synopsis",
    label: "Project Synopsis",
    description: "22-section academic proposal",
  },
  {
    id: "documentation",
    label: "Project Documentation",
    description: "Technical docs for the project",
  },
];

export function getPlanSections(
  view: PlanWorkspaceView,
  customSynopsisSections: CustomSynopsisSection[] = [],
  synopsisSectionOrder: string[] = [],
): SynopsisSection[] {
  return view === "documentation"
    ? PROJECT_DOCUMENTATION_SECTIONS
    : mergeSynopsisSections(customSynopsisSections, synopsisSectionOrder);
}

export function getDefaultSectionId(view: PlanWorkspaceView): string {
  return getPlanSections(view)[0]?.id ?? "title";
}

export function getPlanSectionById(sectionId: string): SynopsisSection | undefined {
  return (
    PROJECT_SYNOPSIS_SECTIONS.find((section) => section.id === sectionId) ??
    PROJECT_DOCUMENTATION_SECTIONS.find((section) => section.id === sectionId)
  );
}

export function resolvePlanSection(
  sectionId: string,
  customSynopsisSections: CustomSynopsisSection[] = [],
  synopsisSectionOrder: string[] = [],
): SynopsisSection | undefined {
  const synopsis = resolveSynopsisSection(sectionId, customSynopsisSections, synopsisSectionOrder);
  if (synopsis) return synopsis;
  return getPlanSectionById(sectionId);
}

export function getAllPlanSections(): SynopsisSection[] {
  return [...PROJECT_SYNOPSIS_SECTIONS, ...PROJECT_DOCUMENTATION_SECTIONS];
}

export type PlanGenerateTarget = "synopsis" | "documentation";

export function getPackageSections(target: PlanGenerateTarget): SynopsisSection[] {
  return target === "synopsis" ? PROJECT_SYNOPSIS_SECTIONS : PROJECT_DOCUMENTATION_SECTIONS;
}

export function getPackageSectionIds(target: PlanGenerateTarget): string[] {
  return getPackageSections(target).map((section) => section.id);
}

export function resolveIncludedSectionIds(
  target: PlanGenerateTarget,
  excludedSectionIds: string[],
): string[] {
  const excluded = new Set(excludedSectionIds);
  return getPackageSectionIds(target).filter((id) => !excluded.has(id));
}

export function filterSectionsByIncluded(
  sections: SynopsisSection[],
  includedSectionIds: string[] | null | undefined,
): SynopsisSection[] {
  if (!includedSectionIds?.length) return sections;
  const included = new Set(includedSectionIds);
  return sections.filter((section) => section.custom || included.has(section.id));
}

export function getPlanSectionsForGeneration(
  targets: PlanGenerateTarget[],
  excludedSectionIds: string[] = [],
): SynopsisSection[] {
  const includeSynopsis = targets.includes("synopsis");
  const includeDocumentation = targets.includes("documentation");
  if (!includeSynopsis && !includeDocumentation) return [];

  const excluded = new Set(excludedSectionIds);
  return [
    ...(includeSynopsis ? PROJECT_SYNOPSIS_SECTIONS : []),
    ...(includeDocumentation ? PROJECT_DOCUMENTATION_SECTIONS : []),
  ].filter((section) => !excluded.has(section.id));
}

export const TOTAL_PLAN_SECTION_COUNT =
  PROJECT_SYNOPSIS_SECTIONS.length + PROJECT_DOCUMENTATION_SECTIONS.length;
