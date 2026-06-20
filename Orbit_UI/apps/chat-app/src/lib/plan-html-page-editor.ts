export type PlanHtmlPageStyle = {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  padding: number;
  fontSize: number;
  textAlign: "left" | "center" | "right";
  borderRadius: number;
};

export type PlanHtmlPageStylesMap = Record<string, PlanHtmlPageStyle>;

export type PlanHtmlSidebarStyle = {
  title: string;
  width: number;
  backgroundColor: string;
  borderColor: string;
  headerTitleColor: string;
  headerSubtitleColor: string;
  tabBackgroundColor: string;
  tabTextColor: string;
  tabDescriptionColor: string;
  tabBorderColor: string;
  tabBorderRadius: number;
  tabPadding: number;
  tabTextPaddingLeft: number;
  tabWidth: number;
  tabHeight: number;
  tabGap: number;
  navPaddingX: number;
  navPaddingY: number;
  tabsEdgeToEdge: boolean;
  activeTabBackgroundColor: string;
  activeTabTextColor: string;
  activeTabBorderColor: string;
  activeTabBorderRadius: number;
  activeTabPadding: number;
  activeTabTextPaddingLeft: number;
  activeTabWidth: number;
  activeTabHeight: number;
  badgeBackgroundColor: string;
  badgeTextColor: string;
  activeBadgeBackgroundColor: string;
  activeBadgeTextColor: string;
  hoverTabBackgroundColor: string;
  hoverTabBorderColor: string;
  canvasBackgroundColor: string;
};

export type PlanHtmlEditorStorage = {
  pageStyles: PlanHtmlPageStylesMap;
  sidebarStyle: PlanHtmlSidebarStyle;
};

export const DEFAULT_PLAN_HTML_PAGE_STYLE: PlanHtmlPageStyle = {
  backgroundColor: "#ffffff",
  textColor: "#111827",
  accentColor: "#2563eb",
  padding: 40,
  fontSize: 16,
  textAlign: "left",
  borderRadius: 12,
};

export const DEFAULT_PLAN_HTML_SIDEBAR_STYLE: PlanHtmlSidebarStyle = {
  title: "Pages",
  width: 260,
  backgroundColor: "#f4f4f5",
  borderColor: "#e4e4e7",
  headerTitleColor: "#71717a",
  headerSubtitleColor: "#a1a1aa",
  tabBackgroundColor: "transparent",
  tabTextColor: "#71717a",
  tabDescriptionColor: "#a1a1aa",
  tabBorderColor: "transparent",
  tabBorderRadius: 12,
  tabPadding: 10,
  tabTextPaddingLeft: 0,
  tabWidth: 100,
  tabHeight: 36,
  tabGap: 6,
  navPaddingX: 10,
  navPaddingY: 10,
  tabsEdgeToEdge: false,
  activeTabBackgroundColor: "rgba(37, 99, 235, 0.1)",
  activeTabTextColor: "#18181b",
  activeTabBorderColor: "rgba(37, 99, 235, 0.35)",
  activeTabBorderRadius: 12,
  activeTabPadding: 10,
  activeTabTextPaddingLeft: 0,
  activeTabWidth: 100,
  activeTabHeight: 40,
  badgeBackgroundColor: "#e4e4e7",
  badgeTextColor: "#71717a",
  activeBadgeBackgroundColor: "rgba(37, 99, 235, 0.15)",
  activeBadgeTextColor: "#2563eb",
  hoverTabBackgroundColor: "rgba(228, 228, 231, 0.55)",
  hoverTabBorderColor: "rgba(228, 228, 231, 0.9)",
  canvasBackgroundColor: "#ececef",
};

export function createDefaultPlanHtmlPageStyles(sectionIds: string[]): PlanHtmlPageStylesMap {
  const styles: PlanHtmlPageStylesMap = {};
  for (const sectionId of sectionIds) {
    styles[sectionId] = { ...DEFAULT_PLAN_HTML_PAGE_STYLE };
  }
  return styles;
}

export function mergePlanHtmlPageStyles(
  sectionIds: string[],
  stored: PlanHtmlPageStylesMap | null,
): PlanHtmlPageStylesMap {
  const merged = createDefaultPlanHtmlPageStyles(sectionIds);
  if (!stored) return merged;

  for (const sectionId of sectionIds) {
    const saved = stored[sectionId];
    if (!saved) continue;
    merged[sectionId] = { ...DEFAULT_PLAN_HTML_PAGE_STYLE, ...saved };
  }
  return merged;
}

export function mergePlanHtmlSidebarStyle(stored: Partial<PlanHtmlSidebarStyle> | null): PlanHtmlSidebarStyle {
  if (!stored) return { ...DEFAULT_PLAN_HTML_SIDEBAR_STYLE };
  return { ...DEFAULT_PLAN_HTML_SIDEBAR_STYLE, ...stored };
}

export function updatePlanHtmlPageStyle(
  styles: PlanHtmlPageStylesMap,
  sectionId: string,
  patch: Partial<PlanHtmlPageStyle>,
): PlanHtmlPageStylesMap {
  const current = styles[sectionId] ?? DEFAULT_PLAN_HTML_PAGE_STYLE;
  return {
    ...styles,
    [sectionId]: { ...current, ...patch },
  };
}

export function updatePlanHtmlSidebarStyle(
  style: PlanHtmlSidebarStyle,
  patch: Partial<PlanHtmlSidebarStyle>,
): PlanHtmlSidebarStyle {
  return { ...style, ...patch };
}
