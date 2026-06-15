/** Starter Mermaid definitions for diagram sections in the 22-section proposal. */

export function sanitizeMermaidLabel(text: string, max = 48): string {
  return (
    text
      .trim()
      .slice(0, max)
      .replace(/["#'\[\]{}()]/g, "")
      .replace(/\n/g, " ")
      .trim() || "Project"
  );
}

const DEFAULT_DIAGRAM = `flowchart LR
  brief[Project brief] --> plan[Proposal plan]
  plan --> diagram[Mermaid diagram]`;

const DIAGRAM_TEMPLATES: Record<string, (project: string) => string> = {
  "system-architecture": (project) => `flowchart TB
  subgraph clients [Clients]
    web[Web app]
    mobile[Mobile app]
  end
  subgraph platform [${project}]
    api[API layer]
    services[Core services]
    workers[Background jobs]
  end
  subgraph data [Data]
    db[(Primary database)]
    cache[(Cache)]
    storage[(Object storage)]
  end
  web --> api
  mobile --> api
  api --> services
  services --> db
  services --> cache
  workers --> db
  services --> storage`,

  "database-design": (project) => `erDiagram
  USER ||--o{ PROJECT : owns
  PROJECT ||--o{ MODULE : contains
  MODULE ||--o{ RECORD : stores
  USER {
    string id PK
    string email
    string role
  }
  PROJECT {
    string id PK
    string name
    string status
  }
  MODULE {
    string id PK
    string title
    string type
  }
  RECORD {
    string id PK
    string payload
    datetime created_at
  }`,

  "uml-diagrams": (project) => `flowchart TB
  subgraph usecase [Use Case]
    user((User))
    admin((Admin))
    system[${project}]
    user -->|Primary workflow| system
    admin -->|Manage configuration| system
  end
  subgraph sequence [Sequence]
    seq1[Request] --> seq2[Validate]
    seq2 --> seq3[Process]
    seq3 --> seq4[Respond]
  end
  subgraph activity [Activity]
    act1[Start] --> act2{Valid input?}
    act2 -->|Yes| act3[Execute]
    act2 -->|No| act4[Reject]
    act3 --> act5[End]
    act4 --> act5
  end`,

  "project-timeline": (project) => `gantt
  title ${project} — development timeline
  dateFormat YYYY-MM-DD
  section Planning
  Requirements & proposal   :a1, 2026-01-01, 21d
  section Development
  Core modules              :a2, after a1, 35d
  Integration & testing     :a3, after a2, 28d
  section Delivery
  Deployment & documentation :a4, after a3, 14d`,

  "doc-architecture": (project) => `flowchart TB
  subgraph clients [Clients]
    ui[Web / mobile UI]
  end
  subgraph services [${project}]
    api[API layer]
    core[Core services]
    jobs[Workers]
  end
  subgraph data [Data stores]
    db[(Database)]
    cache[(Cache)]
  end
  ui --> api --> core
  core --> db
  core --> cache
  jobs --> db`,

  "doc-database": (project) => `erDiagram
  ACCOUNT ||--o{ USER : has
  USER ||--o{ SESSION : owns
  PROJECT ||--o{ ARTIFACT : contains
  ACCOUNT {
    string id PK
    string name
  }
  USER {
    string id PK
    string email
  }
  PROJECT {
    string id PK
    string title
  }`,
};

export function getPlanDiagramSource(sectionId: string, projectPrompt: string): string {
  const project = sanitizeMermaidLabel(projectPrompt);
  const template = DIAGRAM_TEMPLATES[sectionId];
  return template ? template(project) : DEFAULT_DIAGRAM;
}
