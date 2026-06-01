export type ResearchCompanionGeneratableInsightType =
  | "keywords"
  | "concepts"
  | "summary"
  | "evidence"
  | "questions";

export type ResearchCompanionInsightOption = {
  id: ResearchCompanionGeneratableInsightType;
  label: string;
  description: string;
};

export const RESEARCH_COMPANION_INSIGHT_OPTIONS: ResearchCompanionInsightOption[] = [
  {
    id: "summary",
    label: "Insights summary",
    description: "Priority takeaways and a concise overview of the document",
  },
  {
    id: "keywords",
    label: "Keyword cloud",
    description: "Important terms, repeated topics, and thematic keywords",
  },
  {
    id: "concepts",
    label: "Concept summary",
    description: "Main concepts grouped by theme with brief explanations",
  },
  {
    id: "evidence",
    label: "Evidence map",
    description: "Claims, methods, supporting data, and citation-ready notes",
  },
  {
    id: "questions",
    label: "Discussion Q&A",
    description: "Guided review prompts and follow-up questions",
  },
];

export const DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES: ResearchCompanionGeneratableInsightType[] =
  RESEARCH_COMPANION_INSIGHT_OPTIONS.map((option) => option.id);

export const RESEARCH_COMPANION_INSIGHT_TYPE_SET = new Set<string>(
  DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES,
);

export function normalizeResearchCompanionInsightTypes(
  types: string[] | null | undefined,
): ResearchCompanionGeneratableInsightType[] {
  if (!types?.length) return [...DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES];
  const normalized = types.filter((type): type is ResearchCompanionGeneratableInsightType =>
    RESEARCH_COMPANION_INSIGHT_TYPE_SET.has(type),
  );
  return normalized.length > 0 ? normalized : [...DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES];
}

export function parseResearchCompanionInsightTypesParam(
  value: string | null | undefined,
): ResearchCompanionGeneratableInsightType[] | undefined {
  if (!value?.trim()) return undefined;
  return normalizeResearchCompanionInsightTypes(value.split(",").map((item) => item.trim()));
}

export function serializeResearchCompanionInsightTypes(
  types: ResearchCompanionGeneratableInsightType[],
): string {
  return types.join(",");
}

export function getMissingInsightTypes(
  generated: ResearchCompanionGeneratableInsightType[],
): ResearchCompanionGeneratableInsightType[] {
  return DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES.filter((type) => !generated.includes(type));
}

export function mergeInsightTypes(
  existing: ResearchCompanionGeneratableInsightType[],
  additional: ResearchCompanionGeneratableInsightType[],
): ResearchCompanionGeneratableInsightType[] {
  const merged = new Set([...existing, ...additional]);
  return DEFAULT_RESEARCH_COMPANION_INSIGHT_TYPES.filter((type) => merged.has(type));
}

export function isGeneratableInsightTab(
  tab: string,
): tab is ResearchCompanionGeneratableInsightType {
  return RESEARCH_COMPANION_INSIGHT_TYPE_SET.has(tab);
}
