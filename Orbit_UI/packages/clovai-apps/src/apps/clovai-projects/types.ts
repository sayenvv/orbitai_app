import type { SdlcModuleId } from "./sdlc-modules";

export type ArtifactReviewStatus =
  | "draft"
  | "ai-generated"
  | "edited"
  | "needs-review"
  | "reviewed"
  | "verified";

export type GenerationStatus = "idle" | "uploading" | "processing" | "completed" | "failed";

export type OutputStyle = "university" | "professional" | "technical" | "executive";

export type SdlcArtifact = {
  moduleId: SdlcModuleId;
  title: string;
  content: string;
  diagramSource?: string;
  status: ArtifactReviewStatus;
  updatedAt: number;
};

export type ProjectWorkspace = {
  id: string;
  name: string;
  projectType: string;
  requirementsText: string;
  sourceFileName?: string | null;
  selectedModuleIds: SdlcModuleId[];
  outputStyle: OutputStyle;
  generationStatus: GenerationStatus;
  artifacts: SdlcArtifact[];
  createdAt: number;
  updatedAt: number;
};

export type ClovaiProjectsView = "home" | "new" | "processing" | "workspace";

export type RecentProjectWorkspace = {
  key: string;
  workspaceId: string;
  title: string;
  projectType: string;
  generationStatus: GenerationStatus;
  openedAt: number;
};

export type ProcessingStepId =
  | "upload"
  | "extract"
  | "analyze"
  | "gaps"
  | "generate"
  | "diagrams"
  | "prepare";

export type ProcessingStep = {
  id: ProcessingStepId;
  label: string;
};
