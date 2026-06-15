import type { CustomSynopsisSection } from "@/lib/plan-custom-sections";

const KEY_PREFIX = "orbit:studio-plan-custom-sections:";

function isCustomSection(value: unknown): value is CustomSynopsisSection {
  if (!value || typeof value !== "object") return false;
  const section = value as CustomSynopsisSection;
  return (
    typeof section.id === "string" &&
    typeof section.label === "string" &&
    (section.format === "document" || section.format === "diagram") &&
    typeof section.description === "string"
  );
}

export function readStudioPlanCustomSections(planId: string): CustomSynopsisSection[] {
  if (typeof window === "undefined" || !planId.trim()) return [];
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${planId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomSection);
  } catch {
    return [];
  }
}

export function writeStudioPlanCustomSections(
  planId: string,
  sections: CustomSynopsisSection[],
): void {
  if (typeof window === "undefined" || !planId.trim()) return;
  localStorage.setItem(`${KEY_PREFIX}${planId}`, JSON.stringify(sections));
}
