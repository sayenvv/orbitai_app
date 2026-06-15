import type { PlanGenerateTarget } from "@/lib/plan-catalog";

const KEY_PREFIX = "orbit:studio-plan-scope:";

export type PlanScopeConfig = {
  target: PlanGenerateTarget;
  includedSectionIds: string[];
};

function isPlanScopeConfig(value: unknown): value is PlanScopeConfig {
  if (!value || typeof value !== "object") return false;
  const scope = value as PlanScopeConfig;
  return (
    (scope.target === "synopsis" || scope.target === "documentation") &&
    Array.isArray(scope.includedSectionIds) &&
    scope.includedSectionIds.every((id) => typeof id === "string")
  );
}

export function readStudioPlanScope(planId: string): PlanScopeConfig | null {
  if (typeof window === "undefined" || !planId.trim()) return null;
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${planId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isPlanScopeConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStudioPlanScope(planId: string, scope: PlanScopeConfig): void {
  if (typeof window === "undefined" || !planId.trim()) return;
  localStorage.setItem(`${KEY_PREFIX}${planId}`, JSON.stringify(scope));
}
