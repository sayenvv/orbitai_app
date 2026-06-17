import type { PlanGenerateTarget } from "@/lib/plan-catalog";
import { randomId } from "@/lib/utils";

export type RecentStudioPlan = {
  id: string;
  title: string;
  prompt: string;
  openedAt: number;
  status: "draft" | "complete";
  target?: PlanGenerateTarget;
};

const STORAGE_KEY = "orbit:studio-recent-plans";
const MAX_RECENT = 6;

function readRaw(): RecentStudioPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentStudioPlan =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecentStudioPlan).id === "string" &&
        typeof (item as RecentStudioPlan).title === "string" &&
        typeof (item as RecentStudioPlan).prompt === "string" &&
        typeof (item as RecentStudioPlan).openedAt === "number",
    );
  } catch {
    return [];
  }
}

function writeRaw(plans: RecentStudioPlan[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "Untitled plan";
  return trimmed.length > 72 ? `${trimmed.slice(0, 72)}…` : trimmed;
}

export function readRecentStudioPlans(): RecentStudioPlan[] {
  return readRaw()
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, MAX_RECENT);
}

export function recordRecentStudioPlan({
  id,
  title,
  prompt,
  status = "draft",
  target,
}: {
  id?: string;
  title?: string;
  prompt: string;
  status?: RecentStudioPlan["status"];
  target?: PlanGenerateTarget;
}): RecentStudioPlan[] {
  const entry: RecentStudioPlan = {
    id: id?.trim() || randomId(),
    title: title?.trim() || titleFromPrompt(prompt),
    prompt: prompt.trim(),
    openedAt: Date.now(),
    status,
    ...(target ? { target } : {}),
  };

  if (!entry.prompt) return readRecentStudioPlans();

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
