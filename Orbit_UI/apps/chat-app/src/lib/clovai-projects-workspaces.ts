import type { ProjectWorkspace, RecentProjectWorkspace } from "@orbit/clovai-apps";

const STORAGE_KEY = "clovai-projects:workspaces:v1";
const RECENTS_KEY = "clovai-projects:recents:v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readProjectWorkspaces(): ProjectWorkspace[] {
  return readJson<ProjectWorkspace[]>(STORAGE_KEY, []);
}

export function saveProjectWorkspaces(workspaces: ProjectWorkspace[]): void {
  writeJson(STORAGE_KEY, workspaces);
}

export function upsertProjectWorkspace(workspace: ProjectWorkspace): void {
  const list = readProjectWorkspaces();
  const index = list.findIndex((w) => w.id === workspace.id);
  if (index >= 0) {
    list[index] = workspace;
  } else {
    list.unshift(workspace);
  }
  saveProjectWorkspaces(list);
}

export function getProjectWorkspace(id: string): ProjectWorkspace | undefined {
  return readProjectWorkspaces().find((w) => w.id === id);
}

export function readRecentProjectWorkspaces(): RecentProjectWorkspace[] {
  return readJson<RecentProjectWorkspace[]>(RECENTS_KEY, []);
}

export function recordRecentProjectWorkspace(entry: Omit<RecentProjectWorkspace, "key" | "openedAt">): void {
  const openedAt = Date.now();
  const key = `${entry.workspaceId}:${openedAt}`;
  const next: RecentProjectWorkspace = { ...entry, key, openedAt };
  const list = readRecentProjectWorkspaces().filter((r) => r.workspaceId !== entry.workspaceId);
  list.unshift(next);
  writeJson(RECENTS_KEY, list.slice(0, 12));
}

export function formatRecentProjectTime(openedAt: number): string {
  return new Date(openedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildProjectWorkspaceHref(workspaceHref: string, workspaceId: string): string {
  const params = new URLSearchParams({ workspaceId });
  return `${workspaceHref}?${params.toString()}`;
}
