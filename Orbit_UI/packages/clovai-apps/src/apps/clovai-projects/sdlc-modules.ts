export type SdlcModuleId =
  | "overview"
  | "requirements"
  | "use-cases"
  | "process-flow"
  | "data-flow"
  | "er-diagram"
  | "architecture"
  | "frontend-plan"
  | "backend-plan"
  | "api-plan"
  | "database-plan"
  | "testing-plan"
  | "deployment-plan"
  | "export-center";

export type SdlcModuleKind = "document" | "diagram";

export type SdlcModuleDef = {
  id: SdlcModuleId;
  label: string;
  shortLabel: string;
  description: string;
  kind: SdlcModuleKind;
  sidebarGroup: "overview" | "analysis" | "diagrams" | "planning" | "delivery";
};

export const SDLC_MODULES: SdlcModuleDef[] = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Overview",
    description: "Project summary, scope, and generation status",
    kind: "document",
    sidebarGroup: "overview",
  },
  {
    id: "requirements",
    label: "Requirements",
    shortLabel: "Requirements",
    description: "Functional and non-functional requirements",
    kind: "document",
    sidebarGroup: "analysis",
  },
  {
    id: "use-cases",
    label: "Use Cases",
    shortLabel: "Use cases",
    description: "Actors, flows, and acceptance criteria",
    kind: "document",
    sidebarGroup: "analysis",
  },
  {
    id: "process-flow",
    label: "Process Flow",
    shortLabel: "Process",
    description: "Business process flow diagram",
    kind: "diagram",
    sidebarGroup: "diagrams",
  },
  {
    id: "data-flow",
    label: "Data Flow Diagram",
    shortLabel: "DFD",
    description: "Data movement between system components",
    kind: "diagram",
    sidebarGroup: "diagrams",
  },
  {
    id: "er-diagram",
    label: "ER Diagram",
    shortLabel: "ER",
    description: "Entities, relationships, and attributes",
    kind: "diagram",
    sidebarGroup: "diagrams",
  },
  {
    id: "architecture",
    label: "Architecture",
    shortLabel: "Architecture",
    description: "High-level system architecture and modules",
    kind: "document",
    sidebarGroup: "planning",
  },
  {
    id: "frontend-plan",
    label: "Frontend Plan",
    shortLabel: "Frontend",
    description: "Screens, components, and UI structure",
    kind: "document",
    sidebarGroup: "planning",
  },
  {
    id: "backend-plan",
    label: "Backend Plan",
    shortLabel: "Backend",
    description: "Services, modules, and responsibilities",
    kind: "document",
    sidebarGroup: "planning",
  },
  {
    id: "api-plan",
    label: "API Plan",
    shortLabel: "API",
    description: "Endpoints, payloads, and contracts",
    kind: "document",
    sidebarGroup: "planning",
  },
  {
    id: "database-plan",
    label: "Database Plan",
    shortLabel: "Database",
    description: "Schema, tables, and data rules",
    kind: "document",
    sidebarGroup: "planning",
  },
  {
    id: "testing-plan",
    label: "Testing Plan",
    shortLabel: "Testing",
    description: "Test strategy, cases, and coverage",
    kind: "document",
    sidebarGroup: "delivery",
  },
  {
    id: "deployment-plan",
    label: "Deployment Plan",
    shortLabel: "Deployment",
    description: "Environments, CI/CD, and rollout",
    kind: "document",
    sidebarGroup: "delivery",
  },
  {
    id: "export-center",
    label: "Export Center",
    shortLabel: "Export",
    description: "Export sections and diagrams",
    kind: "document",
    sidebarGroup: "delivery",
  },
];

export type SdlcSelectionPresetId =
  | "full"
  | "requirements"
  | "design"
  | "diagrams"
  | "frontend"
  | "backend"
  | "testing-deployment"
  | "custom";

export type SdlcSelectionPreset = {
  id: SdlcSelectionPresetId;
  label: string;
  description: string;
  moduleIds: SdlcModuleId[];
};

const allGeneratableIds = SDLC_MODULES.map((m) => m.id).filter(
  (id): id is SdlcModuleId => id !== "overview" && id !== "export-center",
);

export const SDLC_SELECTION_PRESETS: SdlcSelectionPreset[] = [
  {
    id: "full",
    label: "Full SDLC",
    description: "Generate the complete planning workspace",
    moduleIds: allGeneratableIds,
  },
  {
    id: "requirements",
    label: "Requirement analysis",
    description: "Requirements, use cases, and overview context",
    moduleIds: ["requirements", "use-cases"],
  },
  {
    id: "design",
    label: "Design documentation",
    description: "Architecture and structural design artifacts",
    moduleIds: ["architecture", "frontend-plan", "backend-plan"],
  },
  {
    id: "diagrams",
    label: "Diagrams only",
    description: "Process, data flow, and ER diagrams",
    moduleIds: ["process-flow", "data-flow", "er-diagram"],
  },
  {
    id: "frontend",
    label: "Frontend planning",
    description: "UI structure and frontend implementation plan",
    moduleIds: ["frontend-plan", "requirements"],
  },
  {
    id: "backend",
    label: "Backend planning",
    description: "Backend modules, APIs, and database design",
    moduleIds: ["backend-plan", "api-plan", "database-plan"],
  },
  {
    id: "testing-deployment",
    label: "Testing & deployment",
    description: "QA strategy and deployment planning",
    moduleIds: ["testing-plan", "deployment-plan"],
  },
  {
    id: "custom",
    label: "Custom selection",
    description: "Pick individual SDLC sections below",
    moduleIds: [],
  },
];

export function getSdlcModule(id: SdlcModuleId): SdlcModuleDef | undefined {
  return SDLC_MODULES.find((m) => m.id === id);
}

export function resolvePresetModules(presetId: SdlcSelectionPresetId, customIds: SdlcModuleId[]): SdlcModuleId[] {
  if (presetId === "custom") {
    return customIds.length > 0 ? customIds : ["requirements", "architecture"];
  }
  const preset = SDLC_SELECTION_PRESETS.find((p) => p.id === presetId);
  return preset?.moduleIds ?? allGeneratableIds;
}
