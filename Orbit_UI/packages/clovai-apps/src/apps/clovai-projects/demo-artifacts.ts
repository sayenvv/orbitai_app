import type { SdlcModuleId } from "./sdlc-modules";
import type { OutputStyle, SdlcArtifact } from "./types";

function styleIntro(style: OutputStyle): string {
  switch (style) {
    case "university":
      return "This draft is formatted for academic submission with clear sections and traceable requirements.";
    case "executive":
      return "This draft emphasizes outcomes, scope, and delivery risks for stakeholder review.";
    case "technical":
      return "This draft prioritizes implementation detail, interfaces, and system boundaries.";
    default:
      return "This draft follows a professional project documentation structure.";
  }
}

const diagramTemplates: Partial<Record<SdlcModuleId, string>> = {
  "process-flow": `flowchart TD
    A[User submits request] --> B{Validate input}
    B -->|Valid| C[Process request]
    B -->|Invalid| D[Return error]
    C --> E[Persist result]
    E --> F[Notify user]`,
  "data-flow": `flowchart LR
    User((User)) --> UI[Client App]
    UI --> API[API Gateway]
    API --> SVC[Core Service]
    SVC --> DB[(Database)]
    SVC --> AI[AI Planner]`,
  "er-diagram": `erDiagram
    USER ||--o{ WORKSPACE : owns
    WORKSPACE ||--|{ ARTIFACT : contains
    ARTIFACT {
      string id
      string module_id
      string status
      datetime updated_at
    }`,
};

function buildDocument(moduleId: SdlcModuleId, name: string, requirements: string, style: OutputStyle): string {
  const excerpt = requirements.trim().slice(0, 280) || "No detailed requirements were provided.";
  const intro = styleIntro(style);

  const bodies: Partial<Record<SdlcModuleId, string>> = {
    overview: `# ${name}\n\n${intro}\n\n## Project summary\nA structured SDLC workspace generated from your requirements.\n\n## Input snapshot\n> ${excerpt}${requirements.length > 280 ? "…" : ""}\n\n## Review progress\nUse the sidebar to review each artifact, edit content, and mark sections as reviewed or verified.`,
    requirements: `# Requirements\n\n## Functional requirements\n- Users can create and manage project workspaces.\n- Users can upload requirement documents or enter ideas manually.\n- Users can select SDLC modules before generation.\n- Users can edit, regenerate, and export generated artifacts.\n\n## Non-functional requirements\n- Responsive workspace layout for desktop and tablet.\n- Clear generation and review status indicators.\n- Editable artifacts with autosave feedback.\n\n## Assumptions\n- Initial release uses demo generation until backend pipelines are connected.\n\n## Constraints\n- Supported upload formats: PDF, DOCX, TXT, Markdown.`,
    "use-cases": `# Use Cases\n\n## UC-01 Create workspace\n**Actor:** Project owner\n**Goal:** Start a new planning workspace from requirements.\n\n## UC-02 Select SDLC modules\n**Actor:** Project owner\n**Goal:** Choose only the documentation sections needed for delivery.\n\n## UC-03 Review artifact\n**Actor:** Analyst / developer\n**Goal:** Edit AI output and mark review status.\n\n## UC-04 Export documentation\n**Actor:** Project owner\n**Goal:** Export selected sections and diagrams.`,
    architecture: `# System Architecture\n\n## High-level view\n- **Client:** Next.js workspace UI (Clovai Projects)\n- **API:** Workspace, artifact, generation, and export services\n- **Workers:** Async SDLC generation and diagram rendering\n- **Storage:** Object store for uploads; database for workspace state\n\n## Core modules\n1. Workspace management\n2. Requirement ingestion\n3. SDLC generation orchestration\n4. Artifact editor and versioning\n5. AI assistant\n6. Export pipeline`,
    "frontend-plan": `# Frontend Plan\n\n## Suggested stack\n- Next.js + TypeScript\n- Tailwind CSS\n- Component library aligned with Clovai Apps\n\n## Key screens\n1. Dashboard / workspace list\n2. New workspace (upload + SDLC selection)\n3. Processing status\n4. Three-column workspace (sidebar, editor, assistant)\n5. Export center\n\n## State areas\n- Active workspace and selected artifact\n- Generation job status\n- Review progress counters`,
    "backend-plan": `# Backend Plan\n\n## Services\n- **Workspace API** — CRUD, rename, status\n- **Upload API** — file ingest and text extraction\n- **Generation API** — queue jobs per SDLC module\n- **Artifact API** — content updates and review status\n- **Export API** — PDF/Markdown/DOCX jobs\n\n## Workers\n- Requirement analyzer\n- Section generator\n- Diagram generator (Mermaid)\n- Export renderer`,
    "api-plan": `# API Plan\n\n| Method | Endpoint | Purpose |\n|--------|----------|--------|\n| GET | /workspaces | List workspaces |\n| POST | /workspaces | Create workspace |\n| POST | /workspaces/{id}/generate | Start SDLC generation |\n| GET | /workspaces/{id}/artifacts | List artifacts |\n| PATCH | /artifacts/{id} | Update content and status |\n| POST | /workspaces/{id}/export | Export selected sections |`,
    "database-plan": `# Database Plan\n\n## Tables\n- users\n- workspaces\n- workspace_files\n- artifacts\n- generation_jobs\n- export_jobs\n\n## Notes\nStore diagram source separately from rendered assets. Track review_status per artifact for dashboard progress.`,
    "testing-plan": `# Testing Strategy\n\n## Unit tests\n- SDLC module selection resolver\n- Artifact status transitions\n- Export option validation\n\n## Integration tests\n- Upload → generation → workspace hydration\n- Partial regeneration of a single section\n\n## E2E tests\n- Create workspace → process → edit → export`,
    "deployment-plan": `# Deployment Plan\n\n## Environments\n- Development\n- Staging\n- Production\n\n## Pipeline\n1. Lint and typecheck\n2. API and worker tests\n3. Build UI\n4. Deploy API + workers\n5. Run migrations\n\n## Observability\n- Generation job metrics\n- Export success rate\n- Assistant usage logs`,
    "export-center": `# Export Center\n\nSelect sections and formats from the workspace toolbar.\n\n**Supported formats:** PDF, HTML, Markdown, DOCX, PNG, SVG\n\nEnable *Include diagrams* and *Include review status* when exporting stakeholder packs.`,
  };

  return bodies[moduleId] ?? `# ${moduleId}\n\nGenerated placeholder for ${name}.`;
}

export function buildDemoArtifacts(
  moduleIds: SdlcModuleId[],
  name: string,
  requirements: string,
  style: OutputStyle,
): SdlcArtifact[] {
  const now = Date.now();
  const artifacts: SdlcArtifact[] = [
    {
      moduleId: "overview",
      title: "Overview",
      content: buildDocument("overview", name, requirements, style),
      status: "ai-generated",
      updatedAt: now,
    },
  ];

  for (const moduleId of moduleIds) {
    if (moduleId === "overview" || moduleId === "export-center") continue;
    const isDiagram = Boolean(diagramTemplates[moduleId]);
    artifacts.push({
      moduleId,
      title: moduleId,
      content: isDiagram ? "" : buildDocument(moduleId, name, requirements, style),
      diagramSource: diagramTemplates[moduleId],
      status: "ai-generated",
      updatedAt: now,
    });
  }

  if (moduleIds.includes("export-center") || moduleIds.length > 0) {
    artifacts.push({
      moduleId: "export-center",
      title: "Export Center",
      content: buildDocument("export-center", name, requirements, style),
      status: "draft",
      updatedAt: now,
    });
  }

  return artifacts;
}
