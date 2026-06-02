import { catalogAppIds, getAppWorkspaceHref } from "@orbit/clovai-apps";
import type {
  CanvasBackgroundId,
  PhotoStudioWorkspaceSnapshot,
  RecentPhotoProject,
} from "@orbit/clovai-apps";
import {
  photoStudioApi,
  type ApiPhotoStudioWorkspaceResponse,
  type ApiPhotoStudioWorkspaceSummary,
} from "@/lib/orbit-api";

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

export function mapWorkspaceSummaryToRecent(summary: ApiPhotoStudioWorkspaceSummary): RecentPhotoProject {
  return {
    key: summary.id,
    title: summary.title,
    workspaceId: summary.id,
    assetId: summary.assetId ?? null,
    assetName: summary.assetName ?? null,
    openedAt: summary.openedAt,
  };
}

export async function fetchRecentPhotoProjects(): Promise<RecentPhotoProject[]> {
  try {
    const result = await photoStudioApi.workspaces(MAX_RECENT);
    return result.data.map(mapWorkspaceSummaryToRecent);
  } catch {
    return readRecentPhotoProjects();
  }
}

export function readRecentPhotoProjects(): RecentPhotoProject[] {
  return readRaw().sort((a, b) => b.openedAt - a.openedAt);
}

export function recordRecentPhotoProject({
  workspaceId,
  title,
  assetId,
  assetName,
  blankWorkspace = false,
}: {
  workspaceId?: string | null;
  title?: string | null;
  assetId?: string | null;
  assetName?: string | null;
  blankWorkspace?: boolean;
}): RecentPhotoProject[] {
  const key =
    workspaceId?.trim() ||
    assetId?.trim() ||
    (blankWorkspace ? "blank-workspace" : "");
  if (!key) return readRecentPhotoProjects();

  const resolvedTitle =
    title?.trim() ||
    assetName?.trim() ||
    (blankWorkspace ? "Untitled project" : "Untitled image");
  const entry: RecentPhotoProject = {
    key,
    title: resolvedTitle,
    workspaceId: workspaceId ?? null,
    assetId: assetId ?? null,
    assetName: assetName?.trim() || resolvedTitle,
    openedAt: Date.now(),
  };

  const next = [entry, ...readRaw().filter((item) => item.key !== entry.key)].slice(0, MAX_RECENT);
  writeRaw(next);
  return next;
}

export function buildRecentPhotoProjectHref(project: RecentPhotoProject): string {
  const workspaceHref = getAppWorkspaceHref(catalogAppIds.photoGenerator);
  if (project.workspaceId) {
    const params = new URLSearchParams({
      workspaceId: project.workspaceId,
      view: "workspace",
    });
    return `${workspaceHref}?${params.toString()}`;
  }
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

export function mapApiWorkspaceToSnapshot(
  workspace: ApiPhotoStudioWorkspaceResponse,
): PhotoStudioWorkspaceSnapshot {
  const { state } = workspace;
  return {
    title: state.title || workspace.title,
    assetId: state.assetId ?? workspace.assetId ?? null,
    assetName: state.assetName ?? workspace.assetName ?? null,
    aspectRatio: state.aspectRatio,
    creationType: state.creationType,
    stylePreset: state.stylePreset,
    logoTransparentBackground: state.logoTransparentBackground,
    canvasBackgroundId: state.canvasBackgroundId as CanvasBackgroundId,
    customCanvasBackgroundColor: state.customCanvasBackgroundColor,
    customCanvasGradientEnd: state.customCanvasGradientEnd,
    customCanvasGradientEnabled: state.customCanvasGradientEnabled,
    projectName: state.projectName || workspace.title,
    canvasShapes: (state.canvasShapes ?? []) as PhotoStudioWorkspaceSnapshot["canvasShapes"],
    canvasTexts: (state.canvasTexts ?? []) as PhotoStudioWorkspaceSnapshot["canvasTexts"],
    generatedItems: (state.generatedItems ?? []).map((item) => ({
      id: item.id,
      prompt: item.prompt,
      creationType: item.creationType,
      aspectRatio: item.aspectRatio,
      stylePreset: item.stylePreset,
      label: item.label,
      previewGradient: item.previewGradient,
      createdAt: item.createdAt,
      transparentBackground: item.transparentBackground,
      canvasBackgroundId: item.canvasBackgroundId as CanvasBackgroundId | undefined,
      variantIndex: item.variantIndex,
      imageUrl: item.imageUrl ?? undefined,
    })),
    savedDesigns: (state.savedDesigns ?? []) as PhotoStudioWorkspaceSnapshot["savedDesigns"],
    selectedGenerationId: state.selectedGenerationId ?? null,
    materializedGenerationId: state.materializedGenerationId ?? null,
  };
}
