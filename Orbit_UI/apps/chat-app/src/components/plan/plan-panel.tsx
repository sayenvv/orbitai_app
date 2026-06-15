"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { PlanBackdrop, PlanIdleHero, PlanWorkspace } from "@/components/plan/plan-parts";
import {
  readRecentStudioPlans,
  recordRecentStudioPlan,
  type RecentStudioPlan,
} from "@/lib/studio-recent-plans";
import { randomId } from "@/lib/utils";

export function PlanPanel({ onProjectPromptChange }: { onProjectPromptChange?: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [projectPrompt, setProjectPrompt] = useState("");
  const [recentPlans, setRecentPlans] = useState<RecentStudioPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const showWorkspace = hasStarted;

  useEffect(() => {
    if (!showWorkspace) {
      setRecentPlans(readRecentStudioPlans());
    }
  }, [showWorkspace]);

  const startPlanning = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed || running) return;

    const planId = activePlanId ?? randomId();
    setActivePlanId(planId);
    setHasStarted(true);
    setProjectPrompt(trimmed);
    onProjectPromptChange?.(trimmed);
    setRunning(true);
    setRecentPlans(
      recordRecentStudioPlan({
        id: planId,
        prompt: trimmed,
        status: "draft",
      }),
    );

    window.setTimeout(() => {
      setRunning(false);
    }, 1200);
  }, [activePlanId, onProjectPromptChange, prompt, running]);

  const openRecentPlan = useCallback(
    (planId: string) => {
      const plan = recentPlans.find((item) => item.id === planId);
      if (!plan) return;

      setActivePlanId(plan.id);
      setPrompt(plan.prompt);
      setProjectPrompt(plan.prompt);
      setHasStarted(true);
      setRunning(false);
      onProjectPromptChange?.(plan.prompt);
      setRecentPlans(
        recordRecentStudioPlan({
          id: plan.id,
          title: plan.title,
          prompt: plan.prompt,
          status: plan.status,
        }),
      );
    },
    [onProjectPromptChange, recentPlans],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PlanBackdrop plain={showWorkspace}>
        <AnimatePresence mode="wait" initial={false}>
          {!showWorkspace ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <PlanIdleHero
                prompt={prompt}
                onPromptChange={setPrompt}
                onSubmit={startPlanning}
                running={running}
                onTemplateSelect={setPrompt}
                recentPlans={recentPlans}
                onOpenRecentPlan={openRecentPlan}
              />
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <PlanWorkspace projectPrompt={projectPrompt} running={running} />
            </motion.div>
          )}
        </AnimatePresence>
      </PlanBackdrop>
    </div>
  );
}
