# Backend Design Document

## 1. Backend Goal

The backend manages users, workspaces, uploaded requirement files, AI-generated SDLC artifacts, editable content, diagrams, review status, AI assistant changes, and export jobs.

It should support long-running AI generation through background jobs so the frontend can show real-time progress while the workspace is being prepared.

## 2. Suggested Backend Stack

Recommended stack:

- Node.js with NestJS or Express
- TypeScript
- PostgreSQL
- Prisma or TypeORM
- Redis for queues and temporary job state
- BullMQ or similar job queue
- Object storage for uploaded files and exports
- OpenAI, Anthropic, Gemini, or local LLM provider for AI generation
- Mermaid CLI, Playwright, or headless browser rendering for diagram exports

Alternative stack:

- Python with FastAPI
- PostgreSQL
- SQLAlchemy
- Celery or RQ
- Redis

## 3. High-Level Architecture

Main backend modules:

- Auth service
- Workspace service
- File upload service
- Document parsing service
- AI generation service
- Artifact service
- Diagram service
- AI assistant service
- Export service
- Notification or progress service

## 4. Core Backend Responsibilities

### 4.1 Authentication and User Management

Responsibilities:

- Register users
- Login users
- Manage sessions or JWT tokens
- Associate workspaces with users
- Support future team or organization accounts

### 4.2 Workspace Management

Responsibilities:

- Create workspace
- Update workspace metadata
- List user workspaces
- Open workspace
- Delete or archive workspace
- Track workspace generation and review progress

### 4.3 File Upload and Parsing

Responsibilities:

- Accept uploaded files
- Store original files
- Extract text from PDF, DOCX, TXT, Markdown, and supported formats
- Store parsed text
- Detect unsupported or corrupted files
- Provide parsing status to frontend

Optional future support:

- OCR for scanned documents and images
- Multi-file requirement uploads
- Requirement extraction from URLs

### 4.4 AI SDLC Generation

Responsibilities:

- Generate selected SDLC artifacts from user input
- Generate only user-selected sections
- Maintain structured output
- Save generated artifacts individually
- Generate diagrams in editable formats such as Mermaid or JSON graph data
- Track generation progress
- Retry failed sections

Generation should be section-based instead of one large output. This makes retries, editing, and review easier.

### 4.5 Artifact Management

An artifact is one generated SDLC section.

Examples:

- Requirement analysis
- Functional requirements
- ER diagram
- API plan
- Testing strategy
- Deployment plan

Responsibilities:

- Store artifact content
- Store artifact type
- Store artifact status
- Store review state
- Save user edits
- Maintain revision history if enabled
- Allow artifact-level regeneration

### 4.6 Diagram Management

Responsibilities:

- Store diagram source
- Render diagram preview
- Export diagram in PNG, SVG, or PDF
- Validate diagram syntax
- Allow AI-based diagram modification

Recommended internal formats:

- Mermaid for flowcharts, ER diagrams, sequence diagrams, and use case diagrams
- JSON graph data if using a custom visual editor

### 4.7 AI Assistant

Responsibilities:

- Accept user prompts against a selected workspace or artifact
- Modify selected content
- Generate preview changes
- Apply accepted changes
- Preserve context from workspace artifacts
- Avoid unintentionally changing verified sections unless user confirms

Assistant request types:

- Summarize
- Expand
- Rewrite
- Modify diagram
- Add module
- Generate missing section
- Explain artifact

### 4.8 Export Service

Responsibilities:

- Export complete workspace
- Export selected artifacts
- Export individual diagrams
- Export all diagrams
- Generate PDF, HTML, Markdown, DOCX, PNG, and SVG outputs
- Store export files
- Return downloadable URLs

Export should run as a background job for large workspaces.

## 5. Database Entities

### User

Fields:

- `id`
- `name`
- `email`
- `passwordHash`
- `createdAt`
- `updatedAt`

### Workspace

Fields:

- `id`
- `userId`
- `name`
- `description`
- `projectType`
- `status`
- `selectedModules`
- `createdAt`
- `updatedAt`

### RequirementDocument

Fields:

- `id`
- `workspaceId`
- `fileName`
- `fileType`
- `storageUrl`
- `parsedText`
- `parseStatus`
- `createdAt`

### GenerationJob

Fields:

- `id`
- `workspaceId`
- `status`
- `progress`
- `currentStep`
- `errorMessage`
- `requestedModules`
- `createdAt`
- `updatedAt`

### Artifact

Fields:

- `id`
- `workspaceId`
- `type`
- `title`
- `content`
- `format`
- `status`
- `reviewStatus`
- `verifiedAt`
- `createdAt`
- `updatedAt`

### Diagram

Fields:

- `id`
- `workspaceId`
- `artifactId`
- `type`
- `title`
- `source`
- `sourceFormat`
- `renderStatus`
- `createdAt`
- `updatedAt`

### AssistantMessage

Fields:

- `id`
- `workspaceId`
- `artifactId`
- `role`
- `content`
- `createdAt`

### ExportJob

Fields:

- `id`
- `workspaceId`
- `format`
- `scope`
- `status`
- `fileUrl`
- `errorMessage`
- `createdAt`
- `updatedAt`

## 6. API Endpoints

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Workspaces

- `POST /workspaces`
- `GET /workspaces`
- `GET /workspaces/:workspaceId`
- `PATCH /workspaces/:workspaceId`
- `DELETE /workspaces/:workspaceId`

### Requirement Documents

- `POST /workspaces/:workspaceId/documents`
- `GET /workspaces/:workspaceId/documents`
- `GET /documents/:documentId`
- `DELETE /documents/:documentId`

### Generation

- `POST /workspaces/:workspaceId/generate`
- `GET /generation-jobs/:jobId`
- `POST /generation-jobs/:jobId/retry`
- `POST /artifacts/:artifactId/regenerate`

### Artifacts

- `GET /workspaces/:workspaceId/artifacts`
- `GET /artifacts/:artifactId`
- `PATCH /artifacts/:artifactId`
- `PATCH /artifacts/:artifactId/status`
- `POST /artifacts/:artifactId/verify`

### Diagrams

- `GET /workspaces/:workspaceId/diagrams`
- `GET /diagrams/:diagramId`
- `PATCH /diagrams/:diagramId`
- `POST /diagrams/:diagramId/render`
- `POST /diagrams/:diagramId/export`

### AI Assistant

- `POST /workspaces/:workspaceId/assistant/messages`
- `GET /workspaces/:workspaceId/assistant/messages`
- `POST /artifacts/:artifactId/assistant/modify`
- `POST /assistant/apply-change`

### Exports

- `POST /workspaces/:workspaceId/exports`
- `GET /exports/:exportJobId`
- `GET /workspaces/:workspaceId/exports`

## 7. AI Generation Pipeline

Recommended pipeline:

1. Receive workspace generation request.
2. Validate selected SDLC modules.
3. Parse uploaded files or collect manual input.
4. Normalize requirements into a structured requirement summary.
5. Detect missing information and assumptions.
6. Generate selected artifacts section by section.
7. Generate diagram source for requested diagrams.
8. Validate diagram syntax.
9. Save artifacts and diagrams.
10. Mark generation job as completed.
11. Notify frontend through polling, WebSocket, or server-sent events.

## 8. AI Prompting Strategy

Use separate prompts for each artifact type.

Examples:

- Requirement analysis prompt
- Functional requirement extraction prompt
- ER diagram generation prompt
- API design prompt
- Testing strategy prompt
- Export formatting prompt

Each AI response should return structured JSON where possible.

Example output shape:

```json
{
  "title": "Functional Requirements",
  "artifactType": "functional_requirements",
  "content": "...",
  "assumptions": ["..."],
  "missingQuestions": ["..."]
}
```

## 9. Security Requirements

- Validate uploaded file types.
- Limit file size.
- Scan files if production-grade security is required.
- Store files with private access.
- Use signed URLs for downloads.
- Restrict workspace access by user.
- Sanitize generated HTML before rendering.
- Keep AI provider keys only on the backend.
- Log AI errors without storing sensitive user data unnecessarily.

## 10. Performance Requirements

- Use background jobs for AI generation and exports.
- Stream or poll generation progress.
- Cache rendered diagrams.
- Paginate workspace lists.
- Avoid regenerating unchanged artifacts.
- Support retry at section level.

## 11. Backend Milestones

1. Build auth and workspace CRUD.
2. Add file upload and document parsing.
3. Add generation job queue.
4. Add AI generation for requirement analysis.
5. Add artifact storage and editing.
6. Add diagram generation and rendering.
7. Add AI assistant modification flow.
8. Add export service.
9. Add review and verification status tracking.
10. Add monitoring, logs, and error handling.
