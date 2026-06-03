"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ResearchCompanionApp,
  type CatalogApp,
  type RecentWorkspace,
  type ResearchCompanionGeneratableInsightType,
  type ResearchCompanionView,
  type ResearchCompanionWorkspaceTab,
  getAppWorkspaceHref,
  getAppHelpHref,
  getMissingInsightTypes,
  mergeInsightTypes,
  normalizeResearchCompanionInsightTypes,
  parseResearchCompanionInsightTypesParam,
  DEFAULT_WORKSPACE_TYPE_ID,
  WorkspaceTypePickerModal,
  getWorkspaceTypeDefinition,
  parseWorkspaceTypeParam,
  type ResearchCompanionWorkspaceTypeId,
} from "@orbit/clovai-apps";
import { useResearchCompanionSourcePicker } from "@/components/apps/research-companion-source-picker";
import { ResearchCompanionWorkspaceChat } from "@/components/apps/research-companion-workspace-chat";
import { ResearchCompanionWorkspaceNote } from "@/components/apps/research-companion-workspace-note";
import { InsightGenerationConfirmModal } from "@/components/insights/insight-generation-confirm-modal";
import { InsightGeneratingOverlay } from "@/components/insights/insight-generating-overlay";
import { PdfDocumentProvider, usePdfDocument } from "@/components/rag/pdf-document-provider";
import { PdfPageCanvas, ResearchCompanionPdfShell } from "@/components/rag/pdf-page-canvas";
import { useAppShell } from "@/components/layout/app-shell-context";
import { findExistingInsightForDocument } from "@/lib/research-companion-insights";
import { LIBRARY_OPEN_ORIGIN } from "@/lib/library-open-in-app";
import { getApiErrorMessage, publicApi } from "@/lib/orbit-api";
import {
  buildRecentWorkspaceHref,
  formatRecentWorkspaceTime,
  readRecentWorkspaces,
  recordRecentWorkspace,
} from "@/lib/research-companion-recent-workspaces";
import { PdfUploadCancelledError, uploadPdfAndWait } from "@/lib/rag-upload";
import { ResearchCompanionWorkspaceShimmer } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const WORKSPACE_OPEN_DELAY_MS = 750;

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

function defaultWorkspaceTabTitle(
  tabCount: number,
  workspaceTypeId: ResearchCompanionWorkspaceTypeId = DEFAULT_WORKSPACE_TYPE_ID,
): string {
  const type = getWorkspaceTypeDefinition(workspaceTypeId);
  const base = type.shortLabel;
  return tabCount <= 1 ? base : `${base} ${tabCount}`;
}

type WorkspaceTabRecord = ResearchCompanionWorkspaceTab;

type WorkspaceContentProps = {
  sourceId?: string | null;
  sourceName: string | null;
  insightId: string | null;
  generatedInsightTypes?: ResearchCompanionGeneratableInsightType[];
  pageCount: number;
  initialTab: ResearchCompanionView;
  initialAssistPanel?: "chat" | "summary" | "flashcards" | "note" | null;
  initialConversationId?: string | null;
  onOpenFile: () => void;
  onOpenLibrary: () => void;
  onUploadFile: () => void;
  onNewWorkspace: () => void;
  onResetDraftWorkspace: () => void | Promise<void>;
  workspaceSessionKey: number;
  onOpenHelp: () => void;
  recentWorkspaces: RecentWorkspace[];
  onOpenRecentWorkspace: (workspace: RecentWorkspace) => void;
  onGenerateInsights?: () => void | Promise<void>;
  insightsGenerating?: boolean;
  insightsGenerateError?: string | null;
  generatingInsightTypes?: ResearchCompanionGeneratableInsightType[];
  fileUploading?: boolean;
  fileUploadProgress?: string | null;
  fileUploadError?: string | null;
  resumedFromLibrary?: boolean;
  apiPageCount?: number;
  workspaceTabs: WorkspaceTabRecord[];
  activeWorkspaceTabId: string;
  onSelectWorkspaceTab: (tabId: string) => void;
  onCloseWorkspaceTab: (tabId: string) => void;
  onNewWorkspaceTab: () => void;
  isPreparingNewWorkspaceTab?: boolean;
  onShellViewChange?: (view: ResearchCompanionView) => void;
  workspaceTypeId: ResearchCompanionWorkspaceTypeId;
  onStartWorkspaceWithType?: (typeId: ResearchCompanionWorkspaceTypeId) => void;
};

type WorkspaceContentPropsWithoutPageCount = Omit<WorkspaceContentProps, "pageCount">;

function ResearchCompanionWorkspaceApp({
  sourceId,
  sourceName,
  insightId,
  generatedInsightTypes,
  pageCount,
  initialTab,
  initialAssistPanel = null,
  initialConversationId = null,
  onOpenFile,
  onOpenLibrary,
  onUploadFile,
  onNewWorkspace,
  onResetDraftWorkspace,
  workspaceSessionKey,
  onOpenHelp,
  recentWorkspaces,
  onOpenRecentWorkspace,
  onGenerateInsights,
  insightsGenerating,
  insightsGenerateError,
  generatingInsightTypes,
  fileUploading,
  fileUploadProgress,
  fileUploadError,
  resumedFromLibrary = false,
  workspaceTabs,
  activeWorkspaceTabId,
  onSelectWorkspaceTab,
  onCloseWorkspaceTab,
  onNewWorkspaceTab,
  isPreparingNewWorkspaceTab = false,
  onShellViewChange,
  apiPageCount,
  workspaceTypeId,
  onStartWorkspaceWithType,
}: WorkspaceContentProps) {
  if (sourceId) {
    return (
      <PdfDocumentProvider documentId={sourceId}>
        <ResearchCompanionWorkspaceAppWithPdf
          sourceId={sourceId}
          sourceName={sourceName}
          insightId={insightId}
          generatedInsightTypes={generatedInsightTypes}
          apiPageCount={apiPageCount}
          initialTab={initialTab}
          initialAssistPanel={initialAssistPanel}
          initialConversationId={initialConversationId}
          onOpenFile={onOpenFile}
          onOpenLibrary={onOpenLibrary}
          onUploadFile={onUploadFile}
          onNewWorkspace={onNewWorkspace}
          onResetDraftWorkspace={onResetDraftWorkspace}
          workspaceSessionKey={workspaceSessionKey}
          onOpenHelp={onOpenHelp}
          recentWorkspaces={recentWorkspaces}
          onOpenRecentWorkspace={onOpenRecentWorkspace}
          onGenerateInsights={onGenerateInsights}
          insightsGenerating={insightsGenerating}
          insightsGenerateError={insightsGenerateError}
          generatingInsightTypes={generatingInsightTypes}
          fileUploading={fileUploading}
          fileUploadProgress={fileUploadProgress}
          fileUploadError={fileUploadError}
          resumedFromLibrary={resumedFromLibrary}
          workspaceTabs={workspaceTabs}
          activeWorkspaceTabId={activeWorkspaceTabId}
          onSelectWorkspaceTab={onSelectWorkspaceTab}
          onCloseWorkspaceTab={onCloseWorkspaceTab}
          onNewWorkspaceTab={onNewWorkspaceTab}
          isPreparingNewWorkspaceTab={isPreparingNewWorkspaceTab}
          onShellViewChange={onShellViewChange}
          workspaceTypeId={workspaceTypeId}
          onStartWorkspaceWithType={onStartWorkspaceWithType}
        />
      </PdfDocumentProvider>
    );
  }

  return (
    <ResearchCompanionWorkspaceAppCore
      sourceId={null}
      sourceName={sourceName}
      insightId={insightId}
      generatedInsightTypes={generatedInsightTypes}
      pageCount={0}
      initialTab={initialTab}
      initialAssistPanel={initialAssistPanel}
      initialConversationId={initialConversationId}
      onOpenFile={onOpenFile}
      onOpenLibrary={onOpenLibrary}
      onUploadFile={onUploadFile}
      onNewWorkspace={onNewWorkspace}
      onResetDraftWorkspace={onResetDraftWorkspace}
      workspaceSessionKey={workspaceSessionKey}
      onOpenHelp={onOpenHelp}
      recentWorkspaces={recentWorkspaces}
      onOpenRecentWorkspace={onOpenRecentWorkspace}
      onGenerateInsights={onGenerateInsights}
      insightsGenerating={insightsGenerating}
      insightsGenerateError={insightsGenerateError}
      generatingInsightTypes={generatingInsightTypes}
      fileUploading={fileUploading}
      fileUploadProgress={fileUploadProgress}
      fileUploadError={fileUploadError}
      resumedFromLibrary={resumedFromLibrary}
      workspaceTabs={workspaceTabs}
      activeWorkspaceTabId={activeWorkspaceTabId}
      onSelectWorkspaceTab={onSelectWorkspaceTab}
      onCloseWorkspaceTab={onCloseWorkspaceTab}
      onNewWorkspaceTab={onNewWorkspaceTab}
      isPreparingNewWorkspaceTab={isPreparingNewWorkspaceTab}
      onShellViewChange={onShellViewChange}
      workspaceTypeId={workspaceTypeId}
      onStartWorkspaceWithType={onStartWorkspaceWithType}
    />
  );
}

function ResearchCompanionWorkspaceAppWithPdf(props: WorkspaceContentPropsWithoutPageCount) {
  const { numPages } = usePdfDocument();
  const pageCount = Math.max(numPages, props.apiPageCount ?? 0, 1);
  return <ResearchCompanionWorkspaceAppCore {...props} pageCount={pageCount} />;
}

function ResearchCompanionWorkspaceAppCore({
  sourceId,
  sourceName,
  insightId,
  generatedInsightTypes,
  pageCount,
  initialTab,
  initialAssistPanel = null,
  initialConversationId = null,
  onOpenFile,
  onOpenLibrary,
  onUploadFile,
  onNewWorkspace,
  onResetDraftWorkspace,
  workspaceSessionKey,
  onOpenHelp,
  recentWorkspaces,
  onOpenRecentWorkspace,
  onGenerateInsights,
  insightsGenerating,
  insightsGenerateError,
  generatingInsightTypes,
  fileUploading,
  fileUploadProgress,
  fileUploadError,
  resumedFromLibrary = false,
  workspaceTabs,
  activeWorkspaceTabId,
  onSelectWorkspaceTab,
  onCloseWorkspaceTab,
  onNewWorkspaceTab,
  isPreparingNewWorkspaceTab = false,
  onShellViewChange,
  workspaceTypeId,
  onStartWorkspaceWithType,
}: WorkspaceContentProps) {
  const documentTitle = sourceName?.trim() || "Selected document";

  const renderPageThumbnail = useMemo(
    () =>
      sourceId
        ? (page: number, active: boolean) => (
            <span
              className={cn(
                "flex h-[4.75rem] w-[3.25rem] shrink-0 overflow-hidden rounded-md bg-white shadow-sm ring-1",
                active ? "ring-primary/40" : "ring-border/40",
              )}
            >
              <PdfPageCanvas page={page} targetWidth={112} className="h-full w-full" />
            </span>
          )
        : undefined,
    [sourceId],
  );

  const showGeneratingOverlay = Boolean(sourceId && insightsGenerating);
  const appInstanceKey = `${activeWorkspaceTabId}-${workspaceSessionKey}-${workspaceTypeId}`;

  return (
    <>
      <ResearchCompanionApp
        key={appInstanceKey}
        workspaceTypeId={workspaceTypeId}
        onStartWorkspaceWithType={onStartWorkspaceWithType}
        sourceId={sourceId}
        sourceName={sourceName}
        insightId={insightId}
        generatedInsightTypes={generatedInsightTypes}
        pageCount={pageCount}
        initialTab={initialTab}
        initialAssistPanel={initialAssistPanel}
        onOpenDifferentFile={onOpenLibrary}
        onOpenFile={onOpenFile}
        onOpenLibrary={onOpenLibrary}
        onUploadFile={onUploadFile}
        onGenerateInsights={onGenerateInsights}
        insightsGenerating={insightsGenerating}
        insightsGenerateError={insightsGenerateError}
        fileUploading={fileUploading}
        fileUploadProgress={fileUploadProgress}
        fileUploadError={fileUploadError}
        onNewWorkspace={onNewWorkspace}
        onResetDraftWorkspace={onResetDraftWorkspace}
        workspaceSessionKey={workspaceSessionKey}
        onOpenHelp={onOpenHelp}
        recentWorkspaces={recentWorkspaces}
        onOpenRecentWorkspace={onOpenRecentWorkspace}
        formatRecentWorkspaceTime={formatRecentWorkspaceTime}
        resumedFromLibrary={resumedFromLibrary}
        workspaceTabs={workspaceTabs}
        activeWorkspaceTabId={activeWorkspaceTabId}
        onSelectWorkspaceTab={onSelectWorkspaceTab}
        onCloseWorkspaceTab={onCloseWorkspaceTab}
        onNewWorkspaceTab={onNewWorkspaceTab}
        isPreparingNewWorkspaceTab={isPreparingNewWorkspaceTab}
        onShellViewChange={onShellViewChange}
        renderPageThumbnail={renderPageThumbnail}
        renderAssistPanel={({ panel, sourceId: docId, activePage, pageCount, onPageChange, onClose }) => {
          if (panel === "chat" && docId) {
            return (
              <ResearchCompanionWorkspaceChat
                sourceId={docId}
                sourceName={sourceName}
                activePage={activePage}
                initialConversationId={initialConversationId}
                onClose={onClose}
              />
            );
          }

          if (panel === "note" && docId) {
            return (
              <ResearchCompanionWorkspaceNote
                sourceId={docId}
                sourceName={sourceName}
                activePage={activePage}
                pageCount={pageCount}
                onPageChange={onPageChange}
                onClose={onClose}
              />
            );
          }

          return (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b border-border/30 px-3 py-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 items-center gap-2 rounded-lg border border-border/30 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
                >
                  Back to tools
                </button>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center p-4">
                <p className="text-sm text-muted-foreground">
                  {docId ? "This assist panel is coming soon." : "Upload a file to use this tool."}
                </p>
              </div>
            </div>
          );
        }}
        renderDocumentView={
          sourceId
            ? ({ activePage, pageCount: totalPages, onPageChange }) => (
                <ResearchCompanionPdfShell
                  page={activePage}
                  totalPages={totalPages}
                  documentTitle={documentTitle}
                  onPageChange={onPageChange}
                />
              )
            : undefined
        }
      />
      {showGeneratingOverlay && (
        <InsightGeneratingOverlay sourceName={sourceName} insightTypes={generatingInsightTypes} />
      )}
    </>
  );
}

function buildWorkspaceUrl(
  workspaceHref: string,
  sourceId: string,
  sourceName: string,
  insightId?: string | null,
  insightTypes?: ResearchCompanionGeneratableInsightType[] | null,
  workspaceType?: ResearchCompanionWorkspaceTypeId | null,
) {
  const params = new URLSearchParams({
    sourceId,
    sourceName,
    sourceType: "uploaded-file",
  });
  if (workspaceType && workspaceType !== DEFAULT_WORKSPACE_TYPE_ID) {
    params.set("workspaceType", workspaceType);
  }
  if (insightId) {
    params.set("insightId", insightId);
  }
  if (insightTypes?.length) {
    params.set("insightTypes", insightTypes.join(","));
  }
  return `${workspaceHref}?${params.toString()}`;
}

function buildWorkspaceUrlFromTab(workspaceHref: string, tab: WorkspaceTabRecord): string {
  const workspaceType = tab.workspaceType ?? DEFAULT_WORKSPACE_TYPE_ID;
  if (!tab.sourceId) {
    if (workspaceType === DEFAULT_WORKSPACE_TYPE_ID) {
      return workspaceHref;
    }
    const params = new URLSearchParams({ workspaceType });
    return `${workspaceHref}?${params.toString()}`;
  }
  const insightTypes = tab.insightTypesParam
    ? parseResearchCompanionInsightTypesParam(tab.insightTypesParam)
    : null;
  return buildWorkspaceUrl(
    workspaceHref,
    tab.sourceId,
    tab.sourceName?.trim() || "Selected document",
    tab.insightId,
    insightTypes,
    workspaceType,
  );
}

export function ResearchCompanionAppPage({ app }: { app: CatalogApp }) {
  const workspaceHref = getAppWorkspaceHref(app);
  const router = useRouter();
  const { setHeader } = useAppShell();
  const searchParams = useSearchParams();
  const { openFile, openLibrary, picker } = useResearchCompanionSourcePicker();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourceId = searchParams.get("sourceId");
  const sourceName = searchParams.get("sourceName");
  const insightId = searchParams.get("insightId");
  const insightTypesParam = searchParams.get("insightTypes");
  const workspaceTypeParam = parseWorkspaceTypeParam(searchParams.get("workspaceType"));
  const assistPanelParam = searchParams.get("panel");
  const initialConversationId = searchParams.get("chatId");
  const resumedFromLibrary = searchParams.get("origin") === LIBRARY_OPEN_ORIGIN;

  const initialAssistPanel: "chat" | "summary" | "flashcards" | "note" | null =
    assistPanelParam === "chat" ||
    assistPanelParam === "summary" ||
    assistPanelParam === "flashcards" ||
    assistPanelParam === "note"
      ? assistPanelParam
      : null;

  const [apiPageCount, setApiPageCount] = useState<number | undefined>();
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>([]);
  const [insightsGenerating, setInsightsGenerating] = useState(false);
  const [insightsGenerateError, setInsightsGenerateError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [generatingInsightTypes, setGeneratingInsightTypes] = useState<
    ResearchCompanionGeneratableInsightType[]
  >([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState<string | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(true);
  const [workspaceSessionKey, setWorkspaceSessionKey] = useState(0);
  const [isPreparingWorkspaceTab, setIsPreparingWorkspaceTab] = useState(false);
  const [workspaceTypePickerOpen, setWorkspaceTypePickerOpen] = useState(false);

  const initialTabIdRef = useRef(createWorkspaceTabId());
  const initialDraftIdRef = useRef(createWorkspaceDraftId());
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTabRecord[]>(() => [
    {
      id: initialTabIdRef.current,
      title: sourceName?.trim() || defaultWorkspaceTabTitle(1, workspaceTypeParam),
      workspaceType: workspaceTypeParam,
      sourceId,
      sourceName,
      insightId,
      insightTypesParam: insightTypesParam,
      draftId: initialDraftIdRef.current,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState(initialTabIdRef.current);
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  const [preferredView, setPreferredView] = useState<ResearchCompanionView>(
    insightId || sourceId || initialAssistPanel ? "workspace" : "home",
  );

  const searchParamsKey = searchParams.toString();

  const activeTab = useMemo(() => {
    const tab = workspaceTabs.find((item) => item.id === activeTabId) ?? workspaceTabs[0];
    if (!tab) return undefined;
    return {
      ...tab,
      workspaceType:
        tab.workspaceType ??
        parseWorkspaceTypeParam(searchParams.get("workspaceType")),
    };
  }, [activeTabId, searchParamsKey, workspaceTabs]);

  const resolvedSourceId = activeTab?.sourceId ?? null;
  const resolvedSourceName = activeTab?.sourceName ?? null;
  const resolvedInsightId = activeTab?.insightId ?? null;
  const resolvedInsightTypesParam = activeTab?.insightTypesParam ?? null;
  const resolvedWorkspaceTypeId = activeTab?.workspaceType ?? DEFAULT_WORKSPACE_TYPE_ID;

  const resolvedGeneratedInsightTypes = useMemo(
    () =>
      resolvedInsightId
        ? normalizeResearchCompanionInsightTypes(
            parseResearchCompanionInsightTypesParam(resolvedInsightTypesParam),
          )
        : [],
    [resolvedInsightId, resolvedInsightTypesParam],
  );

  const resolvedMissingInsightTypes = useMemo(
    () => getMissingInsightTypes(resolvedGeneratedInsightTypes),
    [resolvedGeneratedInsightTypes],
  );

  useEffect(() => {
    setIsOpening(true);
    const timer = setTimeout(() => setIsOpening(false), WORKSPACE_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const syncActiveTabUrl = useCallback(
    (tab: WorkspaceTabRecord) => {
      router.replace(buildWorkspaceUrlFromTab(workspaceHref, tab));
    },
    [router, workspaceHref],
  );

  const applyWorkspaceTab = useCallback(
    async (tab: WorkspaceTabRecord) => {
      setPreferredView("workspace");
      setActiveTabId(tab.id);
      setWorkspaceSessionKey((key) => key + 1);
      syncActiveTabUrl(tab);
    },
    [syncActiveTabUrl],
  );

  const handleSelectWorkspaceTab = useCallback(
    (tabId: string) => {
      const tab = workspaceTabs.find((item) => item.id === tabId);
      if (!tab || tabId === activeTabId) return;
      void applyWorkspaceTab(tab);
    },
    [activeTabId, applyWorkspaceTab, workspaceTabs],
  );

  const workspaceTabsRef = useRef(workspaceTabs);
  workspaceTabsRef.current = workspaceTabs;

  // Sync URL → active tab when the address bar gains a document (upload, library, etc.).
  // Never apply an empty URL onto a tab — that was overwriting new blank tabs with the
  // previous tab's sourceId while router.replace was still in flight.
  useEffect(() => {
    const paramsSourceId = searchParams.get("sourceId");
    const paramsInsightId = searchParams.get("insightId");
    const paramsWorkspaceType = searchParams.get("workspaceType");
    if (!paramsSourceId && !paramsInsightId && !paramsWorkspaceType) return;

    const paramsSourceName = searchParams.get("sourceName");
    const paramsInsightTypes = searchParams.get("insightTypes");
    const parsedWorkspaceType = parseWorkspaceTypeParam(paramsWorkspaceType);
    const tabId = activeTabIdRef.current;

    const existing = paramsSourceId
      ? workspaceTabsRef.current.find((tab) => tab.sourceId === paramsSourceId)
      : undefined;
    if (existing && existing.id !== tabId) {
      void applyWorkspaceTab(existing);
      return;
    }

    setWorkspaceTabs((current) =>
      current.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              workspaceType: paramsWorkspaceType ? parsedWorkspaceType : tab.workspaceType,
              sourceId: paramsSourceId,
              sourceName: paramsSourceName,
              insightId: paramsInsightId,
              insightTypesParam: paramsInsightTypes,
              title: paramsSourceName?.trim() || tab.title,
            }
          : tab,
      ),
    );
    setPreferredView("workspace");
  }, [applyWorkspaceTab, searchParamsKey]);

  const handleCreateWorkspaceTab = useCallback(
    async (workspaceTypeId: ResearchCompanionWorkspaceTypeId) => {
      if (isPreparingWorkspaceTab) return;
      setWorkspaceTypePickerOpen(false);
      setPreferredView("workspace");
      setIsPreparingWorkspaceTab(true);
      try {
        const newTab: WorkspaceTabRecord = {
          id: createWorkspaceTabId(),
          title: defaultWorkspaceTabTitle(workspaceTabs.length + 1, workspaceTypeId),
          workspaceType: workspaceTypeId,
          sourceId: null,
          sourceName: null,
          insightId: null,
          insightTypesParam: null,
          draftId: createWorkspaceDraftId(),
        };
        setWorkspaceTabs((current) => [...current, newTab]);
        await applyWorkspaceTab(newTab);
      } finally {
        setIsPreparingWorkspaceTab(false);
      }
    },
    [applyWorkspaceTab, isPreparingWorkspaceTab, workspaceTabs.length],
  );

  const handleRequestNewWorkspaceTab = useCallback(() => {
    if (isPreparingWorkspaceTab) return;
    setWorkspaceTypePickerOpen(true);
  }, [isPreparingWorkspaceTab]);

  const handleCloseWorkspaceTab = useCallback(
    (tabId: string) => {
      if (workspaceTabs.length === 1) {
        const resetTab: WorkspaceTabRecord = {
          id: tabId,
          title: defaultWorkspaceTabTitle(1, DEFAULT_WORKSPACE_TYPE_ID),
          workspaceType: DEFAULT_WORKSPACE_TYPE_ID,
          sourceId: null,
          sourceName: null,
          insightId: null,
          insightTypesParam: null,
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
    [activeTabId, applyWorkspaceTab, workspaceTabs],
  );
  const canGenerateInsights =
    resolvedWorkspaceTypeId === "academic-research" &&
    Boolean(
      resolvedSourceId && (!resolvedInsightId || resolvedMissingInsightTypes.length > 0),
    );

  const handleResetDraftWorkspace = useCallback(async () => {
    setWorkspaceTabs((current) =>
      current.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              sourceId: null,
              sourceName: null,
              insightId: null,
              insightTypesParam: null,
              title: defaultWorkspaceTabTitle(
                current.length,
                tab.workspaceType ?? DEFAULT_WORKSPACE_TYPE_ID,
              ),
              draftId: createWorkspaceDraftId(),
            }
          : tab,
      ),
    );
    setWorkspaceSessionKey((key) => key + 1);
    setPreferredView("workspace");
    router.replace(workspaceHref);
  }, [activeTabId, router, workspaceHref, workspaceTabs.length]);

  const handleNewWorkspace = useCallback(() => {
    handleRequestNewWorkspaceTab();
  }, [handleRequestNewWorkspaceTab]);

  const handleOpenHelp = useCallback(() => {
    router.push(getAppHelpHref(app));
  }, [app, router]);

  const handleOpenRecentWorkspace = useCallback(
    (workspace: RecentWorkspace) => {
      const existing = workspaceTabs.find((tab) => tab.sourceId === workspace.sourceId);
      if (existing) {
        handleSelectWorkspaceTab(existing.id);
        return;
      }

      const newTab: WorkspaceTabRecord = {
        id: createWorkspaceTabId(),
        title: workspace.title?.trim() || workspace.sourceName?.trim() || "Document",
        workspaceType: DEFAULT_WORKSPACE_TYPE_ID,
        sourceId: workspace.sourceId,
        sourceName: workspace.sourceName,
        insightId: workspace.insightId ?? null,
        insightTypesParam: workspace.insightTypes ?? null,
        draftId: createWorkspaceDraftId(),
      };
      setWorkspaceTabs((current) => [...current, newTab]);
      void applyWorkspaceTab(newTab);
    },
    [applyWorkspaceTab, handleSelectWorkspaceTab, workspaceTabs],
  );

  const triggerDirectUpload = useCallback(() => {
    if (fileUploading) return;
    setFileUploadError(null);
    fileInputRef.current?.click();
  }, [fileUploading]);

  const handleDirectUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      setFileUploading(true);
      setFileUploadProgress("Checking document…");
      setFileUploadError(null);

      try {
        const source = await uploadPdfAndWait(file, {
          onProgress: (message) => setFileUploadProgress(message),
        });
        setPreferredView("workspace");
        setWorkspaceTabs((current) =>
          current.map((tab) =>
            tab.id === activeTabId
              ? {
                  ...tab,
                  sourceId: source.id,
                  sourceName: source.name,
                  title: source.name.trim() || tab.title,
                  insightId: null,
                  insightTypesParam: null,
                }
              : tab,
          ),
        );
        router.push(
          buildWorkspaceUrl(
            workspaceHref,
            source.id,
            source.name,
            null,
            null,
            resolvedWorkspaceTypeId,
          ),
        );
      } catch (err) {
        if (err instanceof PdfUploadCancelledError) return;
        setFileUploadError(getApiErrorMessage(err, "Upload failed"));
      } finally {
        setFileUploading(false);
        setFileUploadProgress(null);
      }
    },
    [activeTabId, resolvedWorkspaceTypeId, router, workspaceHref],
  );

  const handleGenerateInsights = useCallback(
    async (insightTypes: ResearchCompanionGeneratableInsightType[]) => {
      if (!resolvedSourceId || insightsGenerating || insightTypes.length === 0) return;

      setGeneratingInsightTypes(insightTypes);
      setInsightsGenerating(true);
      setInsightsGenerateError(null);

      try {
        const generated = await publicApi.generateUploadInsights(resolvedSourceId, insightTypes);
        const mergedTypes = resolvedInsightId
          ? mergeInsightTypes(resolvedGeneratedInsightTypes, insightTypes)
          : insightTypes;
        const mergedTypesParam = mergedTypes.join(",");

        setWorkspaceTabs((current) =>
          current.map((tab) =>
            tab.id === activeTabId
              ? {
                  ...tab,
                  insightId: generated.id,
                  insightTypesParam: mergedTypesParam,
                }
              : tab,
          ),
        );
        setPreferredView("workspace");

        router.replace(
          buildWorkspaceUrl(
            workspaceHref,
            resolvedSourceId,
            resolvedSourceName || "Selected document",
            generated.id,
            mergedTypes,
            resolvedWorkspaceTypeId,
          ),
        );
      } catch (err) {
        setInsightsGenerateError(getApiErrorMessage(err, "Failed to generate insights"));
      } finally {
        setInsightsGenerating(false);
      }
    },
    [
      activeTabId,
      insightsGenerating,
      resolvedGeneratedInsightTypes,
      resolvedInsightId,
      resolvedSourceId,
      resolvedSourceName,
      resolvedWorkspaceTypeId,
      router,
      workspaceHref,
    ],
  );

  const handleOpenGenerateModal = useCallback(() => {
    if (!canGenerateInsights || insightsGenerating) return;
    setConfirmModalOpen(true);
  }, [canGenerateInsights, insightsGenerating]);

  const handleConfirmGenerate = useCallback(
    async (insightTypes: ResearchCompanionGeneratableInsightType[]) => {
      setConfirmModalOpen(false);
      await handleGenerateInsights(insightTypes);
    },
    [handleGenerateInsights],
  );

  useEffect(() => {
    if (!resolvedSourceId || resolvedInsightId) return;

    let cancelled = false;
    void (async () => {
      try {
        const library = await publicApi.library();
        if (cancelled) return;
        const existing = findExistingInsightForDocument(
          resolvedSourceId,
          resolvedSourceName,
          library,
        );
        if (existing) {
          router.replace(
            buildWorkspaceUrl(
              workspaceHref,
              resolvedSourceId,
              resolvedSourceName || "Selected document",
              existing.id,
              null,
              resolvedWorkspaceTypeId,
            ),
          );
        }
      } catch {
        // Ignore lookup failures — user can still generate manually.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    resolvedInsightId,
    resolvedSourceId,
    resolvedSourceName,
    resolvedWorkspaceTypeId,
    router,
    workspaceHref,
  ]);

  useEffect(() => {
    setRecentWorkspaces(readRecentWorkspaces());
  }, []);

  useEffect(() => {
    if (!resolvedSourceId) return;
    setRecentWorkspaces(
      recordRecentWorkspace({
        sourceId: resolvedSourceId,
        sourceName: resolvedSourceName,
        insightId: resolvedInsightId,
        insightTypes: resolvedInsightTypesParam,
      }),
    );
  }, [resolvedInsightId, resolvedInsightTypesParam, resolvedSourceId, resolvedSourceName]);

  useEffect(() => {
    const typeLabel = getWorkspaceTypeDefinition(resolvedWorkspaceTypeId).label;
    setHeader({
      title: app.name,
      subtitle: resolvedInsightId
        ? `${typeLabel} · ${resolvedSourceName?.trim() || "Workspace"}`
        : resolvedSourceId
          ? `${typeLabel} · ${resolvedSourceName?.trim() || "Document attached"}`
          : typeLabel,
    });
    return () => setHeader(null);
  }, [
    app.name,
    resolvedInsightId,
    resolvedSourceId,
    resolvedSourceName,
    resolvedWorkspaceTypeId,
    setHeader,
  ]);

  useEffect(() => {
    if (!resolvedSourceId) {
      setApiPageCount(undefined);
      return;
    }

    publicApi
      .getFile(resolvedSourceId)
      .then((doc) => setApiPageCount(doc.page_count > 0 ? doc.page_count : 1))
      .catch(() => setApiPageCount(undefined));
  }, [resolvedSourceId]);

  const tabProps = {
    workspaceTabs,
    activeWorkspaceTabId: activeTabId,
    onSelectWorkspaceTab: handleSelectWorkspaceTab,
    onCloseWorkspaceTab: handleCloseWorkspaceTab,
        onNewWorkspaceTab: handleRequestNewWorkspaceTab,
        onStartWorkspaceWithType: (typeId) => void handleCreateWorkspaceTab(typeId),
        workspaceTypeId: resolvedWorkspaceTypeId,
    isPreparingNewWorkspaceTab: isPreparingWorkspaceTab,
  };

  const sharedProps = {
    sourceId: resolvedSourceId,
    sourceName: resolvedSourceName,
    insightId: resolvedInsightId,
    generatedInsightTypes: resolvedInsightId ? resolvedGeneratedInsightTypes : undefined,
    initialTab: preferredView,
    apiPageCount,
    initialAssistPanel,
    initialConversationId,
    onOpenFile: openFile,
    onOpenLibrary: openLibrary,
    onUploadFile: triggerDirectUpload,
    onNewWorkspace: handleNewWorkspace,
    onResetDraftWorkspace: handleResetDraftWorkspace,
    workspaceSessionKey,
    onOpenHelp: handleOpenHelp,
    recentWorkspaces,
    onOpenRecentWorkspace: handleOpenRecentWorkspace,
    onGenerateInsights: canGenerateInsights ? handleOpenGenerateModal : undefined,
    insightsGenerating,
    insightsGenerateError,
    generatingInsightTypes,
    fileUploading,
    fileUploadProgress,
    fileUploadError,
    resumedFromLibrary,
    onShellViewChange: setPreferredView,
    ...tabProps,
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => void handleDirectUpload(event)}
      />
      {isOpening ? (
        <ResearchCompanionWorkspaceShimmer />
      ) : (
        <ResearchCompanionWorkspaceApp {...sharedProps} pageCount={0} />
      )}
      {picker}
      <WorkspaceTypePickerModal
        open={workspaceTypePickerOpen}
        onClose={() => setWorkspaceTypePickerOpen(false)}
        onConfirm={(typeId) => void handleCreateWorkspaceTab(typeId)}
      />
      <InsightGenerationConfirmModal
        open={confirmModalOpen}
        sourceName={resolvedSourceName}
        confirming={insightsGenerating}
        mode={resolvedInsightId ? "additional" : "initial"}
        lockedTypes={resolvedInsightId ? resolvedGeneratedInsightTypes : undefined}
        initialSelection={resolvedInsightId ? resolvedMissingInsightTypes : undefined}
        onClose={() => {
          if (!insightsGenerating) setConfirmModalOpen(false);
        }}
        onConfirm={(types) => void handleConfirmGenerate(types)}
      />
    </>
  );
}
