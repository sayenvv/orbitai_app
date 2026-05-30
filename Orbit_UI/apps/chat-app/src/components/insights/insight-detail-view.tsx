"use client";

import { useMemo, useState } from "react";
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
import { InsightStudyHub } from "@/components/insights/insight-study-hub";
import {
  StudyMetaPill,
  StudyPageBackdrop,
  StudySectionLabel,
} from "@/components/insights/insights-shell";
import { PdfViewerPanel } from "@/components/insights/pdf-viewer-panel";
import { formatRelativeDate } from "@/lib/format-library";
import { insightSourceLabel, resolveInsightSourceDocumentId } from "@/lib/insights";
import { buildStudyMaterials, studyTabCounts } from "@/lib/study-materials";
import type { LibraryGeneratedFile, LibraryUpload } from "@/hooks/use-library";
import { cn } from "@/lib/utils";

type ExpandedPanel = "pdf" | "insights" | "chat" | null;

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
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);

  const sourceDocumentId = resolveInsightSourceDocumentId(insight, uploads);
  const sourceName = insightSourceLabel(insight, uploads);
  const materials = useMemo(() => buildStudyMaterials(insight.preview), [insight.preview]);
  const counts = useMemo(() => studyTabCounts(materials), [materials]);
  const totalItems = counts.flashcards + counts.qa + counts.vocabulary;

  return (
    <StudyPageBackdrop>
      <header className="shrink-0 border-b border-border/35 bg-background/40 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-6">
          <Link
            href="/insights"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            AI Board
          </Link>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <StudySectionLabel>Study view</StudySectionLabel>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[1.75rem] md:leading-tight">
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

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:shrink-0 lg:gap-2.5">
              <StatTile label="Insights" value={counts.insights} />
              <StatTile label="Q&A" value={counts.qa} />
              <StatTile label="Flashcards" value={counts.flashcards} />
              <StatTile label="Terms" value={counts.vocabulary} />
            </div>
          </div>

          <nav
            aria-label="Recommended study flow"
            className="mt-6 flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:thin]"
          >
            {STUDY_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex shrink-0 items-center">
                  <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/60 px-3 py-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                      {index + 1}
                    </span>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{step.label}</span>
                  </div>
                  {index < STUDY_STEPS.length - 1 && (
                    <div
                      aria-hidden
                      className="mx-1 h-px w-4 shrink-0 bg-border/60 sm:w-6"
                    />
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-5 md:px-8 md:py-6 lg:overflow-hidden">
        <div
          className={cn(
            "grid gap-5 lg:min-h-0 lg:flex-1",
            sourceDocumentId
              ? "lg:grid-cols-2 lg:overflow-hidden"
              : "mx-auto w-full max-w-3xl lg:flex-1 lg:min-h-0",
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
              className="h-[min(76vh,680px)] lg:h-full lg:min-h-0"
              bodyClassName="bg-muted/15"
            >
              <PdfViewerPanel
                documentId={sourceDocumentId}
                filename={sourceName}
                embedded
                className="h-full min-h-[300px] border-0 bg-transparent lg:min-h-0"
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
            className={cn(
              "h-[min(76vh,680px)] lg:min-h-0",
              sourceDocumentId ? "lg:h-full" : "lg:h-[min(85vh,820px)]",
            )}
          >
            <InsightStudyHub content={insight.preview} className="h-full" />
          </ExpandableStudyPanel>
        </div>

        <div className="mt-5 shrink-0 lg:mt-6">
          <InsightDoubtChat
            sourceDocumentId={sourceDocumentId}
            sourceName={sourceName}
            insightTitle={insight.title}
            fullscreen={expandedPanel === "chat"}
            onFullscreenChange={(full) => setExpandedPanel(full ? "chat" : null)}
          />
        </div>

        <footer className="mt-5 shrink-0 rounded-xl border border-border/35 bg-muted/15 px-4 py-3.5 md:px-5">
          <div className="flex flex-wrap items-start gap-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p>
              <span className="font-medium text-foreground">Study tip:</span> After each section,
              close the PDF and explain the idea aloud — active recall beats passive re-reading.
              Use doubt clearing chat for anything still unclear.
            </p>
          </div>
        </footer>
      </div>
    </StudyPageBackdrop>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/55 px-3 py-2.5 text-center backdrop-blur-sm">
      <p className="text-lg font-semibold tabular-nums leading-none text-foreground">{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
