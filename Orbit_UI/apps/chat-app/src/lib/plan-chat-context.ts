import type { PlanDeliverableContent } from "@/lib/plan-deliverable-content";

export type PlanChatContextScope = "plan" | "section";

export type PlanChatContextPin = {
  sectionId: string;
  sectionNumber: string;
  sectionLabel: string;
  deliverableLabel: string;
  deliverableId: string;
};

const MAX_CONTEXT_CHARS = 6_000;

export function formatDeliverableContentForContext(content: PlanDeliverableContent): string {
  if (content.format === "document") {
    return content.text.trim().slice(0, MAX_CONTEXT_CHARS);
  }
  if (content.format === "diagram") {
    return content.mermaid.trim().slice(0, MAX_CONTEXT_CHARS);
  }
  const headerLine = content.headers.join(" | ");
  const rows = content.rows
    .map((row) => row.join(" | "))
    .join("\n");
  return `${headerLine}\n${rows}`.trim().slice(0, MAX_CONTEXT_CHARS);
}

export function buildPlanChatContextPayload({
  scope,
  projectPrompt,
  pin,
  sectionContent,
}: {
  scope: PlanChatContextScope;
  projectPrompt: string;
  pin: PlanChatContextPin | null;
  sectionContent: PlanDeliverableContent;
}): {
  contextScope: PlanChatContextScope;
  focusedSectionLabel?: string;
  focusedSectionContent?: string;
} {
  if (scope === "section" && pin) {
    return {
      contextScope: "section",
      focusedSectionLabel: `${pin.sectionNumber}. ${pin.sectionLabel} — ${pin.deliverableLabel}`,
      focusedSectionContent: formatDeliverableContentForContext(sectionContent),
    };
  }

  return {
    contextScope: "plan",
  };
}
