"use client";

import { configurePdfWorker } from "@/lib/pdfjs";

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".markdown", ".text"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

export const PLAN_BRIEF_ACCEPT =
  ".pdf,.txt,.md,.markdown,text/plain,text/markdown,application/pdf";

export type PlanBriefInputMode = "prompt" | "upload";

export function isPlanBriefFileSupported(file: File): boolean {
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (TEXT_EXTENSIONS.has(ext)) return true;
  if (PDF_EXTENSIONS.has(ext)) return true;
  if (file.type === "text/plain" || file.type === "text/markdown") return true;
  if (file.type === "application/pdf") return true;
  return false;
}

async function extractTextFromPdfFile(file: File): Promise<string> {
  configurePdfWorker();
  const data = await file.arrayBuffer();
  const { getDocument } = await import("pdfjs-dist");
  const pdf = await getDocument({ data }).promise;
  const parts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) parts.push(pageText);
  }

  return parts.join("\n\n").trim();
}

async function extractTextFromPlainFile(file: File): Promise<string> {
  return file.text();
}

export async function extractPlanBriefFromFile(file: File): Promise<string> {
  if (!isPlanBriefFileSupported(file)) {
    throw new Error("Unsupported file type. Upload PDF, TXT, or Markdown.");
  }

  const name = file.name.toLowerCase();
  const isPdf =
    file.type === "application/pdf" || name.endsWith(".pdf");

  const text = isPdf ? await extractTextFromPdfFile(file) : await extractTextFromPlainFile(file);
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("No readable text found in this document.");
  }

  if (trimmed.length > 24_000) {
    return `${trimmed.slice(0, 24_000)}…`;
  }

  return trimmed;
}
