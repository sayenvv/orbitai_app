import {
  BookOpen,
  Code2,
  Database,
  FileCode2,
  FileText,
  LifeBuoy,
  Rocket,
  Server,
  Settings,
  Users,
} from "lucide-react";

import type { SynopsisDeliverable, SynopsisSection } from "@/lib/plan-synopsis-catalog";

function sectionDeliverable(
  sectionId: string,
  label: string,
  format: SynopsisDeliverable["format"],
  description: string,
): SynopsisDeliverable {
  return { id: sectionId, label, format, description };
}

/** Project documentation generated alongside the synopsis from the same initial brief. */
export const PROJECT_DOCUMENTATION_SECTIONS: SynopsisSection[] = [
  {
    id: "doc-readme",
    number: 1,
    label: "README",
    description: "Project overview, quick start, and repository orientation.",
    icon: FileText,
    deliverables: [
      sectionDeliverable("doc-readme", "README", "document", "Project overview, quick start, and repository orientation."),
    ],
  },
  {
    id: "doc-technical-overview",
    number: 2,
    label: "Technical Overview",
    description: "High-level technical summary for engineers and stakeholders.",
    icon: BookOpen,
    deliverables: [
      sectionDeliverable(
        "doc-technical-overview",
        "Technical Overview",
        "document",
        "High-level technical summary for engineers and stakeholders.",
      ),
    ],
  },
  {
    id: "doc-architecture",
    number: 3,
    label: "Architecture Documentation",
    description: "Components, services, data flows, and integration boundaries.",
    icon: Server,
    deliverables: [
      sectionDeliverable(
        "doc-architecture",
        "Architecture Documentation",
        "diagram",
        "Components, services, data flows, and integration boundaries.",
      ),
    ],
  },
  {
    id: "doc-api",
    number: 4,
    label: "API Documentation",
    description: "Endpoints, request/response contracts, auth, and error handling.",
    icon: Code2,
    deliverables: [
      sectionDeliverable(
        "doc-api",
        "API Documentation",
        "document",
        "Endpoints, request/response contracts, auth, and error handling.",
      ),
    ],
  },
  {
    id: "doc-database",
    number: 5,
    label: "Database Documentation",
    description: "Schema, entities, relationships, migrations, and indexing notes.",
    icon: Database,
    deliverables: [
      sectionDeliverable(
        "doc-database",
        "Database Documentation",
        "diagram",
        "Schema, entities, relationships, migrations, and indexing notes.",
      ),
    ],
  },
  {
    id: "doc-setup",
    number: 6,
    label: "Setup & Installation",
    description: "Prerequisites, environment variables, and local development steps.",
    icon: Settings,
    deliverables: [
      sectionDeliverable(
        "doc-setup",
        "Setup & Installation",
        "document",
        "Prerequisites, environment variables, and local development steps.",
      ),
    ],
  },
  {
    id: "doc-user-guide",
    number: 7,
    label: "User Guide",
    description: "End-user workflows, screens, and how to accomplish key tasks.",
    icon: Users,
    deliverables: [
      sectionDeliverable(
        "doc-user-guide",
        "User Guide",
        "document",
        "End-user workflows, screens, and how to accomplish key tasks.",
      ),
    ],
  },
  {
    id: "doc-developer-guide",
    number: 8,
    label: "Developer Guide",
    description: "Code structure, conventions, testing, and contribution workflow.",
    icon: FileCode2,
    deliverables: [
      sectionDeliverable(
        "doc-developer-guide",
        "Developer Guide",
        "document",
        "Code structure, conventions, testing, and contribution workflow.",
      ),
    ],
  },
  {
    id: "doc-deployment",
    number: 9,
    label: "Deployment Guide",
    description: "Build, release, hosting, CI/CD, and production operations.",
    icon: Rocket,
    deliverables: [
      sectionDeliverable(
        "doc-deployment",
        "Deployment Guide",
        "document",
        "Build, release, hosting, CI/CD, and production operations.",
      ),
    ],
  },
  {
    id: "doc-troubleshooting",
    number: 10,
    label: "Troubleshooting & FAQ",
    description: "Common issues, diagnostics, and frequently asked questions.",
    icon: LifeBuoy,
    deliverables: [
      sectionDeliverable(
        "doc-troubleshooting",
        "Troubleshooting & FAQ",
        "document",
        "Common issues, diagnostics, and frequently asked questions.",
      ),
    ],
  },
];

export const DOCUMENTATION_SECTION_COUNT = PROJECT_DOCUMENTATION_SECTIONS.length;
