# Architecture, Diagrams, and Roadmap

## 1. System Context

```mermaid
flowchart LR
  User[User] --> WebApp[Frontend Web Application]
  WebApp --> Backend[Backend API]
  Backend --> Database[(PostgreSQL Database)]
  Backend --> Storage[(File and Export Storage)]
  Backend --> Queue[Background Job Queue]
  Queue --> Workers[AI and Export Workers]
  Workers --> AIProvider[AI Provider]
  Workers --> DiagramRenderer[Diagram Renderer]
  Workers --> Storage
  Workers --> Database
```

## 2. Main User Process Flow

```mermaid
flowchart TD
  Start([Start]) --> Dashboard[Open Dashboard]
  Dashboard --> Choice{Create or Open Workspace?}
  Choice -->|Create New| NewWorkspace[Enter Workspace Details]
  Choice -->|Open Existing| ExistingWorkspace[Load Workspace]
  NewWorkspace --> Input[Upload File or Enter Requirements]
  Input --> SelectModules[Select Needed SDLC Modules]
  SelectModules --> Generate[Start AI Generation]
  Generate --> Loader[Show Processing Loader]
  Loader --> Workspace[Open Generated Workspace]
  ExistingWorkspace --> Workspace
  Workspace --> Review[Review Generated Sections]
  Review --> EditChoice{Need Changes?}
  EditChoice -->|Manual Edit| ManualEdit[Edit Content or Diagram]
  EditChoice -->|AI Help| AiEdit[Ask AI Assistant]
  ManualEdit --> Review
  AiEdit --> Preview[Preview AI Change]
  Preview --> ApplyChoice{Apply Change?}
  ApplyChoice -->|Yes| Review
  ApplyChoice -->|No| Workspace
  Review --> Verified{All Needed Sections Verified?}
  Verified -->|No| Review
  Verified -->|Yes| Export[Export Documents or Diagrams]
  Export --> End([End])
```

## 3. Data Flow Diagram

```mermaid
flowchart TD
  User[User] -->|Upload requirement file or prompt| Frontend[Frontend]
  Frontend -->|Create workspace request| BackendAPI[Backend API]
  BackendAPI -->|Store workspace metadata| DB[(Database)]
  BackendAPI -->|Store uploaded file| FileStorage[(File Storage)]
  BackendAPI -->|Create generation job| Queue[Job Queue]
  Queue --> Worker[AI Generation Worker]
  Worker -->|Read parsed requirements| DB
  Worker -->|Send structured prompts| AI[AI Provider]
  AI -->|Generated SDLC artifacts| Worker
  Worker -->|Save artifacts and diagrams| DB
  Worker -->|Update progress| DB
  Frontend -->|Poll or subscribe to progress| BackendAPI
  BackendAPI -->|Return generated workspace| Frontend
  User -->|Review, edit, verify| Frontend
  Frontend -->|Save updates| BackendAPI
  BackendAPI --> DB
  Frontend -->|Request export| BackendAPI
  BackendAPI --> Queue
  Queue --> ExportWorker[Export Worker]
  ExportWorker -->|Read artifacts and diagrams| DB
  ExportWorker -->|Generate file| ExportStorage[(Export Storage)]
  ExportStorage -->|Download URL| BackendAPI
  BackendAPI --> Frontend
```

## 4. Entity Relationship Diagram

```mermaid
erDiagram
  USER ||--o{ WORKSPACE : owns
  WORKSPACE ||--o{ REQUIREMENT_DOCUMENT : contains
  WORKSPACE ||--o{ GENERATION_JOB : has
  WORKSPACE ||--o{ ARTIFACT : contains
  ARTIFACT ||--o{ DIAGRAM : may_have
  WORKSPACE ||--o{ ASSISTANT_MESSAGE : has
  WORKSPACE ||--o{ EXPORT_JOB : creates

  USER {
    string id
    string name
    string email
    string passwordHash
    datetime createdAt
    datetime updatedAt
  }

  WORKSPACE {
    string id
    string userId
    string name
    string description
    string projectType
    string status
    json selectedModules
    datetime createdAt
    datetime updatedAt
  }

  REQUIREMENT_DOCUMENT {
    string id
    string workspaceId
    string fileName
    string fileType
    string storageUrl
    text parsedText
    string parseStatus
    datetime createdAt
  }

  GENERATION_JOB {
    string id
    string workspaceId
    string status
    int progress
    string currentStep
    text errorMessage
    json requestedModules
    datetime createdAt
    datetime updatedAt
  }

  ARTIFACT {
    string id
    string workspaceId
    string type
    string title
    text content
    string format
    string status
    string reviewStatus
    datetime verifiedAt
    datetime createdAt
    datetime updatedAt
  }

  DIAGRAM {
    string id
    string workspaceId
    string artifactId
    string type
    string title
    text source
    string sourceFormat
    string renderStatus
    datetime createdAt
    datetime updatedAt
  }

  ASSISTANT_MESSAGE {
    string id
    string workspaceId
    string artifactId
    string role
    text content
    datetime createdAt
  }

  EXPORT_JOB {
    string id
    string workspaceId
    string format
    string scope
    string status
    string fileUrl
    text errorMessage
    datetime createdAt
    datetime updatedAt
  }
```

## 5. Workspace Module Structure

```mermaid
flowchart TD
  Workspace[Workspace]
  Workspace --> Overview[Project Overview]
  Workspace --> Requirements[Requirement Analysis]
  Workspace --> Design[System Design]
  Workspace --> Diagrams[Diagrams]
  Workspace --> Frontend[Frontend Plan]
  Workspace --> Backend[Backend Plan]
  Workspace --> Database[Database Plan]
  Workspace --> Testing[Testing Strategy]
  Workspace --> Deployment[Deployment Plan]
  Workspace --> Export[Export Center]

  Diagrams --> UseCase[Use Case Diagram]
  Diagrams --> ProcessFlow[Process Flow]
  Diagrams --> DFD[Data Flow Diagram]
  Diagrams --> ERD[ER Diagram]
  Diagrams --> Sequence[Sequence Diagram]
```

## 6. AI Generation Sequence

```mermaid
sequenceDiagram
  actor User
  participant FE as Frontend
  participant API as Backend API
  participant Q as Job Queue
  participant W as AI Worker
  participant AI as AI Provider
  participant DB as Database

  User->>FE: Upload requirements and select SDLC modules
  FE->>API: Create workspace and generation request
  API->>DB: Save workspace and request metadata
  API->>Q: Enqueue generation job
  API-->>FE: Return job id
  FE->>API: Request job progress
  Q->>W: Start generation job
  W->>DB: Load requirements
  W->>AI: Generate requirement analysis
  AI-->>W: Requirement artifact
  W->>DB: Save artifact
  W->>AI: Generate selected diagrams and plans
  AI-->>W: Structured artifacts and diagram sources
  W->>DB: Save artifacts, diagrams, progress
  FE->>API: Request completed workspace
  API->>DB: Load workspace artifacts
  API-->>FE: Return generated workspace
```

## 7. Recommended Project Structure

### Frontend

```text
frontend/
  src/
    app/
    components/
      workspace/
      artifacts/
      diagrams/
      assistant/
      export/
    hooks/
    lib/
    services/
    stores/
    types/
```

### Backend

```text
backend/
  src/
    modules/
      auth/
      workspaces/
      documents/
      generation/
      artifacts/
      diagrams/
      assistant/
      exports/
    common/
    database/
    queue/
    storage/
    ai/
```

## 8. Implementation Roadmap

### Phase 1: Foundation

- Set up frontend and backend projects.
- Add authentication.
- Add workspace CRUD.
- Add database schema.
- Add basic dashboard and workspace creation UI.

### Phase 2: Requirement Input

- Add file upload.
- Add manual requirement entry.
- Add document parsing.
- Add SDLC module selection.
- Add generation progress UI.

### Phase 3: AI Generation

- Add background job queue.
- Generate requirement analysis first.
- Add selected module generation.
- Save generated artifacts.
- Add retry for failed generation.

### Phase 4: Workspace Editing

- Build artifact editor.
- Add diagram rendering.
- Add review and verification statuses.
- Add save and update flows.

### Phase 5: AI Assistant

- Add assistant chat panel.
- Add artifact-aware prompts.
- Add preview before applying AI changes.
- Add regenerate section flow.

### Phase 6: Export System

- Export complete workspace.
- Export selected sections.
- Export diagrams as PNG and SVG.
- Add PDF, HTML, Markdown, and DOCX exports.

### Phase 7: Production Readiness

- Add role-based access if needed.
- Add monitoring and logs.
- Add input validation and file security.
- Add rate limiting.
- Add automated tests.
- Add deployment pipeline.

## 9. Minimum Viable Product

The MVP should include:

- User login
- Create workspace
- Upload or enter requirements
- Select SDLC sections
- Generate requirement analysis, diagrams, frontend plan, backend plan, and testing plan
- Edit generated artifacts
- Use AI assistant on one selected artifact
- Export complete workspace as PDF or Markdown

## 10. Suggested First Version Scope

To build quickly, start with these SDLC outputs:

- Project overview
- Functional requirements
- Non-functional requirements
- Use cases
- Process flow diagram
- ER diagram
- Frontend plan
- Backend plan
- API plan
- Testing plan

Then add advanced diagrams, team collaboration, version history, and third-party integrations later.
