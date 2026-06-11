import { routes } from "@/lib/routes";
import {
  codeWorkspaceApi,
  type ApiCodeWorkspaceProjectSummary,
} from "@/lib/orbit-api";

export type RecentCodeProject = {
  id: string;
  title: string;
  openedAt: number;
};

const STORAGE_KEY = "orbit:code-workspace-recent-projects";
const MAX_RECENT = 8;

function readRaw(): RecentCodeProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentCodeProject =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecentCodeProject).id === "string" &&
        typeof (item as RecentCodeProject).title === "string" &&
        typeof (item as RecentCodeProject).openedAt === "number",
    );
  } catch {
    return [];
  }
}

function writeRaw(projects: RecentCodeProject[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function mergeRecentWithSummaries(
  summaries: ApiCodeWorkspaceProjectSummary[],
  local: RecentCodeProject[],
): RecentCodeProject[] {
  const localById = new Map(local.map((item) => [item.id, item]));
  const merged = summaries.map((summary) => {
    const cached = localById.get(summary.id);
    return {
      id: summary.id,
      title: summary.title,
      openedAt: cached?.openedAt ?? summary.updatedAt,
    };
  });

  for (const item of local) {
    if (!merged.some((entry) => entry.id === item.id)) {
      merged.push(item);
    }
  }

  return merged.sort((a, b) => b.openedAt - a.openedAt).slice(0, MAX_RECENT);
}

export async function fetchRecentCodeProjects(): Promise<RecentCodeProject[]> {
  const local = readRaw();
  try {
    const result = await codeWorkspaceApi.listProjects(MAX_RECENT);
    return mergeRecentWithSummaries(result.data, local);
  } catch {
    return local.sort((a, b) => b.openedAt - a.openedAt).slice(0, MAX_RECENT);
  }
}

export function readRecentCodeProjects(): RecentCodeProject[] {
  return readRaw().sort((a, b) => b.openedAt - a.openedAt).slice(0, MAX_RECENT);
}

export function recordRecentCodeProject({
  id,
  title,
}: {
  id: string;
  title: string;
}): RecentCodeProject[] {
  if (!id.trim()) return readRecentCodeProjects();

  const entry: RecentCodeProject = {
    id: id.trim(),
    title: title.trim() || "Untitled project",
    openedAt: Date.now(),
  };

  const next = [
    entry,
    ...readRaw().filter((item) => item.id !== entry.id),
  ].slice(0, MAX_RECENT);
  writeRaw(next);
  return next;
}

export function buildRecentCodeProjectHref(project: Pick<RecentCodeProject, "id">): string {
  return `${routes.code}?projectId=${encodeURIComponent(project.id)}`;
}

export function formatRecentCodeProjectTime(openedAt: number): string {
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
