"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Palette, Sparkles } from "lucide-react";

import { PlanBackdrop } from "@/components/plan/plan-parts";
import { studioButtonSecondary } from "@/components/studio/studio-ui";
import { cn } from "@/lib/utils";

export function DesignComingSoon({ projectPrompt }: { projectPrompt?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <PlanBackdrop>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full flex-col items-center px-4 pb-10 pt-6 md:px-6 md:pb-14 md:pt-8"
      >
        <div className="w-full max-w-[520px] text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 text-muted-foreground">
            <Palette className="size-6" />
          </span>
          <h1 className="mt-6 text-[1.75rem] font-semibold tracking-[-0.025em] text-foreground md:text-[2rem]">
            Design is on the way
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Wireframes, UI flows, and design artifacts will live here — between your plan and code
            generation.
          </p>

          {projectPrompt ? (
            <div className="mt-6 rounded-xl border border-border/60 bg-card px-4 py-3 text-left shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Linked plan
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">{projectPrompt}</p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Create a plan first, then return here to start design.
            </p>
          )}

          <button
            type="button"
            disabled
            title="Available after Design launches"
            className={cn(studioButtonSecondary("cursor-not-allowed px-4 py-2 text-[13px]"))}
          >
            <Sparkles className="size-4" />
            Generate design from plan
          </button>
        </div>
      </motion.div>
    </PlanBackdrop>
  );
}
