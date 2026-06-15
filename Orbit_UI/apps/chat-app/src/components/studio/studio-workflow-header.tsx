"use client";

import { ClipboardList, Palette, Rocket, type LucideIcon } from "lucide-react";

import { type StudioPhase } from "@/lib/routes";
import { cn } from "@/lib/utils";

type PhaseConfig = {
  id: StudioPhase;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

const WORKFLOW_PHASES: PhaseConfig[] = [
  { id: "plan", label: "Plan", icon: ClipboardList },
  { id: "design", label: "Design", icon: Palette, comingSoon: true },
  { id: "development", label: "Development", icon: Rocket },
];

function PhaseSegment({
  phase,
  active,
  isLast,
  onSelect,
}: {
  phase: PhaseConfig;
  active: boolean;
  isLast: boolean;
  onSelect: () => void;
}) {
  const Icon = phase.icon;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "studio-workflow-segment group flex min-w-0 items-center justify-center gap-1.5 px-2 py-1.5 text-left transition-colors duration-150 sm:gap-2 sm:px-3 sm:py-2",
        !isLast && "studio-workflow-segment-divider",
        active ? "studio-workflow-segment-active" : "hover:bg-foreground/[0.02] dark:hover:bg-white/[0.03]",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          active
            ? "border-primary/20 bg-primary/[0.08] text-primary"
            : "border-border/50 bg-background/80 text-muted-foreground group-hover:text-foreground/80",
        )}
      >
        <Icon className="size-3" strokeWidth={1.75} />
      </span>
      <span
        className={cn(
          "truncate text-[11px] font-medium sm:text-[12px]",
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/90",
        )}
      >
        {phase.label}
      </span>
      {phase.comingSoon ? (
        <span className="studio-workflow-badge shrink-0">Soon</span>
      ) : null}
    </button>
  );
}

export function StudioWorkflowHeader({
  activePhase,
  onPhaseChange,
}: {
  activePhase: StudioPhase;
  onPhaseChange: (phase: StudioPhase) => void;
  hasLinkedPlan?: boolean;
}) {
  return (
    <header className="studio-workflow-header shrink-0 px-3 py-1.5 md:px-5">
      <nav
        role="tablist"
        aria-label="Studio workflow"
        className="studio-workflow-track grid w-full grid-cols-3 overflow-hidden rounded-lg"
      >
        {WORKFLOW_PHASES.map((phase, index) => (
          <PhaseSegment
            key={phase.id}
            phase={phase}
            active={activePhase === phase.id}
            isLast={index === WORKFLOW_PHASES.length - 1}
            onSelect={() => onPhaseChange(phase.id)}
          />
        ))}
      </nav>
    </header>
  );
}
