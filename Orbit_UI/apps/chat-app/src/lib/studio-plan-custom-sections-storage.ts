import type { CustomSynopsisSection } from "@/lib/plan-custom-sections";

const KEY_PREFIX = "orbit:studio-plan-custom-sections:";

function normalizeSectionFormat(
  format: string,
): CustomSynopsisSection["format"] | null {
  if (format === "document" || format === "diagram") return format;
  if (format === "custom_diagram") return "diagram";
  return null;
}

function isCustomSection(value: unknown): value is CustomSynopsisSection {
  if (!value || typeof value !== "object") return false;
  const section = value as CustomSynopsisSection & { format: string };
  const format = normalizeSectionFormat(section.format);
  return (
    typeof section.id === "string" &&
    typeof section.label === "string" &&
    format !== null &&
    typeof section.description === "string"
  );
}

function normalizeCustomSection(
  section: CustomSynopsisSection & { format: string },
): CustomSynopsisSection {
  const format = normalizeSectionFormat(section.format) ?? "document";
  return { ...section, format };
}

export function readStudioPlanCustomSections(planId: string): CustomSynopsisSection[] {
  if (typeof window === "undefined" || !planId.trim()) return [];
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${planId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomSection).map(normalizeCustomSection);
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
