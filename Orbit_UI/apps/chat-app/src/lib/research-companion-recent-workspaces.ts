import { catalogAppIds, getAppWorkspaceHref } from "@orbit/clovai-apps";

export type RecentWorkspace = {
  key: string;
  title: string;
  sourceId: string;
  sourceName: string;
  insightId?: string | null;
  insightTypes?: string | null;
  openedAt: number;
};

const STORAGE_KEY = "rc-recent-workspaces";
const MAX_RECENT = 8;

function readRaw(): RecentWorkspace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentWorkspace =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecentWorkspace).key === "string" &&
        typeof (item as RecentWorkspace).title === "string" &&
        typeof (item as RecentWorkspace).sourceId === "string" &&
        typeof (item as RecentWorkspace).sourceName === "string" &&
        typeof (item as RecentWorkspace).openedAt === "number",
    );
  } catch {
    return [];
  }
}

function writeRaw(workspaces: RecentWorkspace[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
}

export function readRecentWorkspaces(): RecentWorkspace[] {
  return readRaw().sort((a, b) => b.openedAt - a.openedAt);
}

export function recordRecentWorkspace({
  sourceId,
  sourceName,
  insightId,
  insightTypes,
}: {
  sourceId?: string | null;
  sourceName?: string | null;
  insightId?: string | null;
  insightTypes?: string | null;
}): RecentWorkspace[] {
  if (!sourceId) return readRecentWorkspaces();

  const title = sourceName?.trim() || "Untitled document";
  const existing = readRaw().find((item) => item.key === sourceId);
  const resolvedInsightTypes = insightTypes?.trim()
    ? insightTypes.trim()
    : existing?.insightTypes ?? null;
  const resolvedInsightId = insightId ?? existing?.insightId ?? null;

  const entry: RecentWorkspace = {
    key: sourceId,
    title,
    sourceId,
    sourceName: title,
    insightId: resolvedInsightId,
    insightTypes: resolvedInsightTypes,
    openedAt: Date.now(),
  };

  const next = [entry, ...readRaw().filter((item) => item.key !== entry.key)].slice(0, MAX_RECENT);
  writeRaw(next);
  return next;
}

export function buildRecentWorkspaceHref(workspace: RecentWorkspace): string {
  const params = new URLSearchParams({
    sourceId: workspace.sourceId,
    sourceName: workspace.sourceName,
    sourceType: "uploaded-file",
  });
  if (workspace.insightId) {
    params.set("insightId", workspace.insightId);
  }
  if (workspace.insightTypes) {
    params.set("insightTypes", workspace.insightTypes);
  }
  return `${getAppWorkspaceHref(catalogAppIds.researchCompanion)}?${params.toString()}`;
}

export function formatRecentWorkspaceTime(openedAt: number): string {
  const diffMs = Date.now() - openedAt;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
