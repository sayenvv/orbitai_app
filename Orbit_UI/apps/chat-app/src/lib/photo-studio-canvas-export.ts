import type { ParsedCanvasLayers, PhotoStudioWorkspaceSnapshot } from "@orbit/clovai-apps";
import { parseCanvasLayersJson } from "@orbit/clovai-apps";

import { photoStudioApi } from "@/lib/orbit-api";

export { parseCanvasLayersJson };
export type { ParsedCanvasLayers };

const DEBOUNCE_MS = 750;

export type CanvasExportContext = {
  workspaceId: string | null;
  draftId: string;
};

export function buildCanvasExportPayload(
  snapshot: PhotoStudioWorkspaceSnapshot,
  ctx: CanvasExportContext,
) {
  return {
    workspaceId: ctx.workspaceId ?? undefined,
    draftId: ctx.workspaceId ? undefined : ctx.draftId,
    projectName: snapshot.projectName || snapshot.title,
    aspectRatio: snapshot.aspectRatio,
    canvasBackgroundId: snapshot.canvasBackgroundId,
    customCanvasBackgroundColor: snapshot.customCanvasBackgroundColor,
    customCanvasGradientEnd: snapshot.customCanvasGradientEnd,
    customCanvasGradientEnabled: snapshot.customCanvasGradientEnabled,
    canvasShapes: snapshot.canvasShapes,
    canvasTexts: snapshot.canvasTexts,
  };
}

function canvasSignature(snapshot: PhotoStudioWorkspaceSnapshot): string {
  return JSON.stringify({
    shapes: snapshot.canvasShapes,
    texts: snapshot.canvasTexts,
    canvasBackgroundId: snapshot.canvasBackgroundId,
    customCanvasBackgroundColor: snapshot.customCanvasBackgroundColor,
    customCanvasGradientEnd: snapshot.customCanvasGradientEnd,
    customCanvasGradientEnabled: snapshot.customCanvasGradientEnabled,
  });
}

export async function fetchExportedCanvasLayers(ctx: CanvasExportContext) {
  try {
    const data = await photoStudioApi.getCanvasExport({
      workspaceId: ctx.workspaceId ?? undefined,
      draftId: ctx.workspaceId ? undefined : ctx.draftId,
    });
    return parseCanvasLayersJson(data);
  } catch {
    return null;
  }
}

export function createDebouncedCanvasJsonExporter(ctx: CanvasExportContext) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSignature = "";
  let inFlight = false;

  return (snapshot: PhotoStudioWorkspaceSnapshot) => {
    const signature = canvasSignature(snapshot);
    if (signature === lastSignature) return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (inFlight) return;
      inFlight = true;
      const payload = buildCanvasExportPayload(snapshot, ctx);
      void photoStudioApi
        .exportCanvasJson(payload)
        .then(() => {
          lastSignature = signature;
        })
        .catch(() => {
          // Best-effort local dev export; ignore network errors while drafting.
        })
        .finally(() => {
          inFlight = false;
        });
    }, DEBOUNCE_MS);
  };
}
