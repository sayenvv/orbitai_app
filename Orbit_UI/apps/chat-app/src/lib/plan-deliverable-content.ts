import type { ApiProjectPlanningWorksheetContent } from "@/lib/orbit-api";
import type { CustomSynopsisSection } from "@/lib/plan-custom-sections";
import { getPlanDiagramSource } from "@/lib/plan-diagram-templates";
import {
  extractMermaidFromDocument,
  looksLikeMermaid,
  normalizeMermaidSource,
} from "@/lib/normalize-mermaid-source";
import { getAllPlanSections } from "@/lib/plan-catalog";
import {
  getSectionDeliverable,
  type SynopsisDeliverable,
  type SynopsisDeliverableFormat,
  type SynopsisSection,
} from "@/lib/plan-synopsis-catalog";

export type PlanDiagramContent = {
  format: "diagram";
  mermaid: string;
};

export type PlanDocumentContent = {
  format: "document";
  text: string;
};

export type PlanMatrixContent = {
  format: "matrix";
  headers: string[];
  rows: string[][];
};

export type PlanDeliverableContent =
  | PlanDiagramContent
  | PlanDocumentContent
  | PlanMatrixContent;

const MATRIX_DEFAULTS: Record<string, { headers: string[]; rows: string[][] }> = {
  "technologies-used": {
    headers: ["Technology", "Category", "Purpose"],
    rows: [
      ["", "Language", ""],
      ["", "Framework", ""],
      ["", "Database", ""],
      ["", "Cloud / API", ""],
    ],
  },
  "hardware-requirements": {
    headers: ["Component", "Minimum", "Recommended"],
    rows: [
      ["Processor", "", ""],
      ["RAM", "", ""],
      ["Storage", "", ""],
      ["Network", "", ""],
    ],
  },
  "software-requirements": {
    headers: ["Software", "Version", "Purpose"],
    rows: [
      ["Operating System", "", ""],
      ["IDE / Editor", "", ""],
      ["Runtime / SDK", "", ""],
      ["Libraries", "", ""],
    ],
  },
};

function titleFromPrompt(projectPrompt: string): string {
  const line = projectPrompt.trim().split(/\n/)[0]?.trim() ?? "";
  if (!line) return "Project Title";
  return line.length > 120 ? `${line.slice(0, 120)}…` : line;
}

function documentPlaceholder(label: string, description: string, projectPrompt: string): string {
  const brief = projectPrompt.trim();
  if (!brief) {
    return `${label}\n\n${description}\n\n[Write content here]`;
  }
  return `${label}\n\n${description}\n\nProject context:\n${brief.slice(0, 400)}${brief.length > 400 ? "…" : ""}`;
}

export function createDefaultDeliverableContent(
  deliverable: SynopsisDeliverable,
  projectPrompt: string,
): PlanDeliverableContent {
  if (deliverable.format === "diagram") {
    return {
      format: "diagram",
      mermaid: normalizeMermaidSource(getPlanDiagramSource(deliverable.id, projectPrompt)),
    };
  }

  if (deliverable.format === "matrix") {
    const defaults = MATRIX_DEFAULTS[deliverable.id];
    if (defaults) {
      return {
        format: "matrix",
        headers: [...defaults.headers],
        rows: defaults.rows.map((row) => [...row]),
      };
    }
    return {
      format: "matrix",
      headers: ["Item", "Details", "Notes"],
      rows: [
        ["", "", ""],
        ["", "", ""],
      ],
    };
  }

  if (deliverable.id === "title") {
    return { format: "document", text: titleFromPrompt(projectPrompt) };
  }

  if (deliverable.id === "references") {
    return {
      format: "document",
      text: "References\n\n1. [Author, Year] — Title. Journal / Publisher. URL\n2. [Author, Year] — Title. Journal / Publisher. URL\n3. ",
    };
  }

  if (deliverable.id.startsWith("doc-") && deliverable.format === "document") {
    return {
      format: "document",
      text: documentPlaceholder(deliverable.label, deliverable.description, projectPrompt),
    };
  }

  return {
    format: "document",
    text: documentPlaceholder(deliverable.label, deliverable.description, projectPrompt),
  };
}

export function createCustomSectionContent(
  section: CustomSynopsisSection,
  projectPrompt: string,
): PlanDeliverableContent {
  if (section.format === "diagram") {
    return {
      format: "diagram",
      mermaid: normalizeMermaidSource(getPlanDiagramSource(section.id, projectPrompt)),
    };
  }

  return {
    format: "document",
    text: documentPlaceholder(section.label, section.description, projectPrompt),
  };
}

export function buildInitialPlanContent(projectPrompt: string): Record<string, PlanDeliverableContent> {
  const content: Record<string, PlanDeliverableContent> = {};
  for (const section of getAllPlanSections()) {
    const deliverable = getSectionDeliverable(section);
    content[deliverable.id] = createDefaultDeliverableContent(deliverable, projectPrompt);
  }
  return content;
}

export function coerceDiagramContent(
  deliverable: SynopsisDeliverable,
  content: PlanDeliverableContent,
  projectPrompt: string,
): PlanDeliverableContent {
  if (deliverable.format !== "diagram") return content;

  if (content.format === "diagram") {
    const mermaid = normalizeMermaidSource(content.mermaid);
    if (mermaid && looksLikeMermaid(mermaid)) {
      return { format: "diagram", mermaid };
    }
  }

  if (content.format === "document") {
    const extracted = extractMermaidFromDocument(content.text);
    if (extracted) return { format: "diagram", mermaid: extracted };
  }

  return createDefaultDeliverableContent(deliverable, projectPrompt);
}

export function getDeliverableContent(
  contentById: Record<string, PlanDeliverableContent>,
  deliverable: SynopsisDeliverable,
  projectPrompt: string,
): PlanDeliverableContent {
  const raw =
    contentById[deliverable.id] ?? createDefaultDeliverableContent(deliverable, projectPrompt);
  return coerceDiagramContent(deliverable, raw, projectPrompt);
}

export function getSectionContent(
  contentById: Record<string, PlanDeliverableContent>,
  section: SynopsisSection,
  projectPrompt: string,
): PlanDeliverableContent {
  return getDeliverableContent(contentById, getSectionDeliverable(section), projectPrompt);
}

export function getProjectTitleFromContent(
  contentById: Record<string, PlanDeliverableContent>,
  projectPrompt: string,
): string {
  const titleContent = contentById.title;
  if (titleContent?.format === "document" && titleContent.text.trim()) {
    return titleContent.text.trim().split("\n")[0]?.trim() || titleFromPrompt(projectPrompt);
  }
  return titleFromPrompt(projectPrompt);
}

export function sectionHasContent(content: PlanDeliverableContent | undefined): boolean {
  if (!content) return false;
  if (content.format === "diagram") return content.mermaid.trim().length > 0;
  if (content.format === "matrix") {
    return content.rows.some((row) => row.some((cell) => cell.trim().length > 0));
  }
  return content.text.trim().length > 0;
}

const MERMAID_FENCE = /```(?:mermaid)?\s*\n([\s\S]*?)```/i;

function extractMermaidFromText(text: string): string | null {
  const match = MERMAID_FENCE.exec(text);
  const extracted = match?.[1]?.trim();
  if (extracted) return normalizeMermaidSource(extracted);
  return extractMermaidFromDocument(text);
}

function flowchartNodesToMermaid(nodes: Array<{ text?: string }>): string {
  if (!nodes.length) return "flowchart LR\n  draft[Draft diagram]";
  const lines = ["flowchart LR"];
  nodes.forEach((node, index) => {
    const id = `n${index}`;
    const label = (node.text ?? `Step ${index + 1}`).replace(/"/g, "'");
    lines.push(`  ${id}["${label}"]`);
    if (index > 0) lines.push(`  n${index - 1} --> ${id}`);
  });
  return lines.join("\n");
}

export function contentToWorksheet(
  content: PlanDeliverableContent,
  label: string,
): ApiProjectPlanningWorksheetContent {
  if (content.format === "diagram") {
    return {
      blocks: [
        { id: "heading-main", type: "heading", text: label },
        {
          id: "mermaid-source",
          type: "paragraph",
          text: `\`\`\`mermaid\n${content.mermaid}\n\`\`\``,
        },
      ],
    };
  }

  if (content.format === "matrix") {
    return {
      blocks: [
        { id: "heading-main", type: "heading", text: label },
        {
          id: "matrix-main",
          type: "matrix",
          headers: content.headers,
          rows: content.rows,
        },
      ],
    };
  }

  return {
    blocks: [
      { id: "heading-main", type: "heading", text: label },
      { id: "body-main", type: "paragraph", text: content.text },
    ],
  };
}

export function worksheetToContent(
  worksheet: ApiProjectPlanningWorksheetContent,
  format: SynopsisDeliverableFormat,
  fallback: PlanDeliverableContent,
): PlanDeliverableContent {
  const blocks = worksheet.blocks ?? [];

  if (format === "diagram") {
    for (const block of blocks) {
      if (
        (block.type === "paragraph" || block.type === "heading" || block.type === "caption") &&
        typeof block.text === "string"
      ) {
        const mermaid = extractMermaidFromText(block.text);
        if (mermaid) return { format: "diagram", mermaid: normalizeMermaidSource(mermaid) };
      }
      if (block.type === "flowchart" && Array.isArray(block.nodes)) {
        return {
          format: "diagram",
          mermaid: normalizeMermaidSource(
            flowchartNodesToMermaid(block.nodes as Array<{ text?: string }>),
          ),
        };
      }
    }

    const allText = blocks
      .filter((block) => typeof block.text === "string")
      .map((block) => String(block.text))
      .join("\n\n");
    const extracted = extractMermaidFromDocument(allText);
    if (extracted) return { format: "diagram", mermaid: extracted };

    return fallback.format === "diagram" ? fallback : { format: "diagram", mermaid: "flowchart LR\n  draft[Draft]" };
  }

  if (format === "matrix") {
    const matrix = blocks.find((block) => block.type === "matrix");
    if (matrix && Array.isArray(matrix.headers) && Array.isArray(matrix.rows)) {
      return {
        format: "matrix",
        headers: matrix.headers.map(String),
        rows: (matrix.rows as unknown[][]).map((row) => row.map(String)),
      };
    }
    return fallback.format === "matrix"
      ? fallback
      : createDefaultDeliverableContent({ id: "", label: "", format: "matrix", description: "" }, "");
  }

  const paragraphs = blocks
    .filter((block) => block.type === "paragraph" || block.type === "heading" || block.type === "caption")
    .map((block) => {
      const text = typeof block.text === "string" ? block.text : "";
      if (block.type === "heading") return text;
      return text;
    })
    .filter(Boolean);

  if (paragraphs.length) {
    return { format: "document", text: paragraphs.join("\n\n") };
  }

  return fallback.format === "document" ? fallback : { format: "document", text: "" };
}

export function contentToPlainText(content: PlanDeliverableContent): string {
  if (content.format === "diagram") return content.mermaid;
  if (content.format === "matrix") {
    const header = content.headers.join(" | ");
    const rows = content.rows.map((row) => row.join(" | ")).join("\n");
    return `${header}\n${rows}`;
  }
  return content.text;
}
