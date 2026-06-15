import {
  BookOpen,
  Boxes,
  Calendar,
  ClipboardList,
  Cpu,
  Database,
  FileText,
  GitBranch,
  HardDrive,
  Layers,
  Lightbulb,
  ListChecks,
  Monitor,
  Network,
  ScrollText,
  Sparkles,
  Target,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type SynopsisDeliverableFormat = "document" | "diagram" | "matrix";

export type SynopsisDeliverable = {
  id: string;
  label: string;
  format: SynopsisDeliverableFormat;
  description: string;
};

export type SynopsisSection = {
  id: string;
  number: number;
  label: string;
  description: string;
  icon: LucideIcon;
  deliverables: [SynopsisDeliverable];
  /** User-added section appended after the standard 22-section structure. */
  custom?: boolean;
};

function sectionDeliverable(
  sectionId: string,
  label: string,
  format: SynopsisDeliverableFormat,
  description: string,
): SynopsisDeliverable {
  return { id: sectionId, label, format, description };
}

/** Standard 22-section academic project proposal structure (PDF table of contents). */
export const PROJECT_SYNOPSIS_SECTIONS: SynopsisSection[] = [
  {
    id: "title",
    number: 1,
    label: "Title of the Project",
    description: "A clear and meaningful project title.",
    icon: FileText,
    deliverables: [
      sectionDeliverable("title", "Title of the Project", "document", "A clear and meaningful project title."),
    ],
  },
  {
    id: "introduction",
    number: 2,
    label: "Introduction",
    description: "Brief overview of the project domain and background.",
    icon: ScrollText,
    deliverables: [
      sectionDeliverable("introduction", "Introduction", "document", "Brief overview of the project domain and background."),
    ],
  },
  {
    id: "problem-statement",
    number: 3,
    label: "Problem Statement",
    description: "The specific problem the project aims to solve.",
    icon: Lightbulb,
    deliverables: [
      sectionDeliverable("problem-statement", "Problem Statement", "document", "The specific problem the project aims to solve."),
    ],
  },
  {
    id: "objectives",
    number: 4,
    label: "Objectives",
    description: "Main goals and expected outcomes of the project.",
    icon: Target,
    deliverables: [
      sectionDeliverable("objectives", "Objectives", "document", "Main goals and expected outcomes of the project."),
    ],
  },
  {
    id: "existing-system",
    number: 5,
    label: "Existing System",
    description: "Description of current solutions and their limitations.",
    icon: Monitor,
    deliverables: [
      sectionDeliverable("existing-system", "Existing System", "document", "Description of current solutions and their limitations."),
    ],
  },
  {
    id: "proposed-system",
    number: 6,
    label: "Proposed System",
    description: "Explanation of your proposed solution and its advantages.",
    icon: Layers,
    deliverables: [
      sectionDeliverable("proposed-system", "Proposed System", "document", "Explanation of your proposed solution and its advantages."),
    ],
  },
  {
    id: "scope",
    number: 7,
    label: "Scope of the Project",
    description: "What is included and excluded from the project.",
    icon: ListChecks,
    deliverables: [
      sectionDeliverable("scope", "Scope of the Project", "document", "What is included and excluded from the project."),
    ],
  },
  {
    id: "literature-survey",
    number: 8,
    label: "Literature Survey",
    description: "Summary of related research papers or existing technologies.",
    icon: BookOpen,
    deliverables: [
      sectionDeliverable("literature-survey", "Literature Survey", "document", "Summary of related research papers or existing technologies."),
    ],
  },
  {
    id: "methodology",
    number: 9,
    label: "Methodology",
    description: "Development approach, workflow, algorithms, and process.",
    icon: Workflow,
    deliverables: [
      sectionDeliverable("methodology", "Methodology", "document", "Development approach, workflow, algorithms, and process."),
    ],
  },
  {
    id: "system-architecture",
    number: 10,
    label: "System Architecture",
    description: "High-level architecture diagram and component interactions.",
    icon: Boxes,
    deliverables: [
      sectionDeliverable("system-architecture", "System Architecture", "diagram", "High-level architecture diagram and component interactions."),
    ],
  },
  {
    id: "technologies-used",
    number: 11,
    label: "Technologies Used",
    description: "Programming languages, frameworks, databases, cloud services, APIs, etc.",
    icon: Network,
    deliverables: [
      sectionDeliverable("technologies-used", "Technologies Used", "matrix", "Programming languages, frameworks, databases, cloud services, APIs, etc."),
    ],
  },
  {
    id: "hardware-requirements",
    number: 12,
    label: "Hardware Requirements",
    description: "Processor, RAM, storage, and other hardware needs.",
    icon: HardDrive,
    deliverables: [
      sectionDeliverable("hardware-requirements", "Hardware Requirements", "matrix", "Processor, RAM, storage, and other hardware needs."),
    ],
  },
  {
    id: "software-requirements",
    number: 13,
    label: "Software Requirements",
    description: "Operating system, IDE, libraries, frameworks, and tools.",
    icon: Cpu,
    deliverables: [
      sectionDeliverable("software-requirements", "Software Requirements", "matrix", "Operating system, IDE, libraries, frameworks, and tools."),
    ],
  },
  {
    id: "modules-description",
    number: 14,
    label: "Modules Description",
    description: "Breakdown of the project into functional modules.",
    icon: ClipboardList,
    deliverables: [
      sectionDeliverable("modules-description", "Modules Description", "document", "Breakdown of the project into functional modules."),
    ],
  },
  {
    id: "database-design",
    number: 15,
    label: "Database Design",
    description: "ER diagram, tables, and relationships (if applicable).",
    icon: Database,
    deliverables: [
      sectionDeliverable("database-design", "Database Design", "diagram", "ER diagram, tables, and relationships (if applicable)."),
    ],
  },
  {
    id: "uml-diagrams",
    number: 16,
    label: "UML Diagrams",
    description: "Use Case, Class, Sequence, Activity, and other relevant diagrams.",
    icon: GitBranch,
    deliverables: [
      sectionDeliverable("uml-diagrams", "UML Diagrams", "diagram", "Use Case, Class, Sequence, Activity, and other relevant diagrams."),
    ],
  },
  {
    id: "project-timeline",
    number: 17,
    label: "Project Timeline",
    description: "Development schedule (Gantt chart or milestone plan).",
    icon: Calendar,
    deliverables: [
      sectionDeliverable("project-timeline", "Project Timeline", "diagram", "Development schedule (Gantt chart or milestone plan)."),
    ],
  },
  {
    id: "expected-results",
    number: 18,
    label: "Expected Results",
    description: "Anticipated output and benefits of the project.",
    icon: Target,
    deliverables: [
      sectionDeliverable("expected-results", "Expected Results", "document", "Anticipated output and benefits of the project."),
    ],
  },
  {
    id: "future-enhancements",
    number: 19,
    label: "Future Enhancements",
    description: "Features that can be added later.",
    icon: Sparkles,
    deliverables: [
      sectionDeliverable("future-enhancements", "Future Enhancements", "document", "Features that can be added later."),
    ],
  },
  {
    id: "applications",
    number: 20,
    label: "Applications",
    description: "Real-world use cases of the project.",
    icon: Layers,
    deliverables: [
      sectionDeliverable("applications", "Applications", "document", "Real-world use cases of the project."),
    ],
  },
  {
    id: "conclusion",
    number: 21,
    label: "Conclusion",
    description: "Brief summary of the project proposal.",
    icon: FileText,
    deliverables: [
      sectionDeliverable("conclusion", "Conclusion", "document", "Brief summary of the project proposal."),
    ],
  },
  {
    id: "references",
    number: 22,
    label: "References",
    description: "Books, journals, research papers, and websites used.",
    icon: BookOpen,
    deliverables: [
      sectionDeliverable("references", "References", "document", "Books, journals, research papers, and websites used."),
    ],
  },
];

export const PLAN_STARTER_TEMPLATES = [
  {
    id: "saas",
    title: "SaaS product",
    subtitle: "Multi-tenant web app with billing",
    prompt:
      "Plan a B2B SaaS analytics platform with multi-tenant architecture, Stripe billing, role-based access, and a React dashboard.",
  },
  {
    id: "internal",
    title: "Internal tool",
    subtitle: "Workflow automation for teams",
    prompt:
      "Plan an internal operations portal that automates approval workflows, integrates with Slack, and provides audit trails.",
  },
  {
    id: "mobile",
    title: "Mobile app",
    subtitle: "Cross-platform consumer experience",
    prompt:
      "Plan a cross-platform fitness mobile app with offline mode, wearable integrations, and personalized coaching.",
  },
  {
    id: "ai",
    title: "AI platform",
    subtitle: "Agents, RAG, and tooling",
    prompt:
      "Plan an AI agent platform with RAG pipelines, multi-agent orchestration, MCP tool integrations, and evaluation workflows.",
  },
] as const;

export function getSynopsisSection(id: string): SynopsisSection | undefined {
  return PROJECT_SYNOPSIS_SECTIONS.find((section) => section.id === id);
}

export function getDefaultSynopsisSectionId(): string {
  return PROJECT_SYNOPSIS_SECTIONS[0]?.id ?? "title";
}

export function getSectionDeliverable(section: SynopsisSection): SynopsisDeliverable {
  return section.deliverables[0];
}

export const SYNOPSIS_SECTION_COUNT = PROJECT_SYNOPSIS_SECTIONS.length;

export const SYNOPSIS_DELIVERABLE_COUNT = PROJECT_SYNOPSIS_SECTIONS.length;
