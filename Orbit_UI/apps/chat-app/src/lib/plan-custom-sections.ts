import { FileText, GitBranch, type LucideIcon } from "lucide-react";

import { mergeSynopsisSections } from "@/lib/plan-synopsis-section-order";
import {
  type SynopsisDeliverableFormat,
  type SynopsisSection,
} from "@/lib/plan-synopsis-catalog";
import { randomId } from "@/lib/utils";

export type CustomSynopsisSectionFormat = "document" | "diagram";

export type CustomSynopsisSection = {
  id: string;
  label: string;
  format: CustomSynopsisSectionFormat;
  description: string;
};

export function createCustomSynopsisSection(
  label: string,
  format: CustomSynopsisSectionFormat,
): CustomSynopsisSection {
  const trimmed = label.trim();
  const description =
    format === "diagram"
      ? "Mermaid diagram section added to your synopsis."
      : "Custom section added to your synopsis.";

  return {
    id: `custom-${randomId()}`,
    label: trimmed || "New section",
    format,
    description,
  };
}

function customSectionIcon(format: CustomSynopsisSectionFormat): LucideIcon {
  return format === "diagram" ? GitBranch : FileText;
}

export function customSectionToSynopsisSection(
  section: CustomSynopsisSection,
  number: number,
): SynopsisSection {
  return {
    id: section.id,
    number,
    label: section.label,
    description: section.description,
    icon: customSectionIcon(section.format),
    custom: true,
    deliverables: [
      {
        id: section.id,
        label: section.label,
        format: section.format,
        description: section.description,
      },
    ],
  };
}

export function resolveSynopsisSection(
  sectionId: string,
  customSections: CustomSynopsisSection[],
  sectionOrder?: string[],
): SynopsisSection | undefined {
  return mergeSynopsisSections(customSections, sectionOrder).find(
    (section) => section.id === sectionId,
  );
}
