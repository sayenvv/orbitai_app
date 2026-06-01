"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PhotoStudioApp,
  type CatalogApp,
  type PhotoStudioView,
  type RecentPhotoProject,
  getAppWorkspaceHref,
} from "@orbit/clovai-apps";
import { PhotoStudioAssetPicker } from "@/components/apps/photo-studio-asset-picker";
import { useAppShell } from "@/components/layout/app-shell-context";
import { getApiBaseUrl } from "@/lib/orbit-api";
import {
  buildRecentPhotoProjectHref,
  formatRecentPhotoProjectTime,
  readRecentPhotoProjects,
  recordRecentPhotoProject,
} from "@/lib/photo-studio-recent-projects";
import { PhotoStudioLaunchShimmer } from "@/components/ui/skeleton";

const APP_OPEN_DELAY_MS = 750;

function buildWorkspaceUrl(
  workspaceHref: string,
  params: {
    view?: PhotoStudioView;
    assetId?: string | null;
    assetName?: string | null;
  },
) {
  const search = new URLSearchParams();
  if (params.view === "workspace") {
    search.set("view", "workspace");
  }
  if (params.assetId) {
    search.set("assetId", params.assetId);
    search.set("assetName", params.assetName || "Selected image");
    search.set("view", "workspace");
  }
  const query = search.toString();
  return query ? `${workspaceHref}?${query}` : workspaceHref;
}

export function PhotoStudioAppPage({ app }: { app: CatalogApp }) {
  const workspaceHref = getAppWorkspaceHref(app);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeader } = useAppShell();

  const assetId = searchParams.get("assetId");
  const assetName = searchParams.get("assetName");
  const viewParam = searchParams.get("view");
  const initialView: PhotoStudioView =
    viewParam === "workspace" || assetId ? "workspace" : "overview";

  const [isOpening, setIsOpening] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentPhotoProject[]>([]);

  useEffect(() => {
    setHeader({
      title: app.name,
      subtitle: assetId
        ? assetName?.trim() || "Workspace"
        : initialView === "workspace"
          ? "New workspace"
          : app.category,
    });
    return () => setHeader(null);
  }, [app.category, app.name, assetId, assetName, initialView, setHeader]);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpening(false), APP_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setRecentProjects(readRecentPhotoProjects());
  }, []);

  useEffect(() => {
    if (assetId) {
      setRecentProjects(
        recordRecentPhotoProject({
          assetId,
          assetName,
        }),
      );
      return;
    }
    if (viewParam === "workspace") {
      setRecentProjects(recordRecentPhotoProject({ blankWorkspace: true }));
    }
  }, [assetId, assetName, viewParam]);

  const handleOpenEmptyWorkspace = useCallback(() => {
    router.push(buildWorkspaceUrl(workspaceHref, { view: "workspace" }));
  }, [router, workspaceHref]);

  const handleNewWorkspace = useCallback(() => {
    router.push(workspaceHref);
  }, [router, workspaceHref]);

  const handleOpenRecentProject = useCallback(
    (project: RecentPhotoProject) => {
      router.push(buildRecentPhotoProjectHref(project));
    },
    [router],
  );

  const handleSelectAsset = useCallback(
    (asset: { id: string; name: string }) => {
      router.push(
        buildWorkspaceUrl(workspaceHref, {
          assetId: asset.id,
          assetName: asset.name,
        }),
      );
    },
    [router, workspaceHref],
  );

  const assetImageUrl = assetId
    ? `${getApiBaseUrl()}/files/${assetId}/download`
    : null;

  if (isOpening) {
    return <PhotoStudioLaunchShimmer />;
  }

  return (
    <>
      <PhotoStudioApp
        assetId={assetId}
        assetName={assetName}
        assetImageUrl={assetImageUrl}
        initialView={initialView}
        recentProjects={recentProjects}
        onOpenRecentProject={handleOpenRecentProject}
        formatRecentTime={formatRecentPhotoProjectTime}
        onOpenLibrary={() => setPickerOpen(true)}
        onOpenEmptyWorkspace={handleOpenEmptyWorkspace}
        onNewWorkspace={handleNewWorkspace}
      />
      <PhotoStudioAssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectAsset}
      />
    </>
  );
}
