"use client";

import { useEffect, useMemo, useRef } from "react";
import { Bot, ListChecks, Loader2 } from "lucide-react";
import { ChatAssistantResponse } from "@/components/chat/chat-assistant-response";
import { ClovopsChatFileResults } from "@/components/code/clovops-chat-file-results";
import { ClovopsChatReviewResults } from "@/components/code/clovops-chat-review-results";
import { ClovopsChatTerminal } from "@/components/code/clovops-chat-terminal";
import {
  ClovopsPlanReviewCard,
  type PlanReviewPayload,
} from "@/components/code/clovops-plan-review-card";
import { ClovopsWorkflowPanel } from "@/components/code/clovops-workflow-panel";
import type { ApiCodeWorkspaceWorkflowEvent } from "@/lib/clovops-workflow-events";
import { messageToUIMessage } from "@/lib/orbit-ui-message";
import type {
  ApiCodeWorkspaceAgentReview,
  ApiCodeWorkspaceSearchMatch,
  ApiCodeWorkspaceTerminalEntry,
} from "@/lib/orbit-api";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

type ClovopsAgentOutputPanelProps = {
  visible: boolean;
  live: boolean;
  agentPhase?: string | null;
  responseMessage?: Message | null;
  workflow?: ApiCodeWorkspaceWorkflowEvent[];
  workflowRevision?: number;
  terminals?: ApiCodeWorkspaceTerminalEntry[];
  files?: ApiCodeWorkspaceSearchMatch[];
  reviews?: ApiCodeWorkspaceAgentReview[];
  planReview?: PlanReviewPayload | null;
  onApprovePlan?: () => void;
  approvingPlan?: boolean;
  onOpenFile?: (fileId: string, line: number) => void;
  className?: string;
};

export function ClovopsAgentOutputPanel({
  visible,
  live,
  agentPhase,
  responseMessage,
  workflow = [],
  workflowRevision = 0,
  terminals = [],
  files = [],
  reviews = [],
  planReview,
  onApprovePlan,
  approvingPlan = false,
  onOpenFile,
  className,
}: ClovopsAgentOutputPanelProps) {
  const responseText = responseMessage?.content?.trim() ?? "";
  const uiMessage = useMemo(
    () =>
      responseMessage ? messageToUIMessage(responseMessage, { streaming: live }) : null,
    [responseMessage, live],
  );

  const showActivity = workflow.length > 0;
  const showTerminal = terminals.length > 0;
  const showResponse = Boolean(live || responseText);
  const showPlanReview = Boolean(planReview);
  const showFiles = files.length > 0;
  const showReviews = reviews.length > 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const planReviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPlanReview) return;
    const container = scrollRef.current;
    const target = planReviewRef.current;
    if (!container || !target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [showPlanReview, planReview, workflowRevision]);

  const hasContent =
    showActivity ||
    showTerminal ||
    showResponse ||
    showPlanReview ||
    showFiles ||
    showReviews;

  if (!visible) return null;

  if (!hasContent && !live) return null;

  return (
    <section
      className={cn(
        "mx-1.5 mb-2 overflow-hidden rounded-xl border border-border/45 bg-background/95 shadow-sm backdrop-blur-sm md:mx-2",
        live && "border-border/60 ring-1 ring-border/20",
        className,
      )}
      aria-label="Agent output"
    >
      <header className="flex items-center gap-2 border-b border-border/30 px-3 py-2">
        {live ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : showPlanReview ? (
          <ListChecks className="h-3.5 w-3.5 shrink-0 text-amber-600/80 dark:text-amber-400/80" />
        ) : (
          <Bot className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {showPlanReview ? "Plan review" : "Agent output"}
          </p>
          {(live || showPlanReview) && agentPhase ? (
            <p className="truncate text-[12px] text-foreground/85">{agentPhase}</p>
          ) : null}
        </div>
      </header>

      {!hasContent && live ? (
        <div className="px-3 py-4">
          <p className="text-[12px] text-muted-foreground">Preparing agent run…</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="max-h-[min(42vh,22rem)] overflow-y-auto [scrollbar-width:thin]"
        >
        {showActivity ? (
          <div className="border-b border-border/25 px-2 py-1.5">
            <ClovopsWorkflowPanel
              key={live ? `live-${workflowRevision}` : "done"}
              events={workflow}
              live={live && !showPlanReview}
              embedded
              muted
              className="mt-0"
            />
          </div>
        ) : null}

        {showTerminal ? (
          <div className="border-b border-border/25 px-1 py-1">
            <ClovopsChatTerminal
              entries={terminals}
              live={live && !showPlanReview}
              embedded
              className="mt-0"
            />
          </div>
        ) : null}

        {showFiles ? (
          <div className="border-b border-border/25 px-1 py-1">
            <ClovopsChatFileResults files={files} onOpenFile={onOpenFile} className="mt-0" />
          </div>
        ) : null}

        {showReviews ? (
          <div className="border-b border-border/25 px-1 py-1">
            <ClovopsChatReviewResults reviews={reviews} />
          </div>
        ) : null}

        {showResponse && uiMessage ? (
          <div className={cn("px-3 py-3", showPlanReview && "border-b border-border/25")}>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/75">
              Response
            </p>
            <div className="text-[14px] leading-relaxed text-foreground/90">
              <ChatAssistantResponse message={uiMessage} isStreaming={live && !showPlanReview} />
            </div>
          </div>
        ) : null}

        {showPlanReview && planReview ? (
          <div ref={planReviewRef} className="p-2">
            <ClovopsPlanReviewCard
              review={planReview}
              onApprove={onApprovePlan}
              approving={approvingPlan}
              className="mt-0"
            />
          </div>
        ) : null}
        </div>
      )}
    </section>
  );
}
