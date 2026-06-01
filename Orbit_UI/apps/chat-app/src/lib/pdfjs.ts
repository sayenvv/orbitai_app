"use client";

import { GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from "pdfjs-dist";
import { getApiBaseUrl } from "@/lib/orbit-api";

let workerConfigured = false;

export function configurePdfWorker(): void {
  if (workerConfigured || typeof window === "undefined") return;
  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  workerConfigured = true;
}

export function isPdfRenderCancelled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  return name === "RenderingCancelledException";
}

export async function loadPdfDocument(documentId: string): Promise<PDFDocumentProxy> {
  configurePdfWorker();

  const response = await fetch(`${getApiBaseUrl()}/files/${documentId}/download`, {
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail?: unknown }).detail)
        : "Could not load PDF";
    throw new Error(detail);
  }

  const data = await response.arrayBuffer();
  const { getDocument } = await import("pdfjs-dist");
  const task = getDocument({ data });
  return task.promise;
}

export async function renderPdfPageToCanvas(
  document: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  options: {
    scale?: number;
    targetWidth?: number;
    maxHeight?: number;
    activeTask?: { current: RenderTask | null };
  },
): Promise<void> {
  if (options.activeTask?.current) {
    options.activeTask.current.cancel();
    options.activeTask.current = null;
  }

  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });

  let scale = options.scale;
  if (scale === undefined) {
    const targetWidth = options.targetWidth ?? viewport.width;
    scale = targetWidth / viewport.width;
    if (options.maxHeight && options.maxHeight > 0) {
      scale = Math.min(scale, options.maxHeight / viewport.height);
    }
  }

  const scaledViewport = page.getViewport({ scale });

  const context = canvas.getContext("2d");
  if (!context) return;

  canvas.width = Math.floor(scaledViewport.width);
  canvas.height = Math.floor(scaledViewport.height);

  const renderTask = page.render({
    canvasContext: context,
    viewport: scaledViewport,
  });

  if (options.activeTask) {
    options.activeTask.current = renderTask;
  }

  try {
    await renderTask.promise;
  } catch (error) {
    if (isPdfRenderCancelled(error)) return;
    throw error;
  } finally {
    if (options.activeTask?.current === renderTask) {
      options.activeTask.current = null;
    }
  }
}
