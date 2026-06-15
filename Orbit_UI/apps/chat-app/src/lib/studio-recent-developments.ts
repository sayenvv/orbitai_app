import { randomId } from "@/lib/utils";

export type RecentStudioDevelopment = {
  id: string;
  title: string;
  prompt: string;
  openedAt: number;
  workflowRunId: string | null;
  artifactUrl: string | null;
  status: "in_progress" | "complete" | "failed";
};

const STORAGE_KEY = "orbit:studio-recent-developments";
const MAX_RECENT = 6;

function readRaw(): RecentStudioDevelopment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentStudioDevelopment =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecentStudioDevelopment).id === "string" &&
        typeof (item as RecentStudioDevelopment).title === "string" &&
        typeof (item as RecentStudioDevelopment).prompt === "string" &&
        typeof (item as RecentStudioDevelopment).openedAt === "number",
    );
  } catch {
    return [];
  }
}

function writeRaw(projects: RecentStudioDevelopment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "Untitled project";
  return trimmed.length > 72 ? `${trimmed.slice(0, 72)}…` : trimmed;
}

export function readRecentStudioDevelopments(): RecentStudioDevelopment[] {
  return readRaw()
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, MAX_RECENT);
}

export function recordRecentStudioDevelopment({
  id,
  title,
  prompt,
  workflowRunId = null,
  artifactUrl = null,
  status = "in_progress",
}: {
  id?: string;
  title?: string;
  prompt: string;
  workflowRunId?: string | null;
  artifactUrl?: string | null;
  status?: RecentStudioDevelopment["status"];
}): RecentStudioDevelopment[] {
  const entry: RecentStudioDevelopment = {
    id: id?.trim() || randomId(),
    title: title?.trim() || titleFromPrompt(prompt),
    prompt: prompt.trim(),
    openedAt: Date.now(),
    workflowRunId,
    artifactUrl,
    status,
  };

  if (!entry.prompt) return readRecentStudioDevelopments();

  const next = [entry, ...readRaw().filter((item) => item.id !== entry.id)].slice(0, MAX_RECENT);
  writeRaw(next);
  return next;
}

export function formatStudioRecentTime(openedAt: number): string {
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
