import {
  Boxes,
  Calendar,
  ClipboardList,
  FileText,
  GitBranch,
  Layers,
  Lightbulb,
  Network,
  Shield,
  Target,
  TestTube,
  Users,
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
  label: string;
  icon: LucideIcon;
  summary: string;
  deliverables: SynopsisDeliverable[];
};

function deliverable(
  sectionId: string,
  label: string,
  format: SynopsisDeliverableFormat,
  description: string,
): SynopsisDeliverable {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return { id: `${sectionId}--${slug}`, label, format, description };
}

/** Core sections every project synopsis should cover. */
export const PROJECT_SYNOPSIS_SECTIONS: SynopsisSection[] = [
  {
    id: "overview",
    label: "Executive Overview",
    icon: FileText,
    summary: "One-page summary of what the project is, why it exists, and what success looks like.",
    deliverables: [
      deliverable("overview", "Project Summary", "document", "Concise narrative of the initiative."),
      deliverable("overview", "Vision & Goals", "document", "North-star outcomes and measurable objectives."),
      deliverable("overview", "Success Metrics", "matrix", "KPIs, targets, and acceptance criteria."),
      deliverable("overview", "Elevator Pitch", "document", "Short stakeholder-facing description."),
    ],
  },
  {
    id: "problem",
    label: "Problem & Opportunity",
    icon: Lightbulb,
    summary: "Context for the problem space, users affected, and the opportunity being pursued.",
    deliverables: [
      deliverable("problem", "Problem Statement", "document", "Clear articulation of the pain or gap."),
      deliverable("problem", "Opportunity Analysis", "document", "Market or organizational opportunity."),
      deliverable("problem", "SWOT Analysis", "matrix", "Strengths, weaknesses, opportunities, threats."),
      deliverable("problem", "Feasibility Notes", "document", "High-level viability and constraints."),
    ],
  },
  {
    id: "scope",
    label: "Scope & Constraints",
    icon: Target,
    summary: "What is in and out of scope, plus assumptions that shape delivery.",
    deliverables: [
      deliverable("scope", "Scope Diagram", "diagram", "Visual in-scope vs out-of-scope boundaries."),
      deliverable("scope", "In / Out of Scope", "document", "Explicit scope lists."),
      deliverable("scope", "Assumptions", "document", "Working assumptions the plan depends on."),
      deliverable("scope", "Constraints", "document", "Budget, timeline, regulatory, or technical limits."),
    ],
  },
  {
    id: "stakeholders",
    label: "Stakeholders & Users",
    icon: Users,
    summary: "Who is involved, who benefits, and how responsibilities are divided.",
    deliverables: [
      deliverable("stakeholders", "Stakeholder Map", "diagram", "Influence and interest mapping."),
      deliverable("stakeholders", "User Personas", "document", "Primary and secondary user profiles."),
      deliverable("stakeholders", "RACI Matrix", "matrix", "Responsible, accountable, consulted, informed."),
      deliverable("stakeholders", "Communication Plan", "document", "Cadence and channels for updates."),
    ],
  },
  {
    id: "requirements",
    label: "Requirements",
    icon: ClipboardList,
    summary: "Functional and non-functional needs that the solution must satisfy.",
    deliverables: [
      deliverable("requirements", "Functional Requirements", "document", "Capabilities the system must provide."),
      deliverable("requirements", "Non-Functional Requirements", "document", "Performance, scale, reliability, UX."),
      deliverable("requirements", "Use Case Diagram", "diagram", "Actors and primary system interactions."),
      deliverable("requirements", "User Story Map", "document", "Prioritized user journeys and backlog slices."),
    ],
  },
  {
    id: "architecture",
    label: "Solution Architecture",
    icon: Boxes,
    summary: "High-level technical shape of the solution and major components.",
    deliverables: [
      deliverable("architecture", "High-Level Architecture", "diagram", "System context and major subsystems."),
      deliverable("architecture", "Component Diagram", "diagram", "Services, modules, and dependencies."),
      deliverable("architecture", "Technology Stack", "document", "Languages, frameworks, infra choices."),
      deliverable("architecture", "Deployment Overview", "diagram", "Runtime environments and hosting model."),
    ],
  },
  {
    id: "experience",
    label: "Experience & Process",
    icon: Workflow,
    summary: "How users move through the product and how key business processes flow.",
    deliverables: [
      deliverable("experience", "User Journey Map", "diagram", "End-to-end user experience stages."),
      deliverable("experience", "User Flow", "diagram", "Screen or step-level navigation paths."),
      deliverable("experience", "Process Flow", "diagram", "Core business or operational workflows."),
      deliverable("experience", "Information Architecture", "document", "Content structure and navigation model."),
    ],
  },
  {
    id: "data",
    label: "Data & Integrations",
    icon: Network,
    summary: "Data model, movement, and connections to external systems.",
    deliverables: [
      deliverable("data", "Entity Relationship Diagram", "diagram", "Core entities and relationships."),
      deliverable("data", "Data Flow Diagram", "diagram", "How data moves between components."),
      deliverable("data", "API Overview", "document", "Key endpoints, contracts, and consumers."),
      deliverable("data", "Integration Map", "diagram", "Third-party systems and event flows."),
    ],
  },
  {
    id: "security",
    label: "Security & Compliance",
    icon: Shield,
    summary: "Trust boundaries, access control, and risk posture for the solution.",
    deliverables: [
      deliverable("security", "Authentication Flow", "diagram", "Sign-in, session, and identity lifecycle."),
      deliverable("security", "Authorization Model", "diagram", "Roles, permissions, and policy enforcement."),
      deliverable("security", "Threat Model Summary", "document", "Top threats and mitigations."),
      deliverable("security", "Compliance Notes", "document", "Regulatory or policy requirements."),
    ],
  },
  {
    id: "delivery",
    label: "Delivery & Roadmap",
    icon: Calendar,
    summary: "How the work will be phased, scheduled, and released.",
    deliverables: [
      deliverable("delivery", "Roadmap Diagram", "diagram", "Phases, themes, and milestone timeline."),
      deliverable("delivery", "Work Breakdown Structure", "diagram", "Hierarchy of deliverables and work packages."),
      deliverable("delivery", "Milestone Plan", "document", "Key dates, gates, and release points."),
      deliverable("delivery", "Resource Overview", "document", "Team roles and capacity assumptions."),
    ],
  },
  {
    id: "quality",
    label: "Risks & Quality",
    icon: TestTube,
    summary: "Delivery risks, dependencies, and how quality will be validated.",
    deliverables: [
      deliverable("quality", "Risk Matrix", "matrix", "Likelihood vs impact with mitigations."),
      deliverable("quality", "Dependency Diagram", "diagram", "Cross-team or external dependencies."),
      deliverable("quality", "Test Strategy", "document", "Testing levels, coverage, and environments."),
      deliverable("quality", "Traceability Matrix", "matrix", "Requirements mapped to tests and deliverables."),
    ],
  },
  {
    id: "devops",
    label: "Operations & DevOps",
    icon: GitBranch,
    summary: "How the system is built, deployed, monitored, and operated.",
    deliverables: [
      deliverable("devops", "CI/CD Pipeline", "diagram", "Build, test, and release automation flow."),
      deliverable("devops", "Environment Diagram", "diagram", "Dev, staging, production topology."),
      deliverable("devops", "Monitoring Architecture", "diagram", "Observability, alerts, and logging."),
      deliverable("devops", "Runbook Outline", "document", "Operational procedures and on-call expectations."),
    ],
  },
  {
    id: "diagrams",
    label: "Diagram Appendix",
    icon: Layers,
    summary: "Consolidated gallery of all diagrams referenced across the synopsis.",
    deliverables: [
      deliverable("diagrams", "Architecture Gallery", "diagram", "All architecture and system diagrams."),
      deliverable("diagrams", "Process Gallery", "diagram", "User, business, and workflow diagrams."),
      deliverable("diagrams", "Data Gallery", "diagram", "ERD, data flow, and integration diagrams."),
      deliverable("diagrams", "Delivery Gallery", "diagram", "Roadmap, WBS, and dependency visuals."),
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
  return PROJECT_SYNOPSIS_SECTIONS[0]?.id ?? "overview";
}

export const SYNOPSIS_DELIVERABLE_COUNT = PROJECT_SYNOPSIS_SECTIONS.reduce(
  (count, section) => count + section.deliverables.length,
  0,
);
