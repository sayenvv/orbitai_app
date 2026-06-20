"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Code2, FileText, Loader2, Printer, X } from "lucide-react";

import { PlanHtmlViewerLayout, PlanPdfPagesLayout } from "@/components/plan/plan-html-page-preview";
import { studioButtonSecondary, studioRadius } from "@/components/studio/studio-ui";
import type { PlanDeliverableContent } from "@/lib/plan-deliverable-content";
import type { PlanHtmlPageStylesMap, PlanHtmlSidebarStyle } from "@/lib/plan-html-page-editor";
import {
  DEFAULT_PLAN_PDF_PAGE_FORMAT,
  PLAN_PDF_PAGE_FORMATS,
  type PlanPdfPageFormatId,
} from "@/lib/plan-pdf-page-format";
import type { SynopsisSection } from "@/lib/plan-synopsis-catalog";
import { cn } from "@/lib/utils";

export type PlanDocumentViewerTab = "html" | "pdf";

const VIEWER_TAB_LABELS: Record<PlanDocumentViewerTab, string> = {
  html: "HTML View",
  pdf: "PDF Viewer",
};

export function PlanDocumentViewerSheet({
  open,
  tabs,
  activeTab,
  projectTitle,
  sections,
  contentByDeliverableId,
  projectPrompt,
  pageStyles,
  sidebarStyle,
  previewHtml,
  loading,
  onActiveTabChange,
  onCloseTab,
  onClose,
  onPrint,
}: {
  open: boolean;
  tabs: PlanDocumentViewerTab[];
  activeTab: PlanDocumentViewerTab | null;
  projectTitle: string;
  sections: SynopsisSection[];
  contentByDeliverableId: Record<string, PlanDeliverableContent>;
  projectPrompt: string;
  pageStyles: PlanHtmlPageStylesMap;
  sidebarStyle: PlanHtmlSidebarStyle;
  previewHtml: string | null;
  loading: boolean;
  onActiveTabChange: (tab: PlanDocumentViewerTab) => void;
  onCloseTab: (tab: PlanDocumentViewerTab) => void;
  onClose: () => void;
  onPrint: (pageFormat: PlanPdfPageFormatId) => void | Promise<void>;
}) {
  const resolvedTab = activeTab && tabs.includes(activeTab) ? activeTab : tabs[0] ?? null;
  const [pageFormat, setPageFormat] = useState<PlanPdfPageFormatId>(DEFAULT_PLAN_PDF_PAGE_FORMAT);
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await onPrint(pageFormat);
    } finally {
      setPrinting(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="plan-document-viewer-sheet fixed inset-0 z-[118] flex flex-col bg-background/95 backdrop-blur-sm">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
            {resolvedTab === "pdf" ? <FileText className="size-4" /> : <Code2 className="size-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Document viewer
            </p>
            <h2 className="truncate text-sm font-semibold text-foreground">
              {resolvedTab ? VIEWER_TAB_LABELS[resolvedTab] : projectTitle}
            </h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {resolvedTab === "pdf" ? (
            <>
              <label className="flex items-center gap-2">
                <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:inline">
                  Page size
                </span>
                <select
                  value={pageFormat}
                  onChange={(event) => setPageFormat(event.target.value as PlanPdfPageFormatId)}
                  className={cn(
                    studioRadius,
                    "max-w-[11rem] border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/40 sm:max-w-none",
                  )}
                  aria-label="Page size"
                >
                  {PLAN_PDF_PAGE_FORMATS.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.label} ({format.widthMm} × {format.heightMm} mm)
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void handlePrint()}
                disabled={loading || printing}
                className={cn(
                  studioButtonSecondary("inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"),
                  (loading || printing) && "opacity-50",
                )}
              >
                {printing ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
                Print / Save PDF
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close document viewer"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="ide-tab-bar flex shrink-0 items-end gap-1 overflow-x-auto border-b border-border/60 px-2 py-1.5 [scrollbar-width:thin]">
        {tabs.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Use File → Open to choose a view.
          </p>
        ) : (
          tabs.map((tab) => {
            const selected = tab === resolvedTab;
            return (
              <div
                key={tab}
                className={cn(
                  "ide-tab group inline-flex max-w-[14rem] shrink-0 items-center gap-1 rounded-t-lg border border-b-0 px-2.5 py-1.5 text-[12px]",
                  selected
                    ? "ide-tab-active border-border/70 bg-background text-foreground"
                    : "border-transparent bg-muted/20 text-muted-foreground hover:bg-muted/35 hover:text-foreground",
                )}
              >
                <button
                  type="button"
                  onClick={() => onActiveTabChange(tab)}
                  className="min-w-0 truncate text-left font-medium"
                >
                  {VIEWER_TAB_LABELS[tab]}
                </button>
                <button
                  type="button"
                  onClick={() => onCloseTab(tab)}
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm opacity-60 transition-opacity hover:bg-muted hover:opacity-100"
                  aria-label={`Close ${VIEWER_TAB_LABELS[tab]}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Preparing document…
          </div>
        ) : resolvedTab === "html" ? (
          <PlanHtmlViewerLayout
            projectTitle={projectTitle}
            sections={sections}
            contentByDeliverableId={contentByDeliverableId}
            projectPrompt={projectPrompt}
            pageStyles={pageStyles}
            sidebarStyle={sidebarStyle}
            variant="screen"
          />
        ) : resolvedTab === "pdf" ? (
          <PlanPdfPagesLayout
            sections={sections}
            contentByDeliverableId={contentByDeliverableId}
            projectPrompt={projectPrompt}
            pageStyles={pageStyles}
            pageFormat={pageFormat}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Choose <span className="mx-1 font-medium text-foreground">HTML View</span> or{" "}
            <span className="mx-1 font-medium text-foreground">PDF Viewer</span> from File → Open.
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
