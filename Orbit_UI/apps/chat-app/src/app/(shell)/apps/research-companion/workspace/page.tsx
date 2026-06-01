"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ResearchCompanionApp } from "@orbit/clovai-apps";
import { useResearchCompanionSourcePicker } from "@/components/apps/research-companion-source-picker";
import { ResearchCompanionWorkspaceChat } from "@/components/apps/research-companion-workspace-chat";
import { ResearchCompanionWorkspaceNote } from "@/components/apps/research-companion-workspace-note";
import { PdfDocumentProvider, usePdfDocument } from "@/components/rag/pdf-document-provider";
import { PdfPageCanvas, ResearchCompanionPdfShell } from "@/components/rag/pdf-page-canvas";
import { useAppShell } from "@/components/layout/app-shell-context";
import { publicApi } from "@/lib/orbit-api";
import { cn } from "@/lib/utils";

function ResearchCompanionWorkspaceContent({
  sourceId,
  sourceName,
  insightId,
  apiPageCount,
  onOpenFile,
}: {
  sourceId: string;
  sourceName: string | null;
  insightId: string | null;
  apiPageCount?: number;
  onOpenFile: () => void;
}) {
  const router = useRouter();
  const { numPages } = usePdfDocument();
  const pageCount = Math.max(numPages, apiPageCount ?? 0, 1);

  const documentTitle = sourceName?.trim() || "Selected document";

  const renderPageThumbnail = useMemo(
    () => (page: number, active: boolean) => (
      <span
        className={cn(
          "flex h-[4.75rem] w-[3.25rem] shrink-0 overflow-hidden rounded-md bg-white shadow-sm ring-1",
          active ? "ring-primary/40" : "ring-border/40",
        )}
      >
        <PdfPageCanvas page={page} targetWidth={112} className="h-full w-full" />
      </span>
    ),
    [],
  );

  return (
    <ResearchCompanionApp
      sourceId={sourceId}
      sourceName={sourceName}
      insightId={insightId}
      pageCount={pageCount}
      initialTab="workspace"
      onOpenDifferentFile={() => router.push("/?section=library")}
      onOpenFile={onOpenFile}
      renderPageThumbnail={renderPageThumbnail}
      renderAssistPanel={({ panel, sourceId: docId, activePage, pageCount, onPageChange, onClose }) => {
        if (panel === "chat" && docId) {
          return (
            <ResearchCompanionWorkspaceChat
              sourceId={docId}
              sourceName={sourceName}
              activePage={activePage}
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
              <p className="text-sm text-muted-foreground">This assist panel is coming soon.</p>
            </div>
          </div>
        );
      }}
      renderDocumentView={({
        activePage,
        pageCount: totalPages,
        onPageChange,
        renderToolsPanel,
      }) => (
        <ResearchCompanionPdfShell
          page={activePage}
          totalPages={totalPages}
          documentTitle={documentTitle}
          onPageChange={onPageChange}
          toolsPanel={renderToolsPanel()}
        />
      )}
    />
  );
}

export default function ResearchCompanionWorkspacePage() {
  const router = useRouter();
  const { setHeader } = useAppShell();
  const searchParams = useSearchParams();
  const { openFile, picker } = useResearchCompanionSourcePicker();

  const sourceId = searchParams.get("sourceId");
  const sourceName = searchParams.get("sourceName");
  const insightId = searchParams.get("insightId");
  const [apiPageCount, setApiPageCount] = useState<number | undefined>();

  useEffect(() => {
    setHeader({
      title: "Research Companion",
      subtitle: sourceName || "Study workspace",
    });
    return () => setHeader(null);
  }, [setHeader, sourceName]);

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

  if (sourceId) {
    return (
      <>
        <PdfDocumentProvider documentId={sourceId}>
          <ResearchCompanionWorkspaceContent
            sourceId={sourceId}
            sourceName={sourceName}
            insightId={insightId}
            apiPageCount={apiPageCount}
            onOpenFile={openFile}
          />
        </PdfDocumentProvider>
        {picker}
      </>
    );
  }

  return (
    <>
      <ResearchCompanionApp
        sourceName={sourceName}
        insightId={insightId}
        initialTab="workspace"
        onOpenDifferentFile={() => router.push("/?section=library")}
        onOpenFile={openFile}
      />
      {picker}
    </>
  );
}
