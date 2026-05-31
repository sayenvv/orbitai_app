"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AgentListingIcon } from "@orbit/ui";
import {
  ArrowRight,
  BookMarked,
  Brain,
  Cloud,
  Layers,
  Lightbulb,
  MessageCircleQuestion,
  Sparkles,
} from "lucide-react";
import { InsightShareMenu } from "@/components/insights/insight-share-menu";
import { formatRelativeDate } from "@/lib/format-library";
import { insightPlainExcerpt } from "@/lib/parse-insight-sections";
import { buildStudyMaterials, studyTabCounts } from "@/lib/study-materials";
import type { LibraryGeneratedFile } from "@/hooks/use-library";
import { cn } from "@/lib/utils";

type InsightBoardCardProps = {
  file: LibraryGeneratedFile;
  sourceName: string | null;
};

const TOOLKIT_CHIPS = [
  { key: "insights", label: "Insights", icon: Lightbulb },
  { key: "qa", label: "Q&A", icon: MessageCircleQuestion },
  { key: "flashcards", label: "Cards", icon: Layers },
  { key: "vocabulary", label: "Vocab", icon: BookMarked },
  { key: "concepts", label: "Concepts", icon: Brain },
  { key: "keywords", label: "Cloud", icon: Cloud },
] as const;

export function InsightBoardCard({ file, sourceName }: InsightBoardCardProps) {
  const materials = useMemo(() => buildStudyMaterials(file.preview), [file.preview]);
  const counts = useMemo(() => studyTabCounts(materials), [materials]);
  const activeChips = TOOLKIT_CHIPS.filter(
    ({ key }) => counts[key as keyof typeof counts] > 0,
  );

  return (
    <div
      className={cn(
        "group relative flex min-h-[260px] flex-col overflow-hidden rounded-2xl border border-border/45 md:min-h-[280px]",
        "bg-card/70 backdrop-blur-sm transition-all duration-200",
        "hover:border-primary/30 hover:bg-card/90",
      )}
    >
      <div className="absolute right-4 top-4 z-10 md:right-5 md:top-5">
        <InsightShareMenu
          variant="icon"
          insightId={file.id}
          title={file.title}
          preview={file.preview}
          sourceName={sourceName}
        />
      </div>

      <Link href={`/insights/${file.id}`} className="flex min-h-0 flex-1 flex-col">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex flex-1 gap-5 p-6 md:p-7">
        <AgentListingIcon
          iconKey={file.iconKey}
          colorKey={file.colorKey}
          size="lg"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary md:text-lg">
            {file.title}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {file.type}
            </span>
            {sourceName && <span className="truncate max-w-[200px] md:max-w-[260px]">{sourceName}</span>}
            <span aria-hidden className="text-border">·</span>
            <span>{formatRelativeDate(file.createdAt)}</span>
          </div>
          <p className="mt-4 line-clamp-4 min-h-[5.5rem] text-sm leading-relaxed text-muted-foreground md:min-h-[6rem] md:line-clamp-5">
            {insightPlainExcerpt(file.preview, 320)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/30 px-6 py-4 md:px-7 md:py-5">
        <div className="flex flex-wrap gap-2">
          {activeChips.map(({ key, label, icon: Icon }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/35 bg-muted/25 px-2.5 py-1 text-[11px] font-medium text-muted-foreground md:text-xs"
            >
              <Icon className="h-3 w-3 opacity-70" />
              {label}
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Study view
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      </Link>
    </div>
  );
}
