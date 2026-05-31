"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  FileText,
  GraduationCap,
  Layers,
  Lightbulb,
  MessageCircleQuestion,
  Sparkles,
} from "lucide-react";
import { ExpandableStudyPanel } from "@/components/insights/expandable-study-panel";
import { InsightDoubtChat } from "@/components/insights/insight-doubt-chat";
import { InsightShareMenu } from "@/components/insights/insight-share-menu";
import { InsightStudyHub } from "@/components/insights/insight-study-hub";
import {
  StudyMetaPill,
  StudyPageBackdrop,
  StudySectionLabel,
} from "@/components/insights/insights-shell";
import { PdfViewerPanel } from "@/components/insights/pdf-viewer-panel";
import { useAppShell } from "@/components/layout/app-shell-context";
import { formatRelativeDate } from "@/lib/format-library";
import { insightSourceLabel, resolveInsightSourceDocumentId } from "@/lib/insights";
import { buildStudyMaterials, studyTabCounts } from "@/lib/study-materials";
import type { LibraryGeneratedFile, LibraryUpload } from "@/hooks/use-library";
import { cn } from "@/lib/utils";

type ExpandedPanel = "pdf" | "insights" | "chat" | null;

const SCROLL_COMPACT_THRESHOLD = 64;

/** Shared row height when PDF + insights sit side by side (30 / 70). */
const PANEL_ROW_H = "min-h-[68vh] lg:min-h-[72vh]";

const STUDY_STEPS = [
  { label: "Read", icon: FileText },
  { label: "Summary", icon: BookOpen },
  { label: "Themes", icon: Lightbulb },
  { label: "Self-quiz", icon: Layers },
  { label: "Clear doubts", icon: MessageCircleQuestion },
] as const;

type InsightDetailViewProps = {
  insight: LibraryGeneratedFile;
  uploads: LibraryUpload[];
};

export function InsightDetailView({ insight, uploads }: InsightDetailViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setHeader } = useAppShell();
  const [compactHeader, setCompactHeader] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);

  const sourceDocumentId = resolveInsightSourceDocumentId(insight, uploads);
  const sourceName = insightSourceLabel(insight, uploads);
  const materials = useMemo(() => buildStudyMaterials(insight.preview), [insight.preview]);
  const counts = useMemo(() => studyTabCounts(materials), [materials]);
  const totalItems = counts.flashcards + counts.qa + counts.vocabulary;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      setCompactHeader(el.scrollTop > SCROLL_COMPACT_THRESHOLD);
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (compactHeader) {
      setHeader(null);
      return;
    }
    setHeader({
      title: "AI Insights",
      subtitle: "Document & analysis",
    });
    return () => setHeader(null);
  }, [compactHeader, setHeader]);

  return (
    <StudyPageBackdrop scrollable scrollRef={scrollRef}>
      {/* Compact bar — visible while scrolled for wayfinding */}
      <div
        className={cn(
          "sticky top-0 z-30 border-b border-border/40 bg-background/90 backdrop-blur-md transition-all duration-300 ease-out",
          compactHeader
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-[100rem] items-center gap-3 px-4 py-2.5 md:px-8">
          <Link
            href="/insights"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/45 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI Board</span>
          </Link>
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
            {insight.title}
          </p>
          <InsightShareMenu
            variant="icon"
            insightId={insight.id}
            title={insight.title}
            preview={insight.preview}
            sourceName={sourceName}
          />
        </div>
      </div>

      {/* Full header — collapses on scroll so study panels get focus */}
      <header
        className={cn(
          "shrink-0 overflow-hidden border-b border-border/35 bg-background/40 backdrop-blur-md transition-all duration-300 ease-out",
          compactHeader
            ? "max-h-0 border-transparent opacity-0"
            : "max-h-[520px] opacity-100",
        )}
      >
        <div className="mx-auto max-w-[100rem] px-5 py-5 md:px-10 md:py-6">
          <Link
            href="/insights"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            AI Board
          </Link>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-2.5">
              <StudySectionLabel>Study view</StudySectionLabel>
              <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl md:leading-tight">
                {insight.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <StudyMetaPill accent>
                  <Sparkles className="h-3 w-3" />
                  {insight.type}
                </StudyMetaPill>
                {sourceName && (
                  <StudyMetaPill>
                    <FileText className="h-3 w-3" />
                    {sourceName}
                  </StudyMetaPill>
                )}
                <StudyMetaPill>{formatRelativeDate(insight.createdAt)}</StudyMetaPill>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-start lg:flex-col lg:items-end">
              <InsightShareMenu
                insightId={insight.id}
                title={insight.title}
                preview={insight.preview}
                sourceName={sourceName}
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 lg:gap-2.5 xl:grid-cols-4">
                <StatTile label="Insights" value={counts.insights} />
                <StatTile label="Q&A" value={counts.qa} />
                <StatTile label="Flashcards" value={counts.flashcards} />
                <StatTile label="Terms" value={counts.vocabulary} />
              </div>
            </div>
          </div>

          <nav
            aria-label="Recommended study flow"
            className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]"
          >
            {STUDY_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex shrink-0 items-center">
                  <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/60 px-3 py-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                      {index + 1}
                    </span>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{step.label}</span>
                  </div>
                  {index < STUDY_STEPS.length - 1 && (
                    <div
                      aria-hidden
                      className="mx-1.5 h-px w-5 shrink-0 bg-border/60 sm:w-8"
                    />
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto w-full max-w-[100rem] flex-1 px-5 md:px-10",
          compactHeader ? "py-4 md:py-5" : "py-6 md:py-8",
        )}
      >
        <div
          className={cn(
            "grid grid-cols-1 gap-6 md:gap-8",
            sourceDocumentId && "lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]",
          )}
        >
          {sourceDocumentId && (
            <ExpandableStudyPanel
              title="Source document"
              subtitle="Read alongside insights — use Focus for full-screen PDF study"
              icon={<FileText className="h-4 w-4" />}
              accent="document"
              isExpanded={expandedPanel === "pdf"}
              onExpand={() => setExpandedPanel("pdf")}
              onCollapse={() => setExpandedPanel(null)}
              className={cn(PANEL_ROW_H, "w-full min-w-0")}
              bodyClassName="bg-muted/15"
            >
              <PdfViewerPanel
                documentId={sourceDocumentId}
                filename={sourceName}
                embedded
                className="h-full min-h-[42vh] border-0 bg-transparent lg:min-h-0"
              />
            </ExpandableStudyPanel>
          )}

          <ExpandableStudyPanel
            title="Study toolkit"
            subtitle={`${totalItems} study items — Q&A, flashcards, vocabulary & more`}
            icon={<Brain className="h-4 w-4" />}
            accent="insights"
            isExpanded={expandedPanel === "insights"}
            onExpand={() => setExpandedPanel("insights")}
            onCollapse={() => setExpandedPanel(null)}
            className={cn(PANEL_ROW_H, "w-full min-w-0", !sourceDocumentId && "mx-auto max-w-5xl")}
          >
            <InsightStudyHub
              content={insight.preview}
              className="h-full min-h-[52vh] lg:min-h-0"
            />
          </ExpandableStudyPanel>
        </div>

        <div className="mt-8 md:mt-10">
          <InsightDoubtChat
            sourceDocumentId={sourceDocumentId}
            sourceName={sourceName}
            insightTitle={insight.title}
            fullscreen={expandedPanel === "chat"}
            onFullscreenChange={(full) => setExpandedPanel(full ? "chat" : null)}
          />
        </div>

        <footer
          className={cn(
            "mt-8 rounded-xl border border-border/35 bg-muted/15 px-4 py-3.5 transition-opacity duration-300 md:px-5",
            compactHeader && "opacity-70",
          )}
        >
          <div className="flex flex-wrap items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
            <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p>
              <span className="font-medium text-foreground">Study tip:</span> Scroll back up to
              see stats and study flow. After each section, explain the idea aloud — active recall
              beats passive re-reading.
            </p>
          </div>
        </footer>
      </div>
    </StudyPageBackdrop>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/55 px-3 py-2.5 text-center backdrop-blur-sm md:px-4 md:py-3">
      <p className="text-lg font-semibold tabular-nums leading-none text-foreground">{value}</p>
      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
