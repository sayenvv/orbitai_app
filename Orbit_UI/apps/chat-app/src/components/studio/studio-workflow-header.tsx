"use client";

import { type StudioPhase } from "@/lib/routes";
import { cn } from "@/lib/utils";

const WORKFLOW_PHASES: Array<{
  id: StudioPhase;
  label: string;
  comingSoon?: boolean;
}> = [
  { id: "plan", label: "Plan" },
  { id: "design", label: "Design", comingSoon: true },
  { id: "development", label: "Development" },
];

export function StudioWorkflowHeader({
  activePhase,
  onPhaseChange,
}: {
  activePhase: StudioPhase;
  onPhaseChange: (phase: StudioPhase) => void;
  hasLinkedPlan?: boolean;
}) {
  return (
    <header className="studio-workflow-header shrink-0 px-3 md:px-5">
      <nav
        role="tablist"
        aria-label="Studio workflow"
        className="grid w-full grid-cols-3"
      >
        {WORKFLOW_PHASES.map((phase) => {
          const active = activePhase === phase.id;
          return (
            <button
              key={phase.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onPhaseChange(phase.id)}
              className={cn(
                "relative flex min-w-0 items-center justify-center gap-1.5 px-2 py-2.5 text-[12px] font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80",
              )}
            >
              <span className="truncate">{phase.label}</span>
              {phase.comingSoon ? (
                <span className="shrink-0 text-[10px] font-normal text-muted-foreground/70">
                  Soon
                </span>
              ) : null}
              <span
                className={cn(
                  "absolute inset-x-3 bottom-0 h-px bg-foreground transition-opacity",
                  active ? "opacity-100" : "opacity-0",
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </nav>
    </header>
  );
}
