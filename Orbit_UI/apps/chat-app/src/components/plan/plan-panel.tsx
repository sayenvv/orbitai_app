"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { PlanAgentRunView, PlanAgentTrigger } from "@/components/plan/plan-agent-home";
import { PlanBackdrop, PlanWorkspace } from "@/components/plan/plan-parts";
import { useAppShell } from "@/components/layout/app-shell-context";
import {
  buildInitialPlanContent,
  coerceDiagramContent,
  createCustomSectionContent,
  type PlanDeliverableContent,
} from "@/lib/plan-deliverable-content";
import { createCustomSynopsisSection, type CustomSynopsisSection } from "@/lib/plan-custom-sections";
import type { PlanGenerateTarget } from "@/lib/plan-catalog";
import { getPlanSectionById, resolveIncludedSectionIds, resolvePlanSection } from "@/lib/plan-catalog";
import {
  appendSynopsisSectionToOrder,
  normalizeSynopsisSectionOrder,
  removeSynopsisSectionFromOrder,
} from "@/lib/plan-synopsis-section-order";
import {
  generatePlanBundleFromPrompt,
  type PlanGenerateLogEntry,
  type PlanGenerateProgress,
} from "@/lib/plan-generate";
import {
  extractPlanBriefFromFile,
  type PlanBriefInputMode,
} from "@/lib/plan-brief-from-file";
import { getSectionDeliverable } from "@/lib/plan-synopsis-catalog";
import {
  readRecentStudioPlans,
  recordRecentStudioPlan,
  type RecentStudioPlan,
} from "@/lib/studio-recent-plans";
import {
  readStudioPlanCustomSections,
  writeStudioPlanCustomSections,
} from "@/lib/studio-plan-custom-sections-storage";
import {
  readStudioPlanSectionOrder,
  writeStudioPlanSectionOrder,
} from "@/lib/studio-plan-section-order-storage";
import {
  readStudioPlanScope,
  writeStudioPlanScope,
  type PlanScopeConfig,
} from "@/lib/studio-plan-scope-storage";
import {
  readStudioPlanContent,
  writeStudioPlanContent,
} from "@/lib/studio-plan-content-storage";
import { parseStudioPlanId, parseStudioPlanTarget, readBrowserSearchParam, studioPlanWorkspace } from "@/lib/routes";
import { useAuthStore } from "@/store/auth-store";

import { randomId } from "@/lib/utils";

const DEFAULT_BRIEF_INPUT_MODE: PlanBriefInputMode = "prompt";
const DEFAULT_TARGET: PlanGenerateTarget = "synopsis";

const EMPTY_EXCLUDED_BY_TARGET: Record<PlanGenerateTarget, string[]> = {
  synopsis: [],
  documentation: [],
};

function appendGenerateLog(
  current: PlanGenerateLogEntry[],
  entry: Omit<PlanGenerateLogEntry, "id" | "at">,
): PlanGenerateLogEntry[] {
  return [
    ...current,
    {
      ...entry,
      id: `${Date.now()}-${current.length}`,
      at: Date.now(),
    },
  ];
}

function resolvePlanScopeForOpen(
  planId: string,
  options?: { urlTarget?: PlanGenerateTarget | null; recentTarget?: PlanGenerateTarget | null },
): PlanScopeConfig | null {
  const stored = readStudioPlanScope(planId);
  if (stored) return stored;

  const target = options?.urlTarget ?? options?.recentTarget;
  if (!target) return null;

  const scope: PlanScopeConfig = {
    target,
    includedSectionIds: resolveIncludedSectionIds(target, []),
  };
  writeStudioPlanScope(planId, scope);
  return scope;
}

export function PlanPanel({ onProjectPromptChange }: { onProjectPromptChange?: (prompt: string) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdFromUrl = parseStudioPlanId(searchParams.get("planId"));
  const { openAuthPrompt } = useAppShell();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [prompt, setPrompt] = useState("");
  const [briefInputMode, setBriefInputMode] = useState<PlanBriefInputMode>(DEFAULT_BRIEF_INPUT_MODE);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedBrief, setUploadedBrief] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractingBrief, setExtractingBrief] = useState(false);
  const [generateTarget, setGenerateTarget] = useState<PlanGenerateTarget>(DEFAULT_TARGET);
  const [excludedByTarget, setExcludedByTarget] = useState(EMPTY_EXCLUDED_BY_TARGET);
  const [planScope, setPlanScope] = useState<PlanScopeConfig | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<PlanGenerateProgress | null>(null);
  const [generateLogs, setGenerateLogs] = useState<PlanGenerateLogEntry[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [projectPrompt, setProjectPrompt] = useState("");
  const [recentPlans, setRecentPlans] = useState<RecentStudioPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [contentByDeliverableId, setContentByDeliverableId] = useState<
    Record<string, PlanDeliverableContent>
  >({});
  const [customSynopsisSections, setCustomSynopsisSections] = useState<CustomSynopsisSection[]>([]);
  const [synopsisSectionOrder, setSynopsisSectionOrder] = useState<string[]>([]);
  const generateAbortRef = useRef<AbortController | null>(null);
  const openedFromUrlRef = useRef<string | null>(null);

  const loadPlanLayout = useCallback((planId: string) => {
    const customSections = readStudioPlanCustomSections(planId);
    setCustomSynopsisSections(customSections);
    setSynopsisSectionOrder(
      normalizeSynopsisSectionOrder(readStudioPlanSectionOrder(planId), customSections),
    );
    setPlanScope(readStudioPlanScope(planId));
  }, []);

  const excludedSectionIds = excludedByTarget[generateTarget];

  const resolveActiveBrief = useCallback(() => {
    return briefInputMode === "prompt" ? prompt.trim() : uploadedBrief.trim();
  }, [briefInputMode, prompt, uploadedBrief]);

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError(null);
    setUploadedFile(file);
    setExtractingBrief(true);

    try {
      const text = await extractPlanBriefFromFile(file);
      setUploadedBrief(text);
    } catch (error) {
      setUploadedBrief("");
      setUploadedFile(null);
      setUploadError(
        error instanceof Error ? error.message : "Could not read this document. Try another file.",
      );
    } finally {
      setExtractingBrief(false);
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setUploadedBrief("");
    setUploadError(null);
  }, []);

  const handleBriefInputModeChange = useCallback((mode: PlanBriefInputMode) => {
    setBriefInputMode(mode);
    setUploadError(null);
  }, []);

  const handleTargetChange = useCallback((target: PlanGenerateTarget) => {
    setGenerateTarget(target);
  }, []);

  const handleExcludedSectionIdsChange = useCallback(
    (ids: string[]) => {
      setExcludedByTarget((current) => ({ ...current, [generateTarget]: ids }));
    },
    [generateTarget],
  );

  const openPlanWorkspace = useCallback(
    (
      planId: string,
      planPrompt: string,
      options?: {
        replaceUrl?: boolean;
        content?: Record<string, PlanDeliverableContent>;
        scope?: PlanScopeConfig | null;
        target?: PlanGenerateTarget | null;
      },
    ) => {
      const recent = readRecentStudioPlans().find((item) => item.id === planId);
      const urlTarget = parseStudioPlanTarget(readBrowserSearchParam("target"));
      const scope =
        options?.scope ??
        resolvePlanScopeForOpen(planId, {
          urlTarget,
          recentTarget: options?.target ?? recent?.target ?? null,
        });
      const content =
        options?.content ??
        readStudioPlanContent(planId) ??
        buildInitialPlanContent(planPrompt);

      if (scope) writeStudioPlanScope(planId, scope);
      writeStudioPlanContent(planId, content);

      setActivePlanId(planId);
      setProjectPrompt(planPrompt);
      setPrompt(planPrompt);
      onProjectPromptChange?.(planPrompt);
      setHasStarted(true);
      setIsGenerating(false);
      setGenerateProgress(null);
      setContentByDeliverableId(content);
      setPlanScope(scope);
      loadPlanLayout(planId);
      if (options?.replaceUrl !== false) {
        router.replace(studioPlanWorkspace(planId, "plan", null, scope?.target ?? null));
      }
    },
    [loadPlanLayout, onProjectPromptChange, router],
  );

  const showWorkspace = hasStarted && !isGenerating;
  const showAgentRun = isGenerating;
  const showTrigger = !hasStarted && !isGenerating;

  useEffect(() => {
    if (showTrigger) {
      setRecentPlans(readRecentStudioPlans());
    }
  }, [showTrigger]);

  useEffect(() => {
    if (!planIdFromUrl || openedFromUrlRef.current === planIdFromUrl) return;
    const stored = readStudioPlanContent(planIdFromUrl);
    if (!stored) return;

    openedFromUrlRef.current = planIdFromUrl;
    const recent = readRecentStudioPlans().find((item) => item.id === planIdFromUrl);
    const planPrompt = recent?.prompt ?? projectPrompt;
    const urlTarget = parseStudioPlanTarget(readBrowserSearchParam("target"));
    openPlanWorkspace(planIdFromUrl, planPrompt, {
      replaceUrl: false,
      target: urlTarget ?? recent?.target ?? null,
    });
  }, [openPlanWorkspace, planIdFromUrl, projectPrompt]);

  useEffect(() => {
    if (!activePlanId || !Object.keys(contentByDeliverableId).length) return;
    const handle = window.setTimeout(() => {
      writeStudioPlanContent(activePlanId, contentByDeliverableId);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [activePlanId, contentByDeliverableId]);

  useEffect(() => {
    if (!activePlanId) return;
    writeStudioPlanCustomSections(activePlanId, customSynopsisSections);
  }, [activePlanId, customSynopsisSections]);

  useEffect(() => {
    if (!activePlanId) return;
    writeStudioPlanSectionOrder(activePlanId, synopsisSectionOrder);
  }, [activePlanId, synopsisSectionOrder]);

  const handleContentChange = useCallback(
    (deliverableId: string, content: PlanDeliverableContent) => {
      const section =
        resolvePlanSection(deliverableId, customSynopsisSections, synopsisSectionOrder) ??
        getPlanSectionById(deliverableId);
      const deliverable = section ? getSectionDeliverable(section) : undefined;
      const next =
        deliverable?.format === "diagram"
          ? coerceDiagramContent(deliverable, content, projectPrompt)
          : content;
      setContentByDeliverableId((current) => ({ ...current, [deliverableId]: next }));
    },
    [customSynopsisSections, projectPrompt, synopsisSectionOrder],
  );

  const handleAddCustomSection = useCallback(
    (label: string, format: CustomSynopsisSection["format"]) => {
      const section = createCustomSynopsisSection(label, format);
      const content = createCustomSectionContent(section, projectPrompt);
      setCustomSynopsisSections((current) => {
        const nextCustom = [...current, section];
        setSynopsisSectionOrder((order) =>
          appendSynopsisSectionToOrder(
            normalizeSynopsisSectionOrder(order, nextCustom),
            section.id,
          ),
        );
        return nextCustom;
      });
      setContentByDeliverableId((current) => ({ ...current, [section.id]: content }));
      return section.id;
    },
    [projectPrompt],
  );

  const handleRemoveCustomSection = useCallback((sectionId: string) => {
    setCustomSynopsisSections((current) => current.filter((section) => section.id !== sectionId));
    setSynopsisSectionOrder((current) => removeSynopsisSectionFromOrder(current, sectionId));
    setContentByDeliverableId((current) => {
      const next = { ...current };
      delete next[sectionId];
      return next;
    });
  }, []);

  const handleReorderSynopsisSections = useCallback(
    (orderedIds: string[]) => {
      setSynopsisSectionOrder(
        normalizeSynopsisSectionOrder(orderedIds, customSynopsisSections),
      );
    },
    [customSynopsisSections],
  );

  const startPlanning = useCallback(async () => {
    const trimmed = resolveActiveBrief();
    if (!trimmed || isGenerating || extractingBrief) return;

    if (!isAuthenticated) {
      openAuthPrompt();
      return;
    }

    const planId = randomId();
    const initialContent = buildInitialPlanContent(trimmed);
    const includedSectionIds = resolveIncludedSectionIds(generateTarget, excludedSectionIds);
    const scope: PlanScopeConfig = {
      target: generateTarget,
      includedSectionIds,
    };

    setActivePlanId(planId);
    setProjectPrompt(trimmed);
    onProjectPromptChange?.(trimmed);
    setIsGenerating(true);
    setGenerateProgress(null);
    setGenerateLogs([]);
    setContentByDeliverableId(initialContent);
    setPlanScope(scope);
    writeStudioPlanScope(planId, scope);
    loadPlanLayout(planId);
    setRecentPlans(
      recordRecentStudioPlan({
        id: planId,
        prompt: trimmed,
        status: "draft",
        target: generateTarget,
      }),
    );

    generateAbortRef.current?.abort();
    const controller = new AbortController();
    generateAbortRef.current = controller;

    try {
      const output = await generatePlanBundleFromPrompt({
        planId,
        projectPrompt: trimmed,
        initialContent,
        targets: [generateTarget],
        excludedSectionIds,
        signal: controller.signal,
        onProgress: setGenerateProgress,
        onLog: (entry) => {
          setGenerateLogs((current) => appendGenerateLog(current, entry));
        },
        onSectionComplete: (sectionId, content) => {
          setContentByDeliverableId((current) => ({ ...current, [sectionId]: content }));
        },
      });

      setRecentPlans(
        recordRecentStudioPlan({
          id: planId,
          prompt: trimmed,
          status: "complete",
          target: generateTarget,
        }),
      );

      openPlanWorkspace(planId, trimmed, {
        content: output,
        scope,
        target: generateTarget,
      });
    } catch {
      setGenerateLogs((current) =>
        appendGenerateLog(current, {
          level: "error",
          message: "Planning agent failed. Template content was kept — opening workspace with draft.",
        }),
      );
      openPlanWorkspace(planId, trimmed, { scope, target: generateTarget });
    } finally {
      generateAbortRef.current = null;
    }
  }, [
    briefInputMode,
    extractingBrief,
    generateTarget,
    excludedSectionIds,
    isAuthenticated,
    isGenerating,
    loadPlanLayout,
    onProjectPromptChange,
    openAuthPrompt,
    openPlanWorkspace,
    resolveActiveBrief,
  ]);

  const openRecentPlan = useCallback(
    (planId: string) => {
      const plan = recentPlans.find((item) => item.id === planId);
      if (!plan) return;

      setRecentPlans(
        recordRecentStudioPlan({
          id: plan.id,
          title: plan.title,
          prompt: plan.prompt,
          status: plan.status,
          target: plan.target,
        }),
      );
      openPlanWorkspace(plan.id, plan.prompt, { target: plan.target ?? null });
    },
    [openPlanWorkspace, recentPlans],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <PlanBackdrop plain={showWorkspace}>
        <AnimatePresence mode="wait" initial={false}>
          {showTrigger ? (
            <motion.div
              key="trigger"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col"
            >
              <PlanAgentTrigger
                prompt={prompt}
                onPromptChange={setPrompt}
                briefInputMode={briefInputMode}
                onBriefInputModeChange={handleBriefInputModeChange}
                uploadedFile={uploadedFile}
                uploadedBrief={uploadedBrief}
                uploadError={uploadError}
                extractingBrief={extractingBrief}
                onFileSelect={handleFileSelect}
                onRemoveFile={handleRemoveFile}
                target={generateTarget}
                onTargetChange={handleTargetChange}
                excludedSectionIds={excludedSectionIds}
                onExcludedSectionIdsChange={handleExcludedSectionIdsChange}
                onSubmit={startPlanning}
                disabled={isGenerating}
                recentPlans={recentPlans}
                onOpenRecentPlan={openRecentPlan}
              />
            </motion.div>
          ) : null}

          {showAgentRun ? (
            <motion.div
              key="running"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col"
            >
              <PlanAgentRunView
                progress={generateProgress}
                logs={generateLogs}
                target={generateTarget}
              />
            </motion.div>
          ) : null}

          {showWorkspace ? (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              {activePlanId ? (
                <PlanWorkspace
                  planId={activePlanId}
                  projectPrompt={projectPrompt}
                  running={false}
                  generateProgress={null}
                  contentByDeliverableId={contentByDeliverableId}
                  customSynopsisSections={customSynopsisSections}
                  synopsisSectionOrder={synopsisSectionOrder}
                  planScope={planScope}
                  onContentChange={handleContentChange}
                  onAddCustomSection={handleAddCustomSection}
                  onRemoveCustomSection={handleRemoveCustomSection}
                  onReorderSynopsisSections={handleReorderSynopsisSections}
                />
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </PlanBackdrop>
    </div>
  );
}
