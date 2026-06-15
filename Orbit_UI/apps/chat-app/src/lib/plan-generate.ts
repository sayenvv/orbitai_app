import {
  coerceDiagramContent,
  contentToWorksheet,
  createDefaultDeliverableContent,
  getSectionContent,
  worksheetToContent,
  type PlanDeliverableContent,
} from "@/lib/plan-deliverable-content";
import {
  getPlanSectionsForGeneration,
  type PlanGenerateTarget,
} from "@/lib/plan-catalog";
import { getSectionDeliverable, type SynopsisSection } from "@/lib/plan-synopsis-catalog";
import { ApiError, projectPlanningApi } from "@/lib/orbit-api";

const BATCH_SIZE = 3;

export type PlanGenerateProgress = {
  done: number;
  total: number;
  label: string;
  percent: number;
};

export type PlanGenerateLogLevel = "info" | "success" | "error";

export type PlanGenerateLogEntry = {
  id: string;
  at: number;
  level: PlanGenerateLogLevel;
  message: string;
};

function buildProgress(done: number, total: number, label: string): PlanGenerateProgress {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, label, percent };
}

function buildGenerateMessage(sectionLabel: string, sectionDescription: string, projectPrompt: string) {
  return (
    `Generate complete, professional content for "${sectionLabel}".\n` +
    `Purpose: ${sectionDescription}\n\n` +
    `Use this project brief as the single source of truth:\n${projectPrompt}\n\n` +
    "Return an updated worksheet with substantive content. For diagrams, use Mermaid in a paragraph fenced block."
  );
}

async function generateSectionContent({
  planId,
  projectPrompt,
  section,
  fallback,
}: {
  planId: string;
  projectPrompt: string;
  section: SynopsisSection;
  fallback: PlanDeliverableContent;
}): Promise<PlanDeliverableContent> {
  const deliverable = getSectionDeliverable(section);
  const result = await projectPlanningApi.aiAssist({
    projectId: planId,
    artifactId: deliverable.id,
    message: buildGenerateMessage(section.label, section.description, projectPrompt),
    projectName: projectPrompt.slice(0, 80) || "Studio plan",
    projectSummary: projectPrompt,
    phaseLabel: section.label,
    artifactLabel: deliverable.label,
    artifactDescription: deliverable.description,
    artifactFormat: deliverable.format,
    worksheet: contentToWorksheet(fallback, deliverable.label),
    history: [],
  });

  if (result.worksheetUpdated && result.worksheet) {
    const content = worksheetToContent(result.worksheet, deliverable.format, fallback);
    return deliverable.format === "diagram"
      ? coerceDiagramContent(deliverable, content, projectPrompt)
      : content;
  }

  return fallback;
}

export async function generatePlanBundleFromPrompt({
  planId,
  projectPrompt,
  initialContent,
  targets = ["synopsis", "documentation"],
  excludedSectionIds = [],
  onProgress,
  onLog,
  onSectionComplete,
  signal,
}: {
  planId: string;
  projectPrompt: string;
  initialContent: Record<string, PlanDeliverableContent>;
  targets?: PlanGenerateTarget[];
  excludedSectionIds?: string[];
  onProgress?: (progress: PlanGenerateProgress) => void;
  onLog?: (entry: Omit<PlanGenerateLogEntry, "id" | "at">) => void;
  onSectionComplete?: (sectionId: string, content: PlanDeliverableContent) => void;
  signal?: AbortSignal;
}): Promise<Record<string, PlanDeliverableContent>> {
  const sections = getPlanSectionsForGeneration(targets, excludedSectionIds);
  const total = sections.length;
  const output: Record<string, PlanDeliverableContent> = { ...initialContent };
  let done = 0;
  let logCounter = 0;

  const pushLog = (level: PlanGenerateLogLevel, message: string) => {
    onLog?.({ level, message });
    logCounter += 1;
  };

  if (total === 0) {
    pushLog("error", "Select at least one deliverable: synopsis or documentation.");
    return output;
  }

  const targetLabel = targets
    .map((target) => (target === "synopsis" ? "synopsis" : "documentation"))
    .join(" + ");

  pushLog("info", `Planning agent started for ${targetLabel} (${total} sections).`);
  onProgress?.(buildProgress(0, total, "Initializing agent…"));

  for (let index = 0; index < sections.length; index += BATCH_SIZE) {
    if (signal?.aborted) {
      pushLog("error", "Planning agent cancelled.");
      break;
    }

    const batch = sections.slice(index, index + BATCH_SIZE);
    const batchLabel = batch.map((section) => section.label).join(", ");
    pushLog("info", `Generating batch: ${batchLabel}`);
    onProgress?.(buildProgress(done, total, batchLabel));

    const results = await Promise.all(
      batch.map(async (section) => {
        const deliverable = getSectionDeliverable(section);
        const fallback =
          output[deliverable.id] ??
          getSectionContent(initialContent, section, projectPrompt) ??
          createDefaultDeliverableContent(deliverable, projectPrompt);

        try {
          const content = await generateSectionContent({
            planId,
            projectPrompt,
            section,
            fallback,
          });
          return { section, sectionId: deliverable.id, content, error: null as string | null };
        } catch (error) {
          if (error instanceof ApiError) throw error;
          const message = error instanceof Error ? error.message : "Section generation failed";
          return { section, sectionId: deliverable.id, content: fallback, error: message };
        }
      }),
    );

    for (const result of results) {
      output[result.sectionId] = result.content;
      onSectionComplete?.(result.sectionId, result.content);
      done += 1;

      if (result.error) {
        pushLog("error", `Failed ${result.section.label}: ${result.error}`);
      } else {
        pushLog("success", `Completed ${result.section.label}`);
      }

      onProgress?.(buildProgress(done, total, result.section.label));
    }
  }

  if (!signal?.aborted) {
    pushLog("success", "Planning agent finished. Opening workspace…");
    onProgress?.(buildProgress(total, total, "Complete"));
  }

  return output;
}
