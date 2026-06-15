import type { PlanDeliverableContent } from "@/lib/plan-deliverable-content";

const KEY_PREFIX = "orbit:studio-plan-content:";

export function readStudioPlanContent(
  planId: string,
): Record<string, PlanDeliverableContent> | null {
  if (typeof window === "undefined" || !planId.trim()) return null;
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${planId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, PlanDeliverableContent>;
  } catch {
    return null;
  }
}

export function writeStudioPlanContent(
  planId: string,
  content: Record<string, PlanDeliverableContent>,
): void {
  if (typeof window === "undefined" || !planId.trim()) return;
  localStorage.setItem(`${KEY_PREFIX}${planId}`, JSON.stringify(content));
}
