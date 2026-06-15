"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PlanPanel } from "@/components/plan/plan-panel";
import { PlatformGeneratePanel } from "@/components/platform/platform-generate-panel";
import { DesignComingSoon } from "@/components/studio/design-coming-soon";
import { StudioWorkflowHeader } from "@/components/studio/studio-workflow-header";
import { parseStudioPhase, studioWithPhase, type StudioPhase } from "@/lib/routes";

const STUDIO_PLAN_PROMPT_KEY = "orbit-studio-plan-prompt";

export function readStudioPlanPrompt(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(STUDIO_PLAN_PROMPT_KEY) ?? "";
}

export function writeStudioPlanPrompt(prompt: string) {
  if (typeof window === "undefined") return;
  if (prompt.trim()) {
    sessionStorage.setItem(STUDIO_PLAN_PROMPT_KEY, prompt.trim());
  } else {
    sessionStorage.removeItem(STUDIO_PLAN_PROMPT_KEY);
  }
}

export function StudioPanel({ initialPhase }: { initialPhase?: StudioPhase }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phase = initialPhase ?? parseStudioPhase(searchParams.get("phase"));
  const [linkedPlanPrompt, setLinkedPlanPrompt] = useState("");

  useEffect(() => {
    setLinkedPlanPrompt(readStudioPlanPrompt());
  }, [phase]);

  const handlePlanPromptChange = useCallback((prompt: string) => {
    writeStudioPlanPrompt(prompt);
    setLinkedPlanPrompt(prompt);
  }, []);

  const handlePhaseChange = useCallback(
    (nextPhase: StudioPhase) => {
      router.push(studioWithPhase(nextPhase));
    },
    [router],
  );

  useEffect(() => {
    if (phase === "plan" && searchParams.get("phase") === "plan") {
      router.replace(studioWithPhase("plan"));
    }
  }, [phase, router, searchParams]);

  return (
    <div className="studio-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <StudioWorkflowHeader activePhase={phase} onPhaseChange={handlePhaseChange} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {phase === "design" ? (
          <DesignComingSoon projectPrompt={linkedPlanPrompt || undefined} />
        ) : phase === "development" ? (
          <PlatformGeneratePanel />
        ) : (
          <PlanPanel onProjectPromptChange={handlePlanPromptChange} />
        )}
      </div>
    </div>
  );
}
