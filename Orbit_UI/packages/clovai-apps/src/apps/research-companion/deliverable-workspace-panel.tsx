"use client";

import { type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import type { WorksheetTabDefinition } from "./workspace-types";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

type DeliverableSection = {
  title: string;
  description: string;
  items?: string[];
};

const LITERATURE_DELIVERABLE_CONTENT: Record<string, DeliverableSection[]> = {
  synthesis: [
    {
      title: "Narrative synthesis",
      description: "Integrate findings across sources into a coherent story.",
      items: ["Research question", "Key themes", "Conflicts", "Conclusion"],
    },
  ],
  themes: [
    {
      title: "Theme map",
      description: "Cluster papers and ideas by recurring topics.",
      items: ["Theme labels", "Supporting sources", "Strength of evidence"],
    },
  ],
  gaps: [
    {
      title: "Gap analysis",
      description: "Identify what the literature does not yet answer.",
      items: ["Open questions", "Method gaps", "Future work"],
    },
  ],
  citations: [
    {
      title: "Bibliography",
      description: "Maintain references and citation graph.",
      items: ["APA / IEEE format", "Primary vs secondary", "Export list"],
    },
  ],
};

function getDeliverableSections(tabId: string): DeliverableSection[] {
  return (
    LITERATURE_DELIVERABLE_CONTENT[tabId] ?? [
      {
        title: "Workspace section",
        description: "Capture notes and artifacts for this phase of your workspace.",
        items: ["Overview", "Details", "Next steps"],
      },
    ]
  );
}

type DeliverableHeaderProps = {
  tab: WorksheetTabDefinition;
  workspaceTitle: string;
  onGenerateSection?: () => void;
  generating?: boolean;
};

/** Compact toolbar for project discussion (fits within tab content area). */
function ProjectPhaseToolbar({
  tab,
  trailing,
}: {
  tab: WorksheetTabDefinition;
  trailing?: ReactNode;
}) {
  const Icon = tab.icon;
  return (
    <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/40 bg-card/90 px-4 py-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-foreground">{tab.label}</h2>
      </div>
      {trailing ? <div className="flex shrink-0 flex-wrap items-center gap-2">{trailing}</div> : null}
    </div>
  );
}

function DeliverableHeader({
  tab,
  workspaceTitle,
  onGenerateSection,
  generating = false,
}: DeliverableHeaderProps) {
  const Icon = tab.icon;
  return (
    <header className="flex flex-wrap items-start gap-4 border-b border-border/30 pb-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {workspaceTitle}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          {tab.label}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{tab.hint}</p>
      </div>
      {onGenerateSection ? (
        <button
          type="button"
          onClick={() => void onGenerateSection()}
          disabled={generating}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {generating ? "Generating…" : "Generate with AI"}
        </button>
      ) : null}
    </header>
  );
}

function GenerateActionButton({
  onGenerateSection,
  generating,
}: {
  onGenerateSection?: () => void;
  generating?: boolean;
}) {
  if (!onGenerateSection) return null;
  return (
    <button
      type="button"
      onClick={() => void onGenerateSection()}
      disabled={generating}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/40 bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 disabled:opacity-60"
    >
      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
      {generating ? "Generating…" : "Generate"}
    </button>
  );
}

function DiagramCanvasPlaceholder({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border/40 bg-muted/15 text-center",
        compact ? "mt-3 px-3 py-6" : "mt-4 px-3 py-8",
      )}
    >
      <p className="text-[11px] font-medium text-foreground">{label}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">Canvas — coming soon</p>
    </div>
  );
}

function DeliverableSectionCard({ section }: { section: DeliverableSection }) {
  return (
    <section className="rounded-lg border border-border/40 bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{section.description}</p>
      {section.items ? (
        <ul className="mt-3 space-y-1.5">
          {section.items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      <DiagramCanvasPlaceholder label={section.title} compact />
    </section>
  );
}

type DeliverableWorkspacePanelProps = {
  tab: WorksheetTabDefinition;
  workspaceTitle: string;
  /** Fills project discussion content area without extra chrome or page scroll. */
  embedded?: boolean;
  onGenerateSection?: () => void;
  generating?: boolean;
};

export function DeliverableWorkspacePanel({
  tab,
  workspaceTitle,
  embedded = false,
  onGenerateSection,
  generating = false,
}: DeliverableWorkspacePanelProps) {
  const sections = getDeliverableSections(tab.id);

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <ProjectPhaseToolbar
          tab={tab}
          trailing={
            <GenerateActionButton
              onGenerateSection={onGenerateSection}
              generating={generating}
            />
          }
        />
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto grid max-w-4xl gap-3 md:grid-cols-2">
            {sections.map((section) => (
              <DeliverableSectionCard key={section.title} section={section} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rc-pdf-stage h-full w-full overflow-auto p-6 md:p-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <DeliverableHeader
          tab={tab}
          workspaceTitle={workspaceTitle}
          onGenerateSection={onGenerateSection}
          generating={generating}
        />

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <DeliverableSectionCard key={section.title} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DeliverableWorkspaceChrome({
  tab,
  workspaceTitle,
}: {
  tab: WorksheetTabDefinition;
  workspaceTitle: string;
}) {
  const Icon = tab.icon;
  return (
    <div className="rc-viewer-chrome w-full shrink-0 border-b border-border/40 bg-white px-4 py-2 backdrop-blur-xl dark:bg-background md:px-5">
      <div className="flex w-full items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {tab.label}
            </p>
            <p className="text-[10px] text-muted-foreground">{workspaceTitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
