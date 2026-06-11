import { codeWorkspaceApi, type ApiCodeWorkspaceProjectTemplate } from "@/lib/orbit-api";

export type CodeWorkspaceProjectTemplate = ApiCodeWorkspaceProjectTemplate;

export const FALLBACK_CODE_WORKSPACE_TEMPLATES: CodeWorkspaceProjectTemplate[] = [
  {
    id: "empty",
    label: "Empty project",
    description: "Start with a blank workspace — no files or folders.",
    language: "none",
    framework: null,
  },
  {
    id: "typescript",
    label: "TypeScript",
    description: "Minimal TypeScript package with src/index.ts and basic config.",
    language: "typescript",
    framework: null,
  },
  {
    id: "python",
    label: "Python",
    description: "Simple Python script with requirements.txt.",
    language: "python",
    framework: null,
  },
  {
    id: "python-fastapi",
    label: "Python · FastAPI",
    description: "FastAPI app skeleton with a health route.",
    language: "python",
    framework: "fastapi",
  },
  {
    id: "node-express",
    label: "Node · Express",
    description: "Express server skeleton with a health route.",
    language: "javascript",
    framework: "express",
  },
];

export const DEFAULT_CODE_WORKSPACE_TEMPLATE_ID = "empty";

export async function fetchCodeWorkspaceTemplates(): Promise<CodeWorkspaceProjectTemplate[]> {
  try {
    const result = await codeWorkspaceApi.listTemplates();
    return result.data.length ? result.data : FALLBACK_CODE_WORKSPACE_TEMPLATES;
  } catch {
    return FALLBACK_CODE_WORKSPACE_TEMPLATES;
  }
}

export function findCodeWorkspaceTemplate(
  templates: CodeWorkspaceProjectTemplate[],
  templateId: string,
): CodeWorkspaceProjectTemplate | undefined {
  return templates.find((template) => template.id === templateId);
}

export function formatTemplateLabel(template: CodeWorkspaceProjectTemplate): string {
  if (template.framework) {
    return `${template.label}`;
  }
  return template.label;
}
