"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PhotoStudioApp,
  type CatalogApp,
  type PhotoStudioGeneratedItem,
  type PhotoStudioOptionsConfig,
  type PhotoStudioSavedDesign,
  type PhotoStudioView,
  type PhotoStudioWorkspaceSnapshot,
  type RecentPhotoProject,
  type CanvasBackgroundId,
  getAppWorkspaceHref,
  getAppHelpHref,
} from "@orbit/clovai-apps";
import { PhotoStudioAssetPicker } from "@/components/apps/photo-studio-asset-picker";
import { useAppShell } from "@/components/layout/app-shell-context";
import { getApiBaseUrl, getApiErrorMessage, photoStudioApi, type ApiPhotoStudioDesignItem, type ApiPhotoStudioGeneratedItem } from "@/lib/orbit-api";
import {
  buildRecentPhotoProjectHref,
  fetchRecentPhotoProjects,
  formatRecentPhotoProjectTime,
  mapApiWorkspaceToSnapshot,
  recordRecentPhotoProject,
} from "@/lib/photo-studio-recent-projects";
import { LIBRARY_OPEN_ORIGIN } from "@/lib/library-open-in-app";
import {
  createDebouncedCanvasJsonExporter,
  fetchExportedCanvasLayers,
} from "@/lib/photo-studio-canvas-export";
import { PhotoStudioLaunchShimmer } from "@/components/ui/skeleton";

const APP_OPEN_DELAY_MS = 750;

function SaveWorkspaceDialog({
  open,
  initialName,
  isSaving,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  initialName: string;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) setName(initialName);
  }, [initialName, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10004] flex items-center justify-center bg-background/75 px-4 backdrop-blur-md">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close save dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-workspace-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-xl"
      >
        <h2 id="save-workspace-title" className="text-lg font-semibold tracking-tight text-foreground">
          Save project
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Give your workspace a name. It will appear in your recent projects after saving.
        </p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Project name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Summer campaign logo"
            autoFocus
            className="mt-2 h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10"
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim() && !isSaving) {
                onConfirm(name.trim());
              }
            }}
          />
        </label>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-9 rounded-lg px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/60 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(name.trim())}
            disabled={isSaving || !name.trim()}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save project"}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildWorkspaceUrl(
  workspaceHref: string,
  params: {
    view?: PhotoStudioView;
    workspaceId?: string | null;
    assetId?: string | null;
    assetName?: string | null;
  },
) {
  const search = new URLSearchParams();
  if (params.workspaceId) {
    search.set("workspaceId", params.workspaceId);
    search.set("view", "workspace");
  } else if (params.view === "workspace") {
    search.set("view", "workspace");
  } else if (params.view === "open") {
    search.set("view", "open");
  } else if (params.view === "home") {
    search.set("view", "home");
  }
  if (params.assetId) {
    search.set("assetId", params.assetId);
    search.set("assetName", params.assetName || "Selected image");
    search.set("view", "workspace");
  }
  const query = search.toString();
  return query ? `${workspaceHref}?${query}` : workspaceHref;
}

function snapshotToApiState(snapshot: PhotoStudioWorkspaceSnapshot) {
  return {
    title: snapshot.title,
    assetId: snapshot.assetId ?? undefined,
    assetName: snapshot.assetName ?? undefined,
    aspectRatio: snapshot.aspectRatio,
    creationType: snapshot.creationType,
    stylePreset: snapshot.stylePreset,
    logoTransparentBackground: snapshot.logoTransparentBackground,
    canvasBackgroundId: snapshot.canvasBackgroundId,
    customCanvasBackgroundColor: snapshot.customCanvasBackgroundColor,
    customCanvasGradientEnd: snapshot.customCanvasGradientEnd,
    customCanvasGradientEnabled: snapshot.customCanvasGradientEnabled,
    projectName: snapshot.projectName,
    canvasShapes: snapshot.canvasShapes,
    canvasTexts: snapshot.canvasTexts,
    generatedItems: snapshot.generatedItems,
    savedDesigns: snapshot.savedDesigns,
    selectedGenerationId: snapshot.selectedGenerationId,
    materializedGenerationId: snapshot.materializedGenerationId,
  };
}

function mapApiDesign(item: ApiPhotoStudioDesignItem): PhotoStudioSavedDesign {
  return {
    id: item.id,
    title: item.title,
    aspectRatio: item.aspectRatio,
    canvasBackgroundId: item.canvasBackgroundId as CanvasBackgroundId,
    shapes: item.shapes as PhotoStudioSavedDesign["shapes"],
    texts: item.texts as PhotoStudioSavedDesign["texts"],
    createdAt: item.createdAt,
    source: item.source,
  };
}

function mapApiGeneration(item: ApiPhotoStudioGeneratedItem): PhotoStudioGeneratedItem {
  return {
    id: item.id,
    prompt: item.prompt,
    creationType: item.creationType,
    aspectRatio: item.aspectRatio,
    stylePreset: item.stylePreset,
    label: item.label,
    previewGradient: item.previewGradient,
    createdAt: item.createdAt,
    transparentBackground: item.transparentBackground,
    canvasBackgroundId: item.canvasBackgroundId as PhotoStudioGeneratedItem["canvasBackgroundId"],
    variantIndex: item.variantIndex,
    imageUrl: item.imageUrl ?? undefined,
  };
}

export function PhotoStudioAppPage({ app }: { app: CatalogApp }) {
  const workspaceHref = getAppWorkspaceHref(app);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeader } = useAppShell();

  const workspaceIdParam = searchParams.get("workspaceId");
  const assetIdParam = searchParams.get("assetId");
  const assetNameParam = searchParams.get("assetName");
  const viewParam = searchParams.get("view");
  const resumedFromLibrary = searchParams.get("origin") === LIBRARY_OPEN_ORIGIN;
  const normalizedView =
    viewParam === "overview" ? "home" : viewParam === "open" || viewParam === "home" ? viewParam : null;
  const initialView: PhotoStudioView =
    workspaceIdParam || assetIdParam
      ? "workspace"
      : normalizedView === "open"
        ? "open"
        : "home";

  const [isOpening, setIsOpening] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentPhotoProject[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(workspaceIdParam);
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<PhotoStudioWorkspaceSnapshot | null>(
    null,
  );
  const [resolvedAssetId, setResolvedAssetId] = useState<string | null>(assetIdParam);
  const [resolvedAssetName, setResolvedAssetName] = useState<string | null>(assetNameParam);
  const [workspaceLoading, setWorkspaceLoading] = useState(Boolean(workspaceIdParam));
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [generationsLoading, setGenerationsLoading] = useState(false);
  const [generationsFromApi, setGenerationsFromApi] = useState<PhotoStudioGeneratedItem[]>([]);
  const [photoStudioOptions, setPhotoStudioOptions] = useState<PhotoStudioOptionsConfig | undefined>();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [workspaceSessionKey, setWorkspaceSessionKey] = useState(0);

  const latestSnapshotRef = useRef<PhotoStudioWorkspaceSnapshot | null>(null);
  const savedSnapshotKeyRef = useRef<string | null>(null);
  const workspaceRequestRef = useRef(0);
  const draftExportIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `draft-${Date.now()}`,
  );
  const canvasJsonExporterRef = useRef(
    createDebouncedCanvasJsonExporter({
      workspaceId: workspaceId,
      draftId: draftExportIdRef.current,
    }),
  );

  useEffect(() => {
    canvasJsonExporterRef.current = createDebouncedCanvasJsonExporter({
      workspaceId,
      draftId: draftExportIdRef.current,
    });
  }, [workspaceId]);

  useEffect(() => {
    setHeader({
      title: app.name,
      subtitle: workspaceId
        ? workspaceSnapshot?.projectName?.trim() || resolvedAssetName?.trim() || "Saved project"
        : resolvedAssetId
          ? resolvedAssetName?.trim() || "Unsaved workspace"
          : initialView === "workspace"
            ? hasUnsavedChanges
              ? "Unsaved workspace"
              : "New workspace"
            : app.category,
    });
    return () => setHeader(null);
  }, [
    app.category,
    app.name,
    hasUnsavedChanges,
    initialView,
    resolvedAssetId,
    resolvedAssetName,
    setHeader,
    workspaceId,
    workspaceSnapshot?.projectName,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpening(false), APP_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchRecentPhotoProjects()
      .then((projects) => {
        if (!cancelled) setRecentProjects(projects);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!workspaceIdParam) {
      setResolvedAssetId(assetIdParam);
      setResolvedAssetName(assetNameParam);
    }
  }, [assetIdParam, assetNameParam, workspaceIdParam]);

  useEffect(() => {
    if (!resumedFromLibrary) return;
    if (workspaceIdParam) {
      setRecentProjects(
        recordRecentPhotoProject({
          workspaceId: workspaceIdParam,
          title: workspaceSnapshot?.projectName ?? assetNameParam,
          assetId: assetIdParam,
          assetName: assetNameParam,
        }),
      );
      return;
    }
    if (assetIdParam) {
      setRecentProjects(
        recordRecentPhotoProject({
          assetId: assetIdParam,
          assetName: assetNameParam,
          title: assetNameParam,
        }),
      );
    }
  }, [
    assetIdParam,
    assetNameParam,
    resumedFromLibrary,
    workspaceIdParam,
    workspaceSnapshot?.projectName,
  ]);

  useEffect(() => {
    const workspaceIdToLoad = workspaceIdParam;
    if (!workspaceIdToLoad) {
      setWorkspaceLoading(false);
      setWorkspaceId(null);
      setWorkspaceSnapshot(null);
      savedSnapshotKeyRef.current = null;
      setHasUnsavedChanges(false);
      return;
    }

    const requestId = ++workspaceRequestRef.current;
    let cancelled = false;

    async function loadWorkspace(targetWorkspaceId: string) {
      setWorkspaceLoading(true);
      setWorkspaceError(null);

      try {
        const workspace = await photoStudioApi.getWorkspace(targetWorkspaceId);
        if (cancelled || requestId !== workspaceRequestRef.current) return;

        const snapshot = mapApiWorkspaceToSnapshot(workspace);
        setWorkspaceId(workspace.id);
        setWorkspaceSnapshot(snapshot);
        setResolvedAssetId(snapshot.assetId ?? assetIdParam);
        setResolvedAssetName(snapshot.assetName ?? assetNameParam);
        latestSnapshotRef.current = snapshot;
        savedSnapshotKeyRef.current = JSON.stringify(snapshot);
        setHasUnsavedChanges(false);
      } catch (error) {
        if (cancelled || requestId !== workspaceRequestRef.current) return;
        setWorkspaceError(getApiErrorMessage(error, "Unable to load workspace."));
      } finally {
        if (!cancelled && requestId === workspaceRequestRef.current) {
          setWorkspaceLoading(false);
        }
      }
    }

    void loadWorkspace(workspaceIdToLoad);

    return () => {
      cancelled = true;
    };
  }, [assetIdParam, assetNameParam, workspaceIdParam]);

  useEffect(() => {
    let cancelled = false;
    photoStudioApi
      .options()
      .then((options) => {
        if (!cancelled) setPhotoStudioOptions(options);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setGenerationsLoading(true);

    photoStudioApi
      .generations()
      .then((result) => {
        if (cancelled) return;
        setGenerationsFromApi(result.data.map(mapApiGeneration));
      })
      .catch(() => {
        if (!cancelled) setGenerationsFromApi([]);
      })
      .finally(() => {
        if (!cancelled) setGenerationsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshRecents = useCallback(async () => {
    const projects = await fetchRecentPhotoProjects();
    setRecentProjects(projects);
  }, []);

  const handleWorkspaceSnapshotChange = useCallback((snapshot: PhotoStudioWorkspaceSnapshot) => {
    latestSnapshotRef.current = snapshot;
    canvasJsonExporterRef.current(snapshot);
    if (!workspaceId) {
      setHasUnsavedChanges(true);
      return;
    }
    const savedKey = savedSnapshotKeyRef.current;
    setHasUnsavedChanges(savedKey ? JSON.stringify(snapshot) !== savedKey : true);
  }, [workspaceId]);

  const handleOpenSaveDialog = useCallback(() => {
    setSaveError(null);
    setSaveDialogOpen(true);
  }, []);

  const handleConfirmSaveWorkspace = useCallback(
    async (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      const snapshot =
        latestSnapshotRef.current ??
        ({
          title: trimmedName,
          assetId: resolvedAssetId,
          assetName: resolvedAssetName,
          aspectRatio: "1:1",
          creationType: "logo",
          stylePreset: "studio",
          logoTransparentBackground: true,
          canvasBackgroundId: "violet-sunset",
          customCanvasBackgroundColor: "#6366f1",
          customCanvasGradientEnd: "#a855f7",
          customCanvasGradientEnabled: false,
          projectName: trimmedName,
          canvasShapes: [],
          canvasTexts: [],
          generatedItems: [],
          savedDesigns: [],
          selectedGenerationId: null,
          materializedGenerationId: null,
        } satisfies PhotoStudioWorkspaceSnapshot);

      setIsSavingWorkspace(true);
      setSaveError(null);

      const namedSnapshot: PhotoStudioWorkspaceSnapshot = {
        ...snapshot,
        title: trimmedName,
        projectName: trimmedName,
      };

      try {
        if (workspaceId) {
          const updated = await photoStudioApi.updateWorkspace(workspaceId, {
            title: trimmedName,
            assetId: namedSnapshot.assetId,
            assetName: namedSnapshot.assetName,
            state: snapshotToApiState(namedSnapshot),
            touch: true,
          });
          const nextSnapshot = mapApiWorkspaceToSnapshot(updated);
          setWorkspaceSnapshot(nextSnapshot);
          latestSnapshotRef.current = nextSnapshot;
          savedSnapshotKeyRef.current = JSON.stringify(nextSnapshot);
        } else {
          const created = await photoStudioApi.createWorkspace({
            title: trimmedName,
            assetId: resolvedAssetId ?? undefined,
            assetName: resolvedAssetName ?? undefined,
            state: snapshotToApiState(namedSnapshot),
          });
          const nextSnapshot = mapApiWorkspaceToSnapshot(created);
          setWorkspaceId(created.id);
          setWorkspaceSnapshot(nextSnapshot);
          latestSnapshotRef.current = nextSnapshot;
          savedSnapshotKeyRef.current = JSON.stringify(nextSnapshot);
          router.replace(
            buildWorkspaceUrl(workspaceHref, {
              workspaceId: created.id,
              view: "workspace",
            }),
          );
        }

        setHasUnsavedChanges(false);
        setSaveDialogOpen(false);
        await refreshRecents();
      } catch (error) {
        setSaveError(getApiErrorMessage(error, "Unable to save project."));
      } finally {
        setIsSavingWorkspace(false);
      }
    },
    [refreshRecents, resolvedAssetId, resolvedAssetName, router, workspaceHref, workspaceId],
  );

  const handleLoadDesigns = useCallback(async (activeWorkspaceId: string | null) => {
    const result = await photoStudioApi.designs(activeWorkspaceId ?? undefined);
    return {
      templates: result.templates.map(mapApiDesign),
      saved: result.saved.map(mapApiDesign),
    };
  }, []);

  const handleResetDraftWorkspace = useCallback(async () => {
    setWorkspaceId(null);
    setWorkspaceSnapshot(null);
    setResolvedAssetId(null);
    setResolvedAssetName(null);
    setWorkspaceError(null);
    latestSnapshotRef.current = null;
    savedSnapshotKeyRef.current = null;
    setHasUnsavedChanges(false);
    setWorkspaceSessionKey((key) => key + 1);
    router.replace(buildWorkspaceUrl(workspaceHref, { view: "workspace" }));
  }, [router, workspaceHref]);

  const handleNewWorkspace = useCallback(() => {
    router.push(buildWorkspaceUrl(workspaceHref, { view: "home" }));
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

  const handleGenerate = useCallback(
    async (input: {
      prompt: string;
      creationType: PhotoStudioGeneratedItem["creationType"];
      aspectRatio: string;
      stylePreset: string;
      transparentBackground?: boolean;
    }): Promise<PhotoStudioGeneratedItem[]> => {
      const result = await photoStudioApi.generate({
        ...input,
        assetId: resolvedAssetId ?? undefined,
      });
      const variants = result.variants.map(mapApiGeneration);
      setGenerationsFromApi((current) => {
        const merged = new Map<string, PhotoStudioGeneratedItem>();
        for (const item of [...variants, ...current]) {
          merged.set(item.id, item);
        }
        return Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
      });
      return variants;
    },
    [resolvedAssetId],
  );

  const handleDeleteGeneration = useCallback(async (id: string) => {
    await photoStudioApi.deleteGeneration(id);
    setGenerationsFromApi((current) => current.filter((item) => item.id !== id));
  }, []);

  const handleFetchGeneration = useCallback(async (id: string) => {
    const item = await photoStudioApi.getGeneration(id);
    return mapApiGeneration(item);
  }, []);

  const handleDeleteRecentProject = useCallback(
    async (project: RecentPhotoProject) => {
      if (!project.workspaceId) return;
      await photoStudioApi.deleteWorkspace(project.workspaceId);
      if (workspaceId === project.workspaceId) {
        router.push(workspaceHref);
      }
      await refreshRecents();
    },
    [refreshRecents, router, workspaceHref, workspaceId],
  );

  const handleOpenHelp = useCallback(() => {
    router.push(getAppHelpHref(app));
  }, [app, router]);

  const assetImageUrl = resolvedAssetId
    ? `${getApiBaseUrl()}/files/${resolvedAssetId}/download`
    : null;

  if (isOpening) {
    return <PhotoStudioLaunchShimmer />;
  }

  if (workspaceError && workspaceIdParam && !workspaceId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm font-medium text-destructive">Could not load workspace</p>
          <p className="mt-1 text-sm text-muted-foreground">{workspaceError}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PhotoStudioApp
        assetId={resolvedAssetId}
        assetName={resolvedAssetName}
        assetImageUrl={assetImageUrl}
        workspaceId={workspaceId}
        initialWorkspaceSnapshot={workspaceSnapshot}
        initialView={initialView}
        recentProjects={recentProjects}
        onOpenRecentProject={handleOpenRecentProject}
        onDeleteRecentProject={handleDeleteRecentProject}
        formatRecentTime={formatRecentPhotoProjectTime}
        onOpenLibrary={() => setPickerOpen(true)}
        onResetDraftWorkspace={handleResetDraftWorkspace}
        onNewWorkspace={handleNewWorkspace}
        workspaceSessionKey={workspaceSessionKey}
        onWorkspaceSnapshotChange={handleWorkspaceSnapshotChange}
        onSaveWorkspace={handleOpenSaveDialog}
        isSavingWorkspace={isSavingWorkspace}
        workspacePersisted={Boolean(workspaceId)}
        hasUnsavedWorkspaceChanges={hasUnsavedChanges}
        photoStudioOptions={photoStudioOptions}
        onLoadDesigns={handleLoadDesigns}
        generationsLoading={generationsLoading}
        initialGenerationsFromApi={generationsFromApi}
        onGenerate={handleGenerate}
        onDeleteGeneration={handleDeleteGeneration}
        onFetchGeneration={handleFetchGeneration}
        onOpenHelp={handleOpenHelp}
        resumedFromLibrary={resumedFromLibrary}
        canvasDraftId={draftExportIdRef.current}
        loadExportedCanvasJson={async ({ workspaceId: wsId, draftId }) =>
          fetchExportedCanvasLayers({ workspaceId: wsId, draftId })
        }
      />
      <PhotoStudioAssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectAsset}
      />
      <SaveWorkspaceDialog
        open={saveDialogOpen}
        initialName={
          latestSnapshotRef.current?.projectName?.trim() ||
          workspaceSnapshot?.projectName?.trim() ||
          resolvedAssetName?.trim() ||
          ""
        }
        isSaving={isSavingWorkspace}
        error={saveError}
        onClose={() => {
          if (!isSavingWorkspace) setSaveDialogOpen(false);
        }}
        onConfirm={handleConfirmSaveWorkspace}
      />
    </>
  );
}
