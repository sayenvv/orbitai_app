"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PhotoStudioApp,
  PHOTO_STUDIO_IMAGE_FORMATS_LABEL,
  isPhotoStudioSupportedImageFile,
  isPhotoStudioSupportedImageFilename,
  isPhotoStudioSupportedImageMime,
  type CatalogApp,
  type PhotoStudioGeneratedItem,
  type PhotoStudioOptionsConfig,
  type PhotoStudioSavedDesign,
  type PhotoStudioView,
  type PhotoStudioWorkspaceSnapshot,
  type PhotoStudioWorkspaceTab,
  type PhotoStudioWorkspaceUpload,
  type RecentPhotoProject,
  type CanvasBackgroundId,
  getAppWorkspaceHref,
  getAppHelpHref,
} from "@orbit/clovai-apps";
import { PhotoStudioAssetPicker } from "@/components/apps/photo-studio-asset-picker";
import { useAppShell } from "@/components/layout/app-shell-context";
import {
  getApiBaseUrl,
  getApiErrorMessage,
  photoStudioApi,
  publicApi,
  type ApiPhotoStudioDesignItem,
  type ApiPhotoStudioGeneratedItem,
  type ApiRagDocument,
} from "@/lib/orbit-api";
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
const WORKSPACE_TAB_PREPARE_MS = 450;

function isPhotoStudioLibraryUpload(doc: ApiRagDocument): boolean {
  if (isPhotoStudioSupportedImageMime(doc.mime_type)) {
    return true;
  }
  return isPhotoStudioSupportedImageFilename(doc.name || doc.original_filename);
}

function createWorkspaceTabId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createWorkspaceDraftId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `draft-${Date.now()}`;
}

function defaultWorkspaceTabTitle(tabCount: number): string {
  return tabCount <= 1 ? "Untitled" : `Untitled ${tabCount}`;
}

type WorkspaceTabRecord = PhotoStudioWorkspaceTab;

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
            className="mt-2 h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-black/20 focus:ring-4 focus:ring-black/[0.06] dark:focus:border-white/20 dark:focus:ring-white/10"
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
  const initialView: PhotoStudioView =
    workspaceIdParam || assetIdParam || viewParam === "workspace" ? "workspace" : "home";

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
  const [isPreparingWorkspaceTab, setIsPreparingWorkspaceTab] = useState(false);
  const [tabUnsavedFlags, setTabUnsavedFlags] = useState<Record<string, boolean>>({});
  const [workspaceUploads, setWorkspaceUploads] = useState<PhotoStudioWorkspaceUpload[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [uploadsError, setUploadsError] = useState<string | null>(null);
  const [assetUploading, setAssetUploading] = useState(false);
  const [assetUploadError, setAssetUploadError] = useState<string | null>(null);

  const initialTabIdRef = useRef(createWorkspaceTabId());
  const initialDraftIdRef = useRef(createWorkspaceDraftId());
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTabRecord[]>(() => [
    {
      id: initialTabIdRef.current,
      title:
        assetNameParam?.trim() ||
        (workspaceIdParam ? "Project" : defaultWorkspaceTabTitle(1)),
      workspaceId: workspaceIdParam,
      assetId: assetIdParam,
      assetName: assetNameParam,
      draftId: initialDraftIdRef.current,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState(initialTabIdRef.current);

  const latestSnapshotRef = useRef<PhotoStudioWorkspaceSnapshot | null>(null);
  const savedSnapshotKeyRef = useRef<string | null>(null);
  const workspaceRequestRef = useRef(0);
  const tabSnapshotsRef = useRef<Map<string, PhotoStudioWorkspaceSnapshot>>(new Map());
  const tabSavedKeysRef = useRef<Map<string, string>>(new Map());
  const draftExportIdRef = useRef(initialDraftIdRef.current);
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
      return;
    }

    const activeTab = workspaceTabs.find((tab) => tab.id === activeTabId);
    if (activeTab?.workspaceId && activeTab.workspaceId !== workspaceIdToLoad) {
      return;
    }

    const cachedSnapshot = tabSnapshotsRef.current.get(activeTabId);
    if (cachedSnapshot) {
      const snapshot = structuredClone(cachedSnapshot);
      setWorkspaceId(workspaceIdToLoad);
      setWorkspaceSnapshot(snapshot);
      latestSnapshotRef.current = snapshot;
      savedSnapshotKeyRef.current =
        tabSavedKeysRef.current.get(activeTabId) ?? JSON.stringify(snapshot);
      setHasUnsavedChanges(tabUnsavedFlags[activeTabId] ?? false);
      setWorkspaceLoading(false);
      setWorkspaceError(null);
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
        tabSnapshotsRef.current.set(activeTabId, snapshot);
        tabSavedKeysRef.current.set(activeTabId, JSON.stringify(snapshot));
        setWorkspaceTabs((current) =>
          current.map((tab) =>
            tab.id === activeTabId
              ? {
                  ...tab,
                  workspaceId: workspace.id,
                  assetId: snapshot.assetId ?? tab.assetId,
                  assetName: snapshot.assetName ?? tab.assetName,
                  title:
                    snapshot.projectName?.trim() ||
                    snapshot.title?.trim() ||
                    workspace.title ||
                    tab.title,
                }
              : tab,
          ),
        );
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
  }, [activeTabId, assetIdParam, assetNameParam, workspaceIdParam, workspaceTabs]);

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

  const persistActiveTabSnapshot = useCallback(() => {
    const snapshot =
      latestSnapshotRef.current ?? tabSnapshotsRef.current.get(activeTabId) ?? null;
    if (!snapshot) return;
    const cloned = structuredClone(snapshot);
    tabSnapshotsRef.current.set(activeTabId, cloned);
    const activeTab = workspaceTabs.find((tab) => tab.id === activeTabId);
    if (activeTab?.workspaceId) {
      tabSavedKeysRef.current.set(activeTabId, JSON.stringify(cloned));
    }
  }, [activeTabId, workspaceTabs]);

  const syncActiveTabUrl = useCallback(
    (tab: WorkspaceTabRecord) => {
      router.replace(
        buildWorkspaceUrl(workspaceHref, {
          workspaceId: tab.workspaceId,
          assetId: tab.assetId,
          assetName: tab.assetName,
          view: "workspace",
        }),
      );
    },
    [router, workspaceHref],
  );

  const applyWorkspaceTab = useCallback(
    async (tab: WorkspaceTabRecord) => {
      setActiveTabId(tab.id);
      draftExportIdRef.current = tab.draftId;
      canvasJsonExporterRef.current = createDebouncedCanvasJsonExporter({
        workspaceId: tab.workspaceId,
        draftId: tab.draftId,
      });

      const cachedSnapshot = tabSnapshotsRef.current.get(tab.id) ?? null;
      const snapshotForTab = cachedSnapshot ? structuredClone(cachedSnapshot) : null;
      setWorkspaceId(tab.workspaceId);
      setResolvedAssetId(tab.assetId);
      setResolvedAssetName(tab.assetName);
      setWorkspaceSnapshot(snapshotForTab);
      latestSnapshotRef.current = snapshotForTab;
      savedSnapshotKeyRef.current = tab.workspaceId
        ? tabSavedKeysRef.current.get(tab.id) ??
          (snapshotForTab ? JSON.stringify(snapshotForTab) : null)
        : null;
      setHasUnsavedChanges(tabUnsavedFlags[tab.id] ?? false);
      setWorkspaceError(null);

      if (tab.workspaceId && !snapshotForTab) {
        setWorkspaceLoading(true);
      } else {
        setWorkspaceLoading(false);
      }

      syncActiveTabUrl(tab);
    },
    [syncActiveTabUrl, tabUnsavedFlags],
  );

  const handleSelectWorkspaceTab = useCallback(
    (tabId: string) => {
      const tab = workspaceTabs.find((item) => item.id === tabId);
      if (!tab) return;
      if (tabId !== activeTabId) {
        persistActiveTabSnapshot();
      }
      void applyWorkspaceTab(tab);
    },
    [activeTabId, applyWorkspaceTab, persistActiveTabSnapshot, workspaceTabs],
  );

  const handleAddWorkspaceTab = useCallback(async () => {
    if (isPreparingWorkspaceTab) return;
    setIsPreparingWorkspaceTab(true);
    persistActiveTabSnapshot();
    try {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, WORKSPACE_TAB_PREPARE_MS);
      });
      const newTab: WorkspaceTabRecord = {
        id: createWorkspaceTabId(),
        title: defaultWorkspaceTabTitle(workspaceTabs.length + 1),
        workspaceId: null,
        assetId: null,
        assetName: null,
        draftId: createWorkspaceDraftId(),
      };
      setWorkspaceTabs((current) => [...current, newTab]);
      await applyWorkspaceTab(newTab);
    } finally {
      setIsPreparingWorkspaceTab(false);
    }
  }, [
    applyWorkspaceTab,
    isPreparingWorkspaceTab,
    persistActiveTabSnapshot,
    workspaceTabs.length,
  ]);

  const handleCloseWorkspaceTab = useCallback(
    (tabId: string) => {
      persistActiveTabSnapshot();
      tabSnapshotsRef.current.delete(tabId);
      tabSavedKeysRef.current.delete(tabId);
      setTabUnsavedFlags((current) => {
        const next = { ...current };
        delete next[tabId];
        return next;
      });

      if (workspaceTabs.length === 1) {
        const resetTab: WorkspaceTabRecord = {
          id: tabId,
          title: defaultWorkspaceTabTitle(1),
          workspaceId: null,
          assetId: null,
          assetName: null,
          draftId: createWorkspaceDraftId(),
        };
        setWorkspaceTabs([resetTab]);
        void applyWorkspaceTab(resetTab);
        return;
      }

      const remaining = workspaceTabs.filter((tab) => tab.id !== tabId);
      setWorkspaceTabs(remaining);

      if (activeTabId === tabId) {
        const nextActive = remaining[remaining.length - 1];
        if (nextActive) void applyWorkspaceTab(nextActive);
      }
    },
    [
      activeTabId,
      applyWorkspaceTab,
      persistActiveTabSnapshot,
      workspaceTabs,
    ],
  );

  const handleWorkspaceSnapshotChange = useCallback(
    (snapshot: PhotoStudioWorkspaceSnapshot) => {
      const cloned = structuredClone(snapshot);
      latestSnapshotRef.current = cloned;
      canvasJsonExporterRef.current(cloned);
      tabSnapshotsRef.current.set(activeTabId, cloned);

      const title = snapshot.projectName?.trim() || snapshot.title?.trim();
      if (title) {
        setWorkspaceTabs((current) =>
          current.map((tab) => (tab.id === activeTabId ? { ...tab, title } : tab)),
        );
      }

      let unsaved = false;
      if (!workspaceId) {
        unsaved = true;
      } else {
        const savedKey = savedSnapshotKeyRef.current;
        unsaved = savedKey ? JSON.stringify(snapshot) !== savedKey : true;
      }
      setHasUnsavedChanges(unsaved);
      setTabUnsavedFlags((current) => ({ ...current, [activeTabId]: unsaved }));
    },
    [activeTabId, workspaceId],
  );

  useEffect(() => {
    if (!workspaceSnapshot) return;
    const title = workspaceSnapshot.projectName?.trim() || workspaceSnapshot.title?.trim();
    if (!title) return;
    setWorkspaceTabs((current) =>
      current.map((tab) => (tab.id === activeTabId ? { ...tab, title } : tab)),
    );
  }, [activeTabId, workspaceSnapshot]);

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
          canvasBackgroundId: "warm-paper",
          customCanvasBackgroundColor: "#a8a29e",
          customCanvasGradientEnd: "#71717a",
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
          tabSnapshotsRef.current.set(activeTabId, nextSnapshot);
          tabSavedKeysRef.current.set(activeTabId, JSON.stringify(nextSnapshot));
          setWorkspaceTabs((current) =>
            current.map((tab) =>
              tab.id === activeTabId ? { ...tab, title: trimmedName } : tab,
            ),
          );
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
          tabSnapshotsRef.current.set(activeTabId, nextSnapshot);
          tabSavedKeysRef.current.set(activeTabId, JSON.stringify(nextSnapshot));
          setWorkspaceTabs((current) =>
            current.map((tab) =>
              tab.id === activeTabId
                ? {
                    ...tab,
                    workspaceId: created.id,
                    title: trimmedName,
                    assetId: nextSnapshot.assetId ?? tab.assetId,
                    assetName: nextSnapshot.assetName ?? tab.assetName,
                  }
                : tab,
            ),
          );
          router.replace(
            buildWorkspaceUrl(workspaceHref, {
              workspaceId: created.id,
              view: "workspace",
            }),
          );
        }

        setHasUnsavedChanges(false);
        setTabUnsavedFlags((current) => ({ ...current, [activeTabId]: false }));
        setSaveDialogOpen(false);
        await refreshRecents();
      } catch (error) {
        setSaveError(getApiErrorMessage(error, "Unable to save project."));
      } finally {
        setIsSavingWorkspace(false);
      }
    },
    [activeTabId, refreshRecents, resolvedAssetId, resolvedAssetName, router, workspaceHref, workspaceId],
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
    tabSnapshotsRef.current.delete(activeTabId);
    tabSavedKeysRef.current.delete(activeTabId);
    setHasUnsavedChanges(false);
    setTabUnsavedFlags((current) => ({ ...current, [activeTabId]: false }));
    setWorkspaceTabs((current) =>
      current.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              workspaceId: null,
              assetId: null,
              assetName: null,
              title: defaultWorkspaceTabTitle(current.length),
              draftId: createWorkspaceDraftId(),
            }
          : tab,
      ),
    );
    setWorkspaceSessionKey((key) => key + 1);
    router.replace(buildWorkspaceUrl(workspaceHref, { view: "workspace" }));
  }, [activeTabId, router, workspaceHref, workspaceTabs.length]);

  const handleNewWorkspace = useCallback(() => {
    void handleAddWorkspaceTab();
  }, [handleAddWorkspaceTab]);

  const handleOpenRecentProject = useCallback(
    (project: RecentPhotoProject) => {
      if (project.workspaceId) {
        const existing = workspaceTabs.find(
          (tab) => tab.workspaceId === project.workspaceId,
        );
        if (existing) {
          handleSelectWorkspaceTab(existing.id);
          return;
        }
      }

      persistActiveTabSnapshot();
      const newTab: WorkspaceTabRecord = {
        id: createWorkspaceTabId(),
        title: project.title?.trim() || project.assetName?.trim() || "Project",
        workspaceId: project.workspaceId ?? null,
        assetId: project.assetId ?? null,
        assetName: project.assetName ?? null,
        draftId: createWorkspaceDraftId(),
      };
      setWorkspaceTabs((current) => [...current, newTab]);
      void applyWorkspaceTab(newTab);
    },
    [
      applyWorkspaceTab,
      handleSelectWorkspaceTab,
      persistActiveTabSnapshot,
      workspaceTabs,
    ],
  );

  const refreshWorkspaceUploads = useCallback(async () => {
    setUploadsLoading(true);
    setUploadsError(null);
    try {
      const [assets, library] = await Promise.all([
        photoStudioApi.assets(),
        publicApi.library().catch(() => ({ uploads: [] as ApiRagDocument[], generated: [] })),
      ]);
      const merged = new Map<string, PhotoStudioWorkspaceUpload>();
      for (const asset of assets) {
        merged.set(asset.id, {
          id: asset.id,
          name: asset.name,
          status: "ready",
          imageUrl: asset.downloadUrl || `${getApiBaseUrl()}/files/${asset.id}/download`,
          createdAt: asset.createdAt ?? null,
        });
      }
      for (const doc of library.uploads || []) {
        if (!isPhotoStudioLibraryUpload(doc)) continue;
        merged.set(doc.id, {
          id: doc.id,
          name: doc.name || doc.original_filename,
          status: doc.status,
          imageUrl: `${getApiBaseUrl()}/files/${doc.id}/download`,
        });
      }
      setWorkspaceUploads(Array.from(merged.values()));
    } catch (err) {
      setUploadsError(getApiErrorMessage(err, "Failed to load uploads"));
    } finally {
      setUploadsLoading(false);
    }
  }, []);

  const handleApplyWorkspaceUpload = useCallback(
    (upload: PhotoStudioWorkspaceUpload) => {
      if (upload.status && upload.status !== "ready") return;
      persistActiveTabSnapshot();
      const activeTab = workspaceTabs.find((tab) => tab.id === activeTabId);
      if (!activeTab) return;
      const nextTab: WorkspaceTabRecord = {
        ...activeTab,
        assetId: upload.id,
        assetName: upload.name,
      };
      setWorkspaceTabs((tabs) =>
        tabs.map((tab) => (tab.id === activeTabId ? nextTab : tab)),
      );
      setResolvedAssetId(upload.id);
      setResolvedAssetName(upload.name);
      const snapshot =
        latestSnapshotRef.current ?? tabSnapshotsRef.current.get(activeTabId) ?? null;
      if (snapshot) {
        const nextSnapshot = {
          ...snapshot,
          assetId: upload.id,
          assetName: upload.name,
        };
        latestSnapshotRef.current = nextSnapshot;
        setWorkspaceSnapshot(nextSnapshot);
        tabSnapshotsRef.current.set(activeTabId, nextSnapshot);
      }
      syncActiveTabUrl(nextTab);
    },
    [activeTabId, persistActiveTabSnapshot, syncActiveTabUrl, workspaceTabs],
  );

  const handleUploadImageFile = useCallback(
    async (file: File) => {
      if (!isPhotoStudioSupportedImageFile(file)) {
        setAssetUploadError(`Use ${PHOTO_STUDIO_IMAGE_FORMATS_LABEL} images only.`);
        return;
      }
      setAssetUploading(true);
      setAssetUploadError(null);
      try {
        const doc = await publicApi.uploadFile(file);
        await refreshWorkspaceUploads();
        handleApplyWorkspaceUpload({
          id: doc.id,
          name: doc.name || doc.original_filename || file.name,
          status: doc.status,
          imageUrl: `${getApiBaseUrl()}/files/${doc.id}/download`,
        });
      } catch (err) {
        setAssetUploadError(getApiErrorMessage(err, "Upload failed"));
      } finally {
        setAssetUploading(false);
      }
    },
    [handleApplyWorkspaceUpload, refreshWorkspaceUploads],
  );

  const handleSelectAsset = useCallback(
    (asset: { id: string; name: string }) => {
      persistActiveTabSnapshot();
      const newTab: WorkspaceTabRecord = {
        id: createWorkspaceTabId(),
        title: asset.name.trim() || "Untitled",
        workspaceId: null,
        assetId: asset.id,
        assetName: asset.name,
        draftId: createWorkspaceDraftId(),
      };
      setWorkspaceTabs((current) => [...current, newTab]);
      void applyWorkspaceTab(newTab);
      void refreshWorkspaceUploads();
    },
    [applyWorkspaceTab, persistActiveTabSnapshot, refreshWorkspaceUploads],
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
      const tabToClose = workspaceTabs.find(
        (tab) => tab.workspaceId === project.workspaceId,
      );
      if (tabToClose) {
        handleCloseWorkspaceTab(tabToClose.id);
      }
      await refreshRecents();
    },
    [handleCloseWorkspaceTab, refreshRecents, workspaceTabs],
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
        workspaceUploads={workspaceUploads}
        uploadsLoading={uploadsLoading}
        uploadsError={uploadsError}
        onSelectWorkspaceUpload={handleApplyWorkspaceUpload}
        onRefreshWorkspaceUploads={refreshWorkspaceUploads}
        onUploadImageFile={handleUploadImageFile}
        assetUploading={assetUploading}
        assetUploadError={assetUploadError}
        onResetDraftWorkspace={handleResetDraftWorkspace}
        onNewWorkspace={handleNewWorkspace}
        workspaceTabs={workspaceTabs.map((tab) => ({
          ...tab,
          hasUnsavedChanges: Boolean(tabUnsavedFlags[tab.id]),
        }))}
        activeWorkspaceTabId={activeTabId}
        onSelectWorkspaceTab={handleSelectWorkspaceTab}
        onCloseWorkspaceTab={handleCloseWorkspaceTab}
        onNewWorkspaceTab={() => void handleAddWorkspaceTab()}
        isPreparingNewWorkspaceTab={isPreparingWorkspaceTab}
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
