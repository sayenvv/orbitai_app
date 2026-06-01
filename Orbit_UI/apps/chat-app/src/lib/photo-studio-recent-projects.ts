import { catalogAppIds, getAppWorkspaceHref } from "@orbit/clovai-apps";
import type { RecentPhotoProject } from "@orbit/clovai-apps";

const STORAGE_KEY = "photo-studio-recent-projects";
const MAX_RECENT = 8;

function readRaw(): RecentPhotoProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentPhotoProject =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecentPhotoProject).key === "string" &&
        typeof (item as RecentPhotoProject).title === "string" &&
        typeof (item as RecentPhotoProject).openedAt === "number",
    );
  } catch {
    return [];
  }
}

function writeRaw(projects: RecentPhotoProject[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function readRecentPhotoProjects(): RecentPhotoProject[] {
  return readRaw().sort((a, b) => b.openedAt - a.openedAt);
}

export function recordRecentPhotoProject({
  assetId,
  assetName,
  blankWorkspace = false,
}: {
  assetId?: string | null;
  assetName?: string | null;
  blankWorkspace?: boolean;
}): RecentPhotoProject[] {
  const key = assetId?.trim() || (blankWorkspace ? "blank-workspace" : "");
  if (!key) return readRecentPhotoProjects();

  const title = assetName?.trim() || (blankWorkspace ? "Untitled project" : "Untitled image");
  const entry: RecentPhotoProject = {
    key,
    title,
    assetId: assetId ?? null,
    assetName: title,
    openedAt: Date.now(),
  };

  const next = [entry, ...readRaw().filter((item) => item.key !== entry.key)].slice(0, MAX_RECENT);
  writeRaw(next);
  return next;
}

export function buildRecentPhotoProjectHref(project: RecentPhotoProject): string {
  const workspaceHref = getAppWorkspaceHref(catalogAppIds.photoGenerator);
  if (project.assetId) {
    const params = new URLSearchParams({
      assetId: project.assetId,
      assetName: project.assetName || project.title,
      view: "workspace",
    });
    return `${workspaceHref}?${params.toString()}`;
  }
  return `${workspaceHref}?view=workspace`;
}

export function formatRecentPhotoProjectTime(openedAt: number): string {
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
