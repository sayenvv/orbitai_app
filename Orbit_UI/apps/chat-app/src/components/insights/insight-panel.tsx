"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  HelpCircle,
  Layers,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { InsightsMarkdown } from "@/components/insights/insights-markdown";
import { parseInsightSections, type InsightSection } from "@/lib/parse-insight-sections";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<string, typeof Sparkles> = {
  summary: Sparkles,
  themes: Layers,
  details: ListChecks,
  questions: HelpCircle,
  overview: FileText,
};

const SECTION_STUDENT_HINTS: Record<string, string> = {
  summary: "Start here — capture the main idea in your own words before moving on.",
  themes: "Turn each theme into a heading in your notes or a flashcard deck.",
  details: "Highlight facts, figures, and claims you may need to recall on a test.",
  questions: "Cover the answers and quiz yourself — this is your active recall set.",
  overview: "Read through once, then revisit each section using the tabs above.",
};

type InsightSectionTabsProps = {
  sections: InsightSection[];
  activeId: string;
  onChange: (id: string) => void;
  size?: "sm" | "md";
  className?: string;
};

export function InsightSectionTabs({
  sections,
  activeId,
  onChange,
  size = "md",
  className,
}: InsightSectionTabsProps) {
  if (sections.length <= 1) return null;

  return (
    <div
      className={cn(
        "workspace-tab-surface flex flex-wrap gap-1 rounded-xl p-1",
        className,
      )}
      role="tablist"
      aria-label="Insight sections"
    >
      {sections.map((section) => {
        const Icon = SECTION_ICONS[section.id] ?? FileText;
        const active = section.id === activeId;
        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(section.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs",
              active && "workspace-tab-active",
            )}
          >
            <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
            {section.label}
          </button>
        );
      })}
    </div>
  );
}

type InsightPanelProps = {
  content: string;
  className?: string;
  studentMode?: boolean;
};

export function InsightPanel({ content, className, studentMode = false }: InsightPanelProps) {
  const sections = useMemo(() => parseInsightSections(content), [content]);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "overview");

  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0];

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      <div className="shrink-0 border-b border-border/50 px-4 py-3 md:px-5">
        {!studentMode && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">AI Insights</p>
            {sections.length > 1 && (
              <span className="text-[11px] text-muted-foreground">
                {sections.length} sections
              </span>
            )}
          </div>
        )}
        {sections.length > 1 && (
          <div className={cn(!studentMode && "mt-3")}>
            <InsightSectionTabs
              sections={sections}
              activeId={activeSectionId}
              onChange={setActiveSectionId}
            />
          </div>
        )}
        {studentMode && (
          <p className="mt-3 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Study focus: </span>
            {SECTION_STUDENT_HINTS[activeSection?.id ?? "overview"] ??
              SECTION_STUDENT_HINTS.overview}
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-5">
        <InsightsMarkdown content={activeSection?.content ?? content} />
      </div>
    </div>
  );
}
