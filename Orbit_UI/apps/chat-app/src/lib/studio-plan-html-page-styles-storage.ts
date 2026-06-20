import {
  DEFAULT_PLAN_HTML_SIDEBAR_STYLE,
  mergePlanHtmlSidebarStyle,
  type PlanHtmlEditorStorage,
  type PlanHtmlPageStylesMap,
  type PlanHtmlSidebarStyle,
} from "@/lib/plan-html-page-editor";

const KEY_PREFIX = "orbit:studio-plan-html-page-styles:";

function isPageStylesMap(value: unknown): value is PlanHtmlPageStylesMap {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if ("pageStyles" in record || "sidebarStyle" in record) return false;
  const first = Object.values(record)[0];
  if (!first || typeof first !== "object") return Object.keys(record).length === 0;
  return "backgroundColor" in (first as Record<string, unknown>);
}

function isEditorStorage(value: unknown): value is PlanHtmlEditorStorage {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return "pageStyles" in record || "sidebarStyle" in record;
}

export function readStudioPlanHtmlEditorStorage(planId: string): PlanHtmlEditorStorage | null {
  if (typeof window === "undefined" || !planId.trim()) return null;
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${planId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    if (isEditorStorage(parsed)) {
      const storage = parsed as PlanHtmlEditorStorage;
      return {
        pageStyles: isPageStylesMap(storage.pageStyles) ? storage.pageStyles : {},
        sidebarStyle: mergePlanHtmlSidebarStyle(storage.sidebarStyle ?? null),
      };
    }

    if (isPageStylesMap(parsed)) {
      return {
        pageStyles: parsed,
        sidebarStyle: { ...DEFAULT_PLAN_HTML_SIDEBAR_STYLE },
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function readStudioPlanHtmlPageStyles(planId: string): PlanHtmlPageStylesMap | null {
  return readStudioPlanHtmlEditorStorage(planId)?.pageStyles ?? null;
}

export function readStudioPlanHtmlSidebarStyle(planId: string): PlanHtmlSidebarStyle | null {
  return readStudioPlanHtmlEditorStorage(planId)?.sidebarStyle ?? null;
}

export function writeStudioPlanHtmlEditorStorage(
  planId: string,
  storage: PlanHtmlEditorStorage,
): void {
  if (typeof window === "undefined" || !planId.trim()) return;
  localStorage.setItem(`${KEY_PREFIX}${planId}`, JSON.stringify(storage));
}

export function writeStudioPlanHtmlPageStyles(
  planId: string,
  pageStyles: PlanHtmlPageStylesMap,
  sidebarStyle?: PlanHtmlSidebarStyle,
): void {
  const existing = readStudioPlanHtmlEditorStorage(planId);
  writeStudioPlanHtmlEditorStorage(planId, {
    pageStyles,
    sidebarStyle: sidebarStyle ?? existing?.sidebarStyle ?? { ...DEFAULT_PLAN_HTML_SIDEBAR_STYLE },
  });
}

export function writeStudioPlanHtmlSidebarStyle(
  planId: string,
  sidebarStyle: PlanHtmlSidebarStyle,
  pageStyles?: PlanHtmlPageStylesMap,
): void {
  const existing = readStudioPlanHtmlEditorStorage(planId);
  writeStudioPlanHtmlEditorStorage(planId, {
    pageStyles: pageStyles ?? existing?.pageStyles ?? {},
    sidebarStyle,
  });
}
