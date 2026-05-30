"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  LayoutGrid,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { InsightBoardCard } from "@/components/insights/insight-board-card";
import { InsightDetailView } from "@/components/insights/insight-detail-view";
import {
  StudyPageBackdrop,
  StudySectionLabel,
  StudyTabButton,
  StudyTabStrip,
} from "@/components/insights/insights-shell";
import { useLibrary } from "@/hooks/use-library";
import {
  isAiInsight,
  insightSourceLabel,
} from "@/lib/insights";
import { groupInsightsBySource } from "@/lib/parse-insight-sections";

type BoardView = "all" | "grouped";

export function InsightsBoardContent() {
  const router = useRouter();
  const { generated, uploads, loading } = useLibrary();
  const [view, setView] = useState<BoardView>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const insights = useMemo(
    () => generated.filter((file) => isAiInsight(file) && file.preview.trim()),
    [generated],
  );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return insights;
    return insights.filter((file) => {
      const source = insightSourceLabel(file, uploads)?.toLowerCase() ?? "";
      return (
        file.title.toLowerCase().includes(query) ||
        file.preview.toLowerCase().includes(query) ||
        source.includes(query)
      );
    });
  }, [insights, searchQuery, uploads]);

  const grouped = useMemo(
    () =>
      groupInsightsBySource(filtered, (file) => insightSourceLabel(file, uploads)),
    [filtered, uploads],
  );

  const uniqueSources = useMemo(() => {
    const keys = new Set(
      insights.map((file) => insightSourceLabel(file, uploads)).filter(Boolean),
    );
    return keys.size;
  }, [insights, uploads]);

  const renderCards = (items: typeof filtered) => (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {items.map((file) => (
        <InsightBoardCard
          key={file.id}
          file={file}
          sourceName={insightSourceLabel(file, uploads)}
        />
      ))}
    </div>
  );

  return (
    <StudyPageBackdrop>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-12 pt-14 md:px-6">
        <div className="overflow-hidden rounded-2xl border border-border/45 bg-card/70 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] backdrop-blur-sm">
          <div className="border-b border-border/35 bg-gradient-to-r from-primary/[0.06] via-transparent to-violet-500/[0.04] px-5 py-6 md:px-8 md:py-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <StudySectionLabel>AI Board</StudySectionLabel>
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  Document insights
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Open any insight for a split study view — source PDF and structured learning
                  sections designed to help you review smarter.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/?section=library")}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/45 bg-background/80 px-4 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                <FileText className="h-3.5 w-3.5" />
                Library
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <MetricPill
                label={`${insights.length} insight${insights.length === 1 ? "" : "s"}`}
                highlight
              />
              <MetricPill
                label={`${uniqueSources} source document${uniqueSources === 1 ? "" : "s"}`}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : insights.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/50 bg-muted/10 px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-foreground">No insights yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Upload a PDF in your library and generate AI insights to see them here with the
              document rendered side by side.
            </p>
            <button
              type="button"
              onClick={() => router.push("/?section=library")}
              className="mt-7 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to library
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <StudyTabStrip className="w-fit">
                <StudyTabButton active={view === "all"} onClick={() => setView("all")}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                  All insights
                </StudyTabButton>
                <StudyTabButton active={view === "grouped"} onClick={() => setView("grouped")}>
                  <FileText className="h-3.5 w-3.5" />
                  By document
                </StudyTabButton>
              </StudyTabStrip>

              <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search insights…"
                  className="w-full rounded-xl border border-border/45 bg-background/70 py-2.5 pl-10 pr-4 text-sm backdrop-blur-sm placeholder:text-muted-foreground focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-muted/15 px-4 py-12 text-center text-sm text-muted-foreground">
                No insights match your search.
              </div>
            ) : view === "all" ? (
              renderCards(filtered)
            ) : (
              <div className="space-y-10">
                {grouped.map((group) => (
                  <section key={group.key} className="space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-border/35 pb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
                        <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      </div>
                      <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
                      <span className="rounded-full border border-border/40 bg-background/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                        {group.items.length}
                      </span>
                    </div>
                    {renderCards(group.items)}
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </StudyPageBackdrop>
  );
}

function MetricPill({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <span
      className={
        highlight
          ? "rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary"
          : "rounded-full border border-border/40 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground"
      }
    >
      {label}
    </span>
  );
}

type InsightDetailContentProps = {
  insightId: string;
};

export function InsightDetailContent({ insightId }: InsightDetailContentProps) {
  const { generated, uploads, loading } = useLibrary();
  const insight = generated.find((file) => file.id === insightId);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Insight not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This insight may have been deleted or you may not have access.
        </p>
        <Link
          href="/insights"
          className="mt-6 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Back to AI Board
        </Link>
      </div>
    );
  }

  return <InsightDetailView insight={insight} uploads={uploads} />;
}
