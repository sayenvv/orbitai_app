const KEY_PREFIX = "orbit:studio-plan-section-order:";

export function readStudioPlanSectionOrder(planId: string): string[] {
  if (typeof window === "undefined" || !planId.trim()) return [];
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${planId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
  } catch {
    return [];
  }
}

export function writeStudioPlanSectionOrder(planId: string, order: string[]): void {
  if (typeof window === "undefined" || !planId.trim()) return;
  localStorage.setItem(`${KEY_PREFIX}${planId}`, JSON.stringify(order));
}
