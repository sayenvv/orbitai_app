import type { CustomSynopsisSection } from "@/lib/plan-custom-sections";
import { customSectionToSynopsisSection } from "@/lib/plan-custom-sections";
import {
  PROJECT_SYNOPSIS_SECTIONS,
  type SynopsisSection,
} from "@/lib/plan-synopsis-catalog";

export function getDefaultSynopsisSectionOrder(
  customSections: CustomSynopsisSection[],
): string[] {
  return [
    ...PROJECT_SYNOPSIS_SECTIONS.map((section) => section.id),
    ...customSections.map((section) => section.id),
  ];
}

export function normalizeSynopsisSectionOrder(
  order: string[] | null | undefined,
  customSections: CustomSynopsisSection[],
): string[] {
  const defaultOrder = getDefaultSynopsisSectionOrder(customSections);
  const validIds = new Set(defaultOrder);
  const normalized: string[] = [];

  for (const id of order ?? []) {
    if (validIds.has(id) && !normalized.includes(id)) {
      normalized.push(id);
    }
  }

  for (const id of defaultOrder) {
    if (!normalized.includes(id)) {
      normalized.push(id);
    }
  }

  return normalized;
}

export function mergeSynopsisSections(
  customSections: CustomSynopsisSection[],
  sectionOrder?: string[],
): SynopsisSection[] {
  const order = normalizeSynopsisSectionOrder(sectionOrder, customSections);
  const sectionById = new Map<string, SynopsisSection>();

  for (const section of PROJECT_SYNOPSIS_SECTIONS) {
    sectionById.set(section.id, section);
  }

  for (const custom of customSections) {
    sectionById.set(custom.id, customSectionToSynopsisSection(custom, 0));
  }

  return order
    .map((id, index) => {
      const section = sectionById.get(id);
      if (!section) return null;
      return { ...section, number: index + 1 };
    })
    .filter((section): section is SynopsisSection => section !== null);
}

export function reorderSynopsisSectionOrder(
  order: string[],
  activeId: string,
  overId: string,
): string[] {
  const oldIndex = order.indexOf(activeId);
  const newIndex = order.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return order;

  const next = [...order];
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved);
  return next;
}

export function moveSynopsisSectionInOrder(
  order: string[],
  sectionId: string,
  direction: "up" | "down",
): string[] {
  const index = order.indexOf(sectionId);
  if (index < 0) return order;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= order.length) return order;

  const next = [...order];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export function appendSynopsisSectionToOrder(order: string[], sectionId: string): string[] {
  if (order.includes(sectionId)) return order;
  return [...order, sectionId];
}

export function removeSynopsisSectionFromOrder(order: string[], sectionId: string): string[] {
  return order.filter((id) => id !== sectionId);
}
