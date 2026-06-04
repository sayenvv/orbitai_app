# Frontend UI Design Document

## 1. Frontend Goal

The frontend should provide a clean workspace where users can upload project requirements, choose the SDLC sections they need, review AI-generated artifacts, edit content, chat with an AI assistant, and export final documentation.

The interface should feel like a documentation workspace combined with a project planning dashboard.

## 2. Suggested Frontend Stack

Recommended stack:

- React or Next.js
- TypeScript
- Tailwind CSS
- Zustand, Redux Toolkit, or React Query for state management
- TipTap, Lexical, or Monaco-based editor for editable documents
- Mermaid.js or React Flow for diagrams
- shadcn/ui or similar component library

## 3. Main Pages

### 3.1 Landing Page

Purpose: Explain the product and guide users to create or open a workspace.

Sections:

- Hero section with product title and call to action
- Feature cards
- Supported SDLC outputs
- Example generated diagrams
- Login or continue button

Primary actions:

- Create New Workspace
- Open Existing Workspace

### 3.2 Dashboard

Purpose: Show user workspaces and recent documents.

Components:

- Workspace cards
- Search bar
- Filter by status
- New workspace button
- Recent exports
- Empty state for first-time users

Workspace card fields:

- Workspace name
- Project type
- Created date
- Last updated date
- Generation status
- Review progress

### 3.3 New Workspace Page

Purpose: Collect project requirements and generation preferences.

Sections:

- Workspace name input
- Requirement upload area
- Manual requirement text area
- SDLC selection checklist
- Output style selector
- Generate button

Supported upload states:

- Empty
- File selected
- Uploading
- Upload failed
- Uploaded successfully

SDLC selection options:

- Full SDLC
- Requirement Analysis
- Design Documentation
- Diagrams
- Frontend Planning
- Backend Planning
- Database Design
- API Design
- Testing Strategy
- Deployment Plan
- Custom Selection

### 3.4 Processing Page

Purpose: Show progress while the AI system analyzes requirements and generates artifacts.

UI elements:

- Loader animation
- Current processing step
- Progress percentage
- File parsing status
- AI generation status
- Estimated time message

Example steps:

- Uploading document
- Extracting text
- Analyzing requirements
- Finding missing details
- Generating SDLC sections
- Creating diagrams
- Preparing workspace

### 3.5 Workspace Page

Purpose: Main working area for generated SDLC content.

Recommended layout:

- Left sidebar: SDLC navigation
- Center panel: selected artifact editor or diagram viewer
- Right panel: AI assistant, properties, review status
- Top bar: workspace actions, export, save, user menu

Left sidebar items:

- Overview
- Requirements
- Use Cases
- Process Flow
- Data Flow Diagram
- ER Diagram
- Architecture
- Frontend Plan
- Backend Plan
- API Plan
- Database Plan
- Testing Plan
- Deployment Plan
- Export Center

### 3.6 Artifact Editor Page

Purpose: Review and edit each generated artifact.

Features:

- Rich text editing
- Markdown mode
- Version history placeholder
- Save status
- Review status selector
- Regenerate section button
- Ask AI to modify button

Artifact statuses:

- Draft
- AI Generated
- Edited
- Needs Review
- Reviewed
- Verified

### 3.7 Diagram Viewer and Editor

Purpose: View, edit, regenerate, and export diagrams.

Features:

- Diagram preview
- Source editor for Mermaid or graph data
- Node and edge inspector if using visual editor
- Export as PNG
- Export as SVG
- Export as PDF
- Regenerate diagram with AI

Diagram types:

- Use case diagram
- Process flow diagram
- Data flow diagram
- ER diagram
- Sequence diagram
- Deployment diagram

### 3.8 AI Assistant Panel

Purpose: Let the user modify, summarize, expand, or regenerate generated content.

Placement:

- Right side panel in workspace
- Optional full-screen chat mode

Assistant capabilities:

- Modify current section
- Summarize selected content
- Expand requirements
- Add missing modules
- Update diagrams
- Generate alternative design
- Explain generated content

Prompt examples:

- "Make this suitable for a university report."
- "Add payment module to the backend plan."
- "Simplify this ER diagram."
- "Generate test cases for these requirements."
- "Rewrite this in formal project documentation style."

### 3.9 Export Center

Purpose: Export selected artifacts or the whole workspace.

Export options:

- Complete project document
- Selected SDLC sections
- Individual diagram
- All diagrams
- Workspace summary

Formats:

- PDF
- HTML
- Markdown
- DOCX
- PNG
- SVG

UI controls:

- Section selector
- Format selector
- Include diagrams toggle
- Include AI assumptions toggle
- Include review status toggle
- Export button

## 4. Component List

Core components:

- `WorkspaceCard`
- `FileUploadDropzone`
- `SdlcSelectionPanel`
- `GenerationProgress`
- `WorkspaceSidebar`
- `ArtifactEditor`
- `DiagramRenderer`
- `DiagramSourceEditor`
- `ReviewStatusBadge`
- `AiAssistantPanel`
- `ExportOptionsPanel`
- `WorkspaceTopBar`
- `SectionProgressTracker`

## 5. Frontend State Model

Important state areas:

- Authenticated user
- Workspace list
- Active workspace
- Uploaded files
- Selected SDLC modules
- Generation job status
- Artifacts
- Diagrams
- Review statuses
- AI assistant messages
- Export jobs

Example state shape:

```ts
type WorkspaceState = {
  activeWorkspaceId: string | null;
  selectedArtifactId: string | null;
  generationStatus: "idle" | "uploading" | "processing" | "completed" | "failed";
  reviewProgress: {
    total: number;
    reviewed: number;
    verified: number;
  };
};
```

## 6. Important UX Rules

- The user should always know what is being generated.
- Generated content should never feel locked.
- Editing should be easy and reversible.
- AI changes should be previewed before being applied.
- Export actions should clearly show what is included.
- If generation fails, the user should be able to retry only the failed section.
- If the user selects only design diagrams, the workspace should not show unnecessary SDLC sections.

## 7. Responsive Design

Desktop:

- Full three-column workspace layout.

Tablet:

- Sidebar collapses.
- AI assistant becomes a drawer.

Mobile:

- Workspace navigation becomes tabs or a menu.
- Editor and assistant open as separate views.

## 8. Accessibility

- Keyboard navigation for workspace sections.
- Clear focus states.
- Color contrast compliant badges.
- Screen-reader friendly upload and export controls.
- Avoid status relying only on color.

## 9. Frontend Milestones

1. Build dashboard and workspace creation flow.
2. Add upload and SDLC selection UI.
3. Add generation progress page.
4. Build workspace layout.
5. Add editable artifact editor.
6. Add diagram rendering and export controls.
7. Add AI assistant panel.
8. Add export center.
9. Add review and verification tracking.
