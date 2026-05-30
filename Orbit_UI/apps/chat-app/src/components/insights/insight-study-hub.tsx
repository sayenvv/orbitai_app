"use client";

import { useMemo, useState } from "react";
import {
  BookMarked,
  Brain,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Layers,
  Lightbulb,
  MessageCircleQuestion,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { InsightsMarkdown } from "@/components/insights/insights-markdown";
import { InsightSectionTabs } from "@/components/insights/insight-panel";
import {
  StudyContentCard,
  StudyEmptyState,
  StudySectionLabel,
  StudyTabButton,
  StudyTabStrip,
} from "@/components/insights/insights-shell";
import { parseInsightSections } from "@/lib/parse-insight-sections";
import {
  buildStudyMaterials,
  studyTabCounts,
  type StudyMaterials,
} from "@/lib/study-materials";
import { cn } from "@/lib/utils";

type StudyTab =
  | "overview"
  | "insights"
  | "qa"
  | "flashcards"
  | "vocabulary"
  | "concepts"
  | "cloud";

const TAB_DEFS: {
  id: StudyTab;
  label: string;
  icon: typeof Sparkles;
  countKey?: keyof ReturnType<typeof studyTabCounts>;
}[] = [
  { id: "overview", label: "Overview", icon: BookMarked },
  { id: "insights", label: "Key insights", icon: Lightbulb, countKey: "insights" },
  { id: "qa", label: "Q&A", icon: MessageCircleQuestion, countKey: "qa" },
  { id: "flashcards", label: "Flashcards", icon: Layers, countKey: "flashcards" },
  { id: "vocabulary", label: "Vocabulary", icon: BookMarked, countKey: "vocabulary" },
  { id: "concepts", label: "Concepts", icon: Brain, countKey: "concepts" },
  { id: "cloud", label: "Word cloud", icon: Cloud, countKey: "keywords" },
];

type InsightStudyHubProps = {
  content: string;
  className?: string;
};

export function InsightStudyHub({ content, className }: InsightStudyHubProps) {
  const [tab, setTab] = useState<StudyTab>("overview");
  const sections = useMemo(() => parseInsightSections(content), [content]);
  const materials = useMemo(() => buildStudyMaterials(content), [content]);
  const counts = useMemo(() => studyTabCounts(materials), [materials]);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "overview");
  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0];

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="shrink-0 border-b border-border/35 px-4 py-3.5 md:px-5">
        <StudyTabStrip>
          {TAB_DEFS.map(({ id, label, icon: Icon, countKey }) => {
            const count = countKey ? counts[countKey] : undefined;
            return (
              <StudyTabButton
                key={id}
                active={tab === id}
                onClick={() => setTab(id)}
                count={countKey ? count : undefined}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </StudyTabButton>
            );
          })}
        </StudyTabStrip>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-5 md:py-6">
        {tab === "overview" && (
          <OverviewTab
            sections={sections}
            activeSectionId={activeSectionId}
            onSectionChange={setActiveSectionId}
            activeContent={activeSection?.content ?? content}
            materials={materials}
          />
        )}
        {tab === "insights" && <KeyInsightsTab items={materials.keyInsights} />}
        {tab === "qa" && <QaTab pairs={materials.qaPairs} />}
        {tab === "flashcards" && <FlashcardsTab cards={materials.flashcards} />}
        {tab === "vocabulary" && <VocabularyTab terms={materials.vocabulary} />}
        {tab === "concepts" && <ConceptsTab concepts={materials.concepts} />}
        {tab === "cloud" && <WordCloudTab keywords={materials.keywords} />}
      </div>
    </div>
  );
}

function TabIntro({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{children}</p>
  );
}

function OverviewTab({
  sections,
  activeSectionId,
  onSectionChange,
  activeContent,
  materials,
}: {
  sections: ReturnType<typeof parseInsightSections>;
  activeSectionId: string;
  onSectionChange: (id: string) => void;
  activeContent: string;
  materials: StudyMaterials;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatChip label="Insights" value={materials.keyInsights.length} icon={Lightbulb} />
        <StatChip label="Q&A" value={materials.qaPairs.length} icon={MessageCircleQuestion} />
        <StatChip label="Cards" value={materials.flashcards.length} icon={Layers} />
        <StatChip label="Terms" value={materials.vocabulary.length} icon={BookMarked} />
      </div>
      {sections.length > 1 && (
        <InsightSectionTabs
          sections={sections}
          activeId={activeSectionId}
          onChange={onSectionChange}
          size="sm"
        />
      )}
      <StudyContentCard variant="muted">
        <InsightsMarkdown content={activeContent} className="text-sm" />
      </StudyContentCard>
    </div>
  );
}

function StatChip({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Sparkles;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/60 px-3 py-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-primary/80" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums leading-none text-foreground">
        {value}
      </p>
    </div>
  );
}

function KeyInsightsTab({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <StudyEmptyState
        icon={Lightbulb}
        title="No key insights yet"
        message="Generate or refresh insights from your document to see priority takeaways here."
      />
    );
  }
  return (
    <div className="space-y-3">
      <TabIntro>
        Priority takeaways — use these as review anchors before exams or discussions.
      </TabIntro>
      {items.map((item, index) => (
        <StudyContentCard key={index} variant="accent" className="flex gap-3.5 !py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-xs font-bold text-primary">
            {index + 1}
          </span>
          <p className="text-sm leading-relaxed text-foreground">{item}</p>
        </StudyContentCard>
      ))}
    </div>
  );
}

function QaTab({ pairs }: { pairs: StudyMaterials["qaPairs"] }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  if (pairs.length === 0) {
    return (
      <StudyEmptyState
        icon={MessageCircleQuestion}
        title="No practice questions"
        message="This insight doesn't include Q&A pairs yet. Try regenerating from your document."
      />
    );
  }

  return (
    <div className="space-y-3">
      <TabIntro>
        Try answering each question from memory, then reveal the suggested response.
      </TabIntro>
      {pairs.map((pair, index) => {
        const open = revealed.has(index);
        return (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border/45 bg-background/50"
          >
            <div className="border-b border-border/35 bg-muted/20 px-4 py-3.5 md:px-5">
              <StudySectionLabel>Question {index + 1}</StudySectionLabel>
              <p className="mt-1.5 text-sm font-medium leading-snug text-foreground">
                {pair.question}
              </p>
            </div>
            <div className="px-4 py-3.5 md:px-5">
              {open ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{pair.answer}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevealed((prev) => new Set(prev).add(index))}
                  className="inline-flex h-8 items-center rounded-lg border border-primary/25 bg-primary/8 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/12"
                >
                  Reveal answer
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FlashcardsTab({ cards }: { cards: StudyMaterials["flashcards"] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return (
      <StudyEmptyState
        icon={Layers}
        title="No flashcards available"
        message="Flashcards are built from insight content — try a document with more structured sections."
      />
    );
  }

  const card = cards[index];

  const go = (next: number) => {
    setIndex(next);
    setFlipped(false);
  };

  return (
    <div className="flex h-full min-h-[340px] flex-col">
      <TabIntro>
        Tap the card to flip. Navigate with arrows — ideal for spaced repetition.
      </TabIntro>
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="group relative mx-auto flex min-h-[240px] w-full max-w-md flex-1 flex-col items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br from-background via-card to-primary/[0.04] p-8 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_32px_-12px_rgba(var(--primary),0.15)]"
      >
        <span className="absolute left-4 top-4 rounded-full border border-border/40 bg-background/80 px-2.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {index + 1} / {cards.length}
        </span>
        <RotateCcw className="absolute right-4 top-4 h-4 w-4 text-muted-foreground/50 transition-transform group-hover:rotate-180" />
        <StudySectionLabel>{flipped ? "Answer" : "Prompt"}</StudySectionLabel>
        <p className="mt-4 text-base font-medium leading-relaxed text-foreground md:text-lg">
          {flipped ? card.back : card.front}
        </p>
      </button>
      <div className="mt-5 flex items-center justify-center gap-2">
        <NavButton disabled={index === 0} onClick={() => go(index - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </NavButton>
        <button
          type="button"
          onClick={() => setFlipped(false)}
          className="h-9 rounded-xl border border-border/45 bg-background px-4 text-xs font-medium text-foreground hover:bg-muted/40"
        >
          Reset card
        </button>
        <NavButton disabled={index >= cards.length - 1} onClick={() => go(index + 1)}>
          <ChevronRight className="h-4 w-4" />
        </NavButton>
      </div>
    </div>
  );
}

function NavButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/45 bg-background text-foreground transition-colors hover:bg-muted/40 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function VocabularyTab({ terms }: { terms: StudyMaterials["vocabulary"] }) {
  if (terms.length === 0) {
    return (
      <StudyEmptyState
        icon={BookMarked}
        title="No vocabulary terms"
        message="Bold keywords and definitions from your insight will appear here automatically."
      />
    );
  }
  return (
    <div className="space-y-3">
      <TabIntro>
        Key terms and phrases extracted from the document — add them to your glossary.
      </TabIntro>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {terms.map((item) => (
          <StudyContentCard key={item.term} className="!py-3.5">
            <p className="text-sm font-semibold text-foreground">{item.term}</p>
            {item.hint && (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {item.hint}
              </p>
            )}
          </StudyContentCard>
        ))}
      </div>
    </div>
  );
}

function ConceptsTab({ concepts }: { concepts: StudyMaterials["concepts"] }) {
  if (concepts.length === 0) {
    return (
      <StudyEmptyState
        icon={Brain}
        title="No concept map"
        message="Concepts are derived from section headings — richer documents produce better maps."
      />
    );
  }
  return (
    <div className="space-y-3">
      <TabIntro>
        Big ideas from the document — connect each concept to examples in the PDF.
      </TabIntro>
      <div className="grid gap-3">
        {concepts.map((concept, index) => (
          <StudyContentCard key={index} className="flex items-start gap-3.5 !py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{concept.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {concept.description}
              </p>
            </div>
          </StudyContentCard>
        ))}
      </div>
    </div>
  );
}

function WordCloudTab({ keywords }: { keywords: StudyMaterials["keywords"] }) {
  if (keywords.length === 0) {
    return (
      <StudyEmptyState
        icon={Cloud}
        title="Not enough keywords"
        message="There isn't enough text in this insight to build a meaningful word cloud."
      />
    );
  }

  const sizeClass = (weight: number) => {
    if (weight >= 5) return "text-xl font-bold";
    if (weight >= 4) return "text-lg font-semibold";
    if (weight >= 3) return "text-base font-medium";
    if (weight >= 2) return "text-sm font-medium";
    return "text-xs text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <TabIntro>
        Frequently occurring terms — larger words appeared more often in the insight content.
      </TabIntro>
      <div className="flex min-h-[300px] flex-wrap items-center justify-center gap-x-5 gap-y-4 rounded-2xl border border-border/40 bg-gradient-to-br from-primary/[0.05] via-background to-muted/15 p-10">
        {keywords.map((keyword) => (
          <span
            key={keyword.word}
            className={cn(
              "inline-block capitalize text-primary/85 transition-transform hover:scale-105",
              sizeClass(keyword.weight),
            )}
            title={`Frequency weight: ${keyword.weight}/5`}
          >
            {keyword.word}
          </span>
        ))}
      </div>
    </div>
  );
}
