"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ResearchCompanionApp,
  type CatalogApp,
  type RecentWorkspace,
  type ResearchCompanionGeneratableInsightType,
  type ResearchCompanionView,
  getAppWorkspaceHref,
  getAppHelpHref,
  getMissingInsightTypes,
  mergeInsightTypes,
  normalizeResearchCompanionInsightTypes,
  parseResearchCompanionInsightTypesParam,
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
};

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

  return (
    <>
      <ResearchCompanionApp
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
            ? ({ activePage, pageCount: totalPages, onPageChange, renderToolsPanel }) => (
                <ResearchCompanionPdfShell
                  page={activePage}
                  totalPages={totalPages}
                  documentTitle={documentTitle}
                  onPageChange={onPageChange}
                  toolsPanel={renderToolsPanel()}
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

function ResearchCompanionWorkspaceWithDocument({
  sourceId,
  sourceName,
  insightId,
  generatedInsightTypes,
  apiPageCount,
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
}: {
  sourceId: string;
  sourceName: string | null;
  insightId: string | null;
  generatedInsightTypes?: ResearchCompanionGeneratableInsightType[];
  apiPageCount?: number;
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
}) {
  const { numPages } = usePdfDocument();
  const pageCount = Math.max(numPages, apiPageCount ?? 0, 1);

  return (
    <ResearchCompanionWorkspaceApp
      sourceId={sourceId}
      sourceName={sourceName}
      insightId={insightId}
      generatedInsightTypes={generatedInsightTypes}
      pageCount={pageCount}
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
    />
  );
}

function buildWorkspaceUrl(
  workspaceHref: string,
  sourceId: string,
  sourceName: string,
  insightId?: string | null,
  insightTypes?: ResearchCompanionGeneratableInsightType[] | null,
) {
  const params = new URLSearchParams({
    sourceId,
    sourceName,
    sourceType: "uploaded-file",
  });
  if (insightId) {
    params.set("insightId", insightId);
  }
  if (insightTypes?.length) {
    params.set("insightTypes", insightTypes.join(","));
  }
  return `${workspaceHref}?${params.toString()}`;
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

  const generatedInsightTypes = useMemo(
    () =>
      insightId
        ? normalizeResearchCompanionInsightTypes(parseResearchCompanionInsightTypesParam(insightTypesParam))
        : [],
    [insightId, insightTypesParam],
  );

  const missingInsightTypes = useMemo(
    () => getMissingInsightTypes(generatedInsightTypes),
    [generatedInsightTypes],
  );

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

  useEffect(() => {
    setIsOpening(true);
    const timer = setTimeout(() => setIsOpening(false), WORKSPACE_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const initialTab: ResearchCompanionView =
    insightId || (sourceId && initialAssistPanel) ? "workspace" : "home";
  const canGenerateInsights = Boolean(
    sourceId && (!insightId || missingInsightTypes.length > 0),
  );

  const handleResetDraftWorkspace = useCallback(async () => {
    setWorkspaceSessionKey((key) => key + 1);
    router.replace(workspaceHref);
  }, [router, workspaceHref]);

  const handleNewWorkspace = useCallback(() => {
    router.replace(workspaceHref);
  }, [router, workspaceHref]);

  const handleOpenHelp = useCallback(() => {
    router.push(getAppHelpHref(app));
  }, [app, router]);

  const handleOpenRecentWorkspace = useCallback(
    (workspace: RecentWorkspace) => {
      router.push(buildRecentWorkspaceHref(workspace));
    },
    [router],
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
        router.push(buildWorkspaceUrl(workspaceHref, source.id, source.name));
      } catch (err) {
        if (err instanceof PdfUploadCancelledError) return;
        setFileUploadError(getApiErrorMessage(err, "Upload failed"));
      } finally {
        setFileUploading(false);
        setFileUploadProgress(null);
      }
    },
    [router, workspaceHref],
  );

  const handleGenerateInsights = useCallback(
    async (insightTypes: ResearchCompanionGeneratableInsightType[]) => {
      if (!sourceId || insightsGenerating || insightTypes.length === 0) return;

      setGeneratingInsightTypes(insightTypes);
      setInsightsGenerating(true);
      setInsightsGenerateError(null);

      try {
        const generated = await publicApi.generateUploadInsights(sourceId, insightTypes);
        const mergedTypes = insightId
          ? mergeInsightTypes(generatedInsightTypes, insightTypes)
          : insightTypes;

        router.replace(
          buildWorkspaceUrl(
            workspaceHref,
            sourceId,
            sourceName || "Selected document",
            generated.id,
            mergedTypes,
          ),
        );
      } catch (err) {
        setInsightsGenerateError(getApiErrorMessage(err, "Failed to generate insights"));
      } finally {
        setInsightsGenerating(false);
      }
    },
    [generatedInsightTypes, insightId, insightsGenerating, router, sourceId, sourceName, workspaceHref],
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
    if (!sourceId || insightId) return;

    let cancelled = false;
    void (async () => {
      try {
        const library = await publicApi.library();
        if (cancelled) return;
        const existing = findExistingInsightForDocument(sourceId, sourceName, library);
        if (existing) {
          router.replace(buildWorkspaceUrl(workspaceHref, sourceId, sourceName || "Selected document", existing.id));
        }
      } catch {
        // Ignore lookup failures — user can still generate manually.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceId, insightId, sourceName, router, workspaceHref]);

  useEffect(() => {
    setRecentWorkspaces(readRecentWorkspaces());
  }, []);

  useEffect(() => {
    if (!sourceId) return;
    setRecentWorkspaces(
      recordRecentWorkspace({
        sourceId,
        sourceName,
        insightId,
        insightTypes: insightTypesParam,
      }),
    );
  }, [sourceId, sourceName, insightId, insightTypesParam ?? ""]);

  useEffect(() => {
    setHeader({
      title: "Research Companion",
      subtitle: insightId
        ? sourceName?.trim() || "Workspace"
        : sourceId
          ? sourceName?.trim() || "Document attached"
          : "New workspace",
    });
    return () => setHeader(null);
  }, [setHeader, sourceName, sourceId, insightId]);

  useEffect(() => {
    if (!sourceId) {
      setApiPageCount(undefined);
      return;
    }

    publicApi
      .getFile(sourceId)
      .then((doc) => setApiPageCount(doc.page_count > 0 ? doc.page_count : 1))
      .catch(() => setApiPageCount(undefined));
  }, [sourceId]);

  const sharedProps = {
    sourceName,
    insightId,
    generatedInsightTypes: insightId ? generatedInsightTypes : undefined,
    initialTab,
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
      ) : sourceId ? (
        <PdfDocumentProvider documentId={sourceId}>
          <ResearchCompanionWorkspaceWithDocument
            sourceId={sourceId}
            apiPageCount={apiPageCount}
            {...sharedProps}
          />
        </PdfDocumentProvider>
      ) : (
        <ResearchCompanionWorkspaceApp sourceId={null} pageCount={0} {...sharedProps} />
      )}
      {picker}
      <InsightGenerationConfirmModal
        open={confirmModalOpen}
        sourceName={sourceName}
        confirming={insightsGenerating}
        mode={insightId ? "additional" : "initial"}
        lockedTypes={insightId ? generatedInsightTypes : undefined}
        initialSelection={insightId ? missingInsightTypes : undefined}
        onClose={() => {
          if (!insightsGenerating) setConfirmModalOpen(false);
        }}
        onConfirm={(types) => void handleConfirmGenerate(types)}
      />
    </>
  );
}
