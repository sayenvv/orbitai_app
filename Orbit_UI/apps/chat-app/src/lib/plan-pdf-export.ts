import {
  contentToPlainText,
  getSectionContent,
  type PlanDeliverableContent,
} from "@/lib/plan-deliverable-content";
import { mergeSynopsisSections } from "@/lib/plan-synopsis-section-order";
import type { CustomSynopsisSection } from "@/lib/plan-custom-sections";
import { normalizeMermaidSource } from "@/lib/normalize-mermaid-source";
import {
  getSectionDeliverable,
  type SynopsisSection,
} from "@/lib/plan-synopsis-catalog";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDocumentHtml(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function formatMatrixHtml(content: Extract<PlanDeliverableContent, { format: "matrix" }>): string {
  const head = content.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = content.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell || "—")}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table class="matrix"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

async function renderMermaidDiagrams(
  contentById: Record<string, PlanDeliverableContent>,
  sections: SynopsisSection[],
): Promise<Record<string, string>> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "loose",
  });

  const svgs: Record<string, string> = {};
  for (const section of sections) {
    const deliverable = getSectionDeliverable(section);
    if (deliverable.format !== "diagram") continue;
    const content = getSectionContent(contentById, section, "");
    if (content.format !== "diagram") continue;
    const diagramSource = normalizeMermaidSource(content.mermaid);
    if (!diagramSource) continue;
    try {
      const { svg } = await mermaid.render(`plan-pdf-${section.id}`, diagramSource);
      svgs[section.id] = svg;
    } catch {
      svgs[section.id] = `<pre class="diagram-fallback">${escapeHtml(diagramSource)}</pre>`;
    }
  }
  return svgs;
}

function sectionBodyHtml(
  section: SynopsisSection,
  content: PlanDeliverableContent,
  diagramSvgs: Record<string, string>,
): string {
  if (content.format === "diagram") {
    const svg = diagramSvgs[section.id];
    if (svg) return `<div class="diagram">${svg}</div>`;
    return `<pre class="diagram-fallback">${escapeHtml(content.mermaid)}</pre>`;
  }
  if (content.format === "matrix") return formatMatrixHtml(content);
  return formatDocumentHtml(content.text);
}

function buildDocumentHtml(
  projectTitle: string,
  contentById: Record<string, PlanDeliverableContent>,
  diagramSvgs: Record<string, string>,
  sections: SynopsisSection[],
): string {
  const tocRows = sections.map(
    (section) => `
      <tr>
        <td class="toc-num">${section.number}</td>
        <td class="toc-label">${escapeHtml(section.label)}</td>
        <td class="toc-desc">${escapeHtml(section.description)}</td>
      </tr>`,
  ).join("");

  const sectionsHtml = sections.map((section) => {
    const content = getSectionContent(contentById, section, "");
    return `
      <section class="proposal-section" id="section-${section.id}">
        <h2><span class="section-num">${section.number}.</span> ${escapeHtml(section.label)}</h2>
        <p class="section-desc">${escapeHtml(section.description)}</p>
        <div class="section-body">
          ${sectionBodyHtml(section, content, diagramSvgs)}
        </div>
      </section>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(projectTitle)} — Project Proposal</title>
  <style>
    @page { margin: 20mm 18mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.55;
      color: #111;
      margin: 0;
      padding: 0;
    }
    .cover {
      min-height: 90vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
    }
    .cover h1 {
      font-size: 22pt;
      font-weight: 700;
      margin: 0 0 12px;
      max-width: 80%;
    }
    .cover p { color: #444; margin: 0; font-size: 13pt; }
    .toc-page-title {
      page-break-before: always;
      font-size: 18pt;
      font-weight: 700;
      margin: 0 0 20px;
      text-align: center;
    }
    table.toc {
      width: 100%;
      border-collapse: collapse;
      font-size: 11pt;
    }
    table.toc th, table.toc td {
      border-bottom: 1px solid #ddd;
      padding: 8px 6px;
      vertical-align: top;
      text-align: left;
    }
    table.toc th { font-weight: 700; background: #f7f7f7; }
    .toc-num { width: 36px; font-weight: 600; }
    .toc-desc { color: #555; font-size: 10pt; }
    .proposal-section {
      page-break-before: always;
      margin-bottom: 24px;
    }
    .proposal-section h2 {
      font-size: 15pt;
      margin: 0 0 6px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 6px;
    }
    .section-num { margin-right: 6px; }
    .section-desc {
      margin: 0 0 14px;
      color: #555;
      font-size: 10.5pt;
      font-style: italic;
    }
    .section-body p { margin: 0 0 10px; }
    table.matrix {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5pt;
      margin-top: 8px;
    }
    table.matrix th, table.matrix td {
      border: 1px solid #ccc;
      padding: 6px 8px;
    }
    table.matrix th { background: #f5f5f5; }
    .diagram {
      margin-top: 10px;
      text-align: center;
      overflow: hidden;
    }
    .diagram svg { max-width: 100%; height: auto; }
    pre.diagram-fallback {
      font-family: ui-monospace, monospace;
      font-size: 9pt;
      background: #f5f5f5;
      padding: 12px;
      white-space: pre-wrap;
      border: 1px solid #ddd;
    }
    @media print {
      .proposal-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${escapeHtml(projectTitle)}</h1>
    <p>Project Proposal Document</p>
  </div>

  <h2 class="toc-page-title">Table of Contents</h2>
  <table class="toc">
    <thead>
      <tr>
        <th>Section</th>
        <th>Title</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>${tocRows}</tbody>
  </table>

  ${sectionsHtml}

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`;
}

export async function exportPlanProposalPdf({
  projectTitle,
  contentById,
  customSynopsisSections = [],
  synopsisSectionOrder = [],
}: {
  projectTitle: string;
  contentById: Record<string, PlanDeliverableContent>;
  customSynopsisSections?: CustomSynopsisSection[];
  synopsisSectionOrder?: string[];
}): Promise<void> {
  const sections = mergeSynopsisSections(customSynopsisSections, synopsisSectionOrder);
  const diagramSvgs = await renderMermaidDiagrams(contentById, sections);
  const html = buildDocumentHtml(projectTitle, contentById, diagramSvgs, sections);
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups to export the PDF.");
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function buildPlanPlainTextExport(
  projectTitle: string,
  contentById: Record<string, PlanDeliverableContent>,
  customSynopsisSections: CustomSynopsisSection[] = [],
  synopsisSectionOrder: string[] = [],
): string {
  const sections = mergeSynopsisSections(customSynopsisSections, synopsisSectionOrder);
  const lines = [projectTitle, "Project Proposal", "", "TABLE OF CONTENTS", ""];
  for (const section of sections) {
    lines.push(`${section.number}. ${section.label}`);
    lines.push(`   ${section.description}`);
  }
  lines.push("");
  for (const section of sections) {
    const content = getSectionContent(contentById, section, "");
    lines.push(`${"=".repeat(60)}`);
    lines.push(`${section.number}. ${section.label}`);
    lines.push(section.description);
    lines.push("");
    lines.push(contentToPlainText(content));
    lines.push("");
  }
  return lines.join("\n");
}
