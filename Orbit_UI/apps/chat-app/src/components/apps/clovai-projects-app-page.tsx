"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClovaiProjectsApp,
  CLOVAI_PROJECTS_PROCESSING_STEPS,
  buildDemoArtifacts,
  getAppHelpHref,
  getAppWorkspaceHref,
  resolvePresetModules,
  type CatalogApp,
  type ClovaiProjectsView,
  type OutputStyle,
  type ProjectWorkspace,
  type RecentProjectWorkspace,
  type SdlcModuleId,
  type SdlcSelectionPresetId,
} from "@orbit/clovai-apps";
import { useAppShell } from "@/components/layout/app-shell-context";
import {
  buildProjectWorkspaceHref,
  formatRecentProjectTime,
  getProjectWorkspace,
  readProjectWorkspaces,
  readRecentProjectWorkspaces,
  recordRecentProjectWorkspace,
  saveProjectWorkspaces,
  upsertProjectWorkspace,
} from "@/lib/clovai-projects-workspaces";

const PROCESSING_STEP_MS = 650;

function createWorkspaceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ws-${Date.now()}`;
}

export function ClovaiProjectsAppPage({ app }: { app: CatalogApp }) {
  const workspaceHref = getAppWorkspaceHref(app);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeader } = useAppShell();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const workspaceIdParam = searchParams.get("workspaceId");

  const [workspaces, setWorkspaces] = useState<ProjectWorkspace[]>([]);
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentProjectWorkspace[]>([]);
  const [activeView, setActiveView] = useState<ClovaiProjectsView>("home");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(workspaceIdParam);
  const [selectedArtifactId, setSelectedArtifactId] = useState<SdlcModuleId | null>("overview");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "processing" | "completed" | "failed">("all");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const [draftName, setDraftName] = useState("");
  const [draftRequirements, setDraftRequirements] = useState("");
  const [draftProjectType, setDraftProjectType] = useState("Web application");
  const [draftPreset, setDraftPreset] = useState<SdlcSelectionPresetId>("full");
  const [draftCustomModules, setDraftCustomModules] = useState<SdlcModuleId[]>([]);
  const [draftOutputStyle, setDraftOutputStyle] = useState<OutputStyle>("professional");
  const [draftFileName, setDraftFileName] = useState<string | null>(null);
  const [draftUploadState, setDraftUploadState] = useState<
    "empty" | "selected" | "uploading" | "failed" | "uploaded"
  >("empty");
  const [draftUploadError, setDraftUploadError] = useState<string | null>(null);
  const [generationStarting, setGenerationStarting] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  useEffect(() => {
    setWorkspaces(readProjectWorkspaces());
    setRecentWorkspaces(readRecentProjectWorkspaces());
  }, []);

  useEffect(() => {
    setHeader({ title: app.name, subtitle: app.tagline });
    return () => setHeader(null);
  }, [app.name, app.tagline, setHeader]);

  useEffect(() => {
    if (workspaceIdParam) {
      setActiveWorkspaceId(workspaceIdParam);
      const existing = getProjectWorkspace(workspaceIdParam);
      if (existing?.generationStatus === "completed") {
        setActiveView("workspace");
        setSelectedArtifactId("overview");
      }
    }
  }, [workspaceIdParam]);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  );

  const persistWorkspaces = useCallback((next: ProjectWorkspace[]) => {
    setWorkspaces(next);
    saveProjectWorkspaces(next);
  }, []);

  const openWorkspace = useCallback(
    (id: string) => {
      const workspace = workspaces.find((w) => w.id === id) ?? getProjectWorkspace(id);
      if (!workspace) return;
      setActiveWorkspaceId(id);
      setSelectedArtifactId("overview");
      setActiveView(workspace.generationStatus === "completed" ? "workspace" : "home");
      recordRecentProjectWorkspace({
        workspaceId: id,
        title: workspace.name,
        projectType: workspace.projectType,
        generationStatus: workspace.generationStatus,
      });
      setRecentWorkspaces(readRecentProjectWorkspaces());
      router.replace(buildProjectWorkspaceHref(workspaceHref, id));
    },
    [workspaces, workspaceHref, router],
  );

  const updateActiveWorkspace = useCallback(
    (patch: Partial<ProjectWorkspace> | ((w: ProjectWorkspace) => ProjectWorkspace)) => {
      if (!activeWorkspaceId) return;
      const list = readProjectWorkspaces();
      const index = list.findIndex((w) => w.id === activeWorkspaceId);
      if (index < 0) return;
      const current = list[index];
      const nextWorkspace = typeof patch === "function" ? patch(current) : { ...current, ...patch };
      list[index] = { ...nextWorkspace, updatedAt: Date.now() };
      persistWorkspaces(list);
      upsertProjectWorkspace(list[index]);
    },
    [activeWorkspaceId, persistWorkspaces],
  );

  const simulateProcessing = useCallback(
    async (workspace: ProjectWorkspace, moduleIds: SdlcModuleId[]) => {
      setActiveView("processing");
      setProcessingProgress(0);
      const steps = CLOVAI_PROJECTS_PROCESSING_STEPS;
      for (let i = 0; i < steps.length; i++) {
        setProcessingMessage(steps[i].label);
        await new Promise((r) => setTimeout(r, PROCESSING_STEP_MS));
        setProcessingProgress(Math.round(((i + 1) / steps.length) * 100));
      }
      const artifacts = buildDemoArtifacts(
        moduleIds,
        workspace.name,
        workspace.requirementsText,
        workspace.outputStyle,
      );
      const completed: ProjectWorkspace = {
        ...workspace,
        generationStatus: "completed",
        artifacts,
        updatedAt: Date.now(),
      };
      upsertProjectWorkspace(completed);
      persistWorkspaces(
        readProjectWorkspaces().map((w) => (w.id === completed.id ? completed : w)),
      );
      setActiveWorkspaceId(completed.id);
      setSelectedArtifactId("overview");
      setActiveView("workspace");
      setProcessingMessage(null);
      router.replace(buildProjectWorkspaceHref(workspaceHref, completed.id));
    },
    [persistWorkspaces, router, workspaceHref],
  );

  const handleStartGeneration = useCallback(async () => {
    const name = draftName.trim() || "Untitled workspace";
    const requirements =
      draftRequirements.trim() ||
      (draftFileName ? `Requirements imported from ${draftFileName}.` : "");
    if (!requirements.trim()) return;

    setGenerationStarting(true);
    const moduleIds = resolvePresetModules(draftPreset, draftCustomModules);
    const id = createWorkspaceId();
    const now = Date.now();
    const workspace: ProjectWorkspace = {
      id,
      name,
      projectType: draftProjectType.trim() || "General",
      requirementsText: requirements,
      sourceFileName: draftFileName,
      selectedModuleIds: moduleIds,
      outputStyle: draftOutputStyle,
      generationStatus: "processing",
      artifacts: [],
      createdAt: now,
      updatedAt: now,
    };
    upsertProjectWorkspace(workspace);
    persistWorkspaces([workspace, ...readProjectWorkspaces().filter((w) => w.id !== id)]);
    setActiveWorkspaceId(id);
    setGenerationStarting(false);
    await simulateProcessing(workspace, moduleIds);
  }, [
    draftName,
    draftRequirements,
    draftFileName,
    draftProjectType,
    draftPreset,
    draftCustomModules,
    draftOutputStyle,
    persistWorkspaces,
    simulateProcessing,
  ]);

  const handlePickFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setDraftUploadError(null);
    setDraftUploadState("uploading");
    window.setTimeout(() => {
      setDraftFileName(file.name);
      setDraftUploadState("uploaded");
      if (!draftRequirements.trim()) {
        setDraftRequirements(`Uploaded file: ${file.name}\n\nDescribe extracted requirements here or edit after generation.`);
      }
    }, 500);
  }, [draftRequirements]);

  const handleSaveWorkspace = useCallback(() => {
    if (!activeWorkspace) return;
    setSaveState("saving");
    upsertProjectWorkspace(activeWorkspace);
    window.setTimeout(() => {
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
    }, 400);
  }, [activeWorkspace]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,text/plain,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      <ClovaiProjectsApp
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenWorkspace={openWorkspace}
        onOpenRecentWorkspace={(entry) => openWorkspace(entry.workspaceId)}
        recentWorkspaces={recentWorkspaces}
        formatRecentTime={formatRecentProjectTime}
        onOpenHelp={() => router.push(getAppHelpHref(app))}
        processingSteps={CLOVAI_PROJECTS_PROCESSING_STEPS}
        processingProgress={processingProgress}
        processingMessage={processingMessage}
        draftName={draftName}
        onDraftNameChange={setDraftName}
        draftRequirements={draftRequirements}
        onDraftRequirementsChange={setDraftRequirements}
        draftProjectType={draftProjectType}
        onDraftProjectTypeChange={setDraftProjectType}
        draftPreset={draftPreset}
        onDraftPresetChange={setDraftPreset}
        draftCustomModules={draftCustomModules}
        onDraftCustomModulesChange={setDraftCustomModules}
        draftOutputStyle={draftOutputStyle}
        onDraftOutputStyleChange={setDraftOutputStyle}
        draftFileName={draftFileName}
        draftUploadState={draftUploadState}
        draftUploadError={draftUploadError}
        onPickFile={handlePickFile}
        onStartGeneration={handleStartGeneration}
        generationStarting={generationStarting}
        selectedArtifactId={selectedArtifactId}
        onSelectArtifact={setSelectedArtifactId}
        onUpdateArtifactContent={(moduleId, content) => {
          updateActiveWorkspace((w) => ({
            ...w,
            artifacts: w.artifacts.map((a) =>
              a.moduleId === moduleId ? { ...a, content, status: "edited", updatedAt: Date.now() } : a,
            ),
          }));
        }}
        onUpdateArtifactDiagram={(moduleId, diagramSource) => {
          updateActiveWorkspace((w) => ({
            ...w,
            artifacts: w.artifacts.map((a) =>
              a.moduleId === moduleId ? { ...a, diagramSource, status: "edited", updatedAt: Date.now() } : a,
            ),
          }));
        }}
        onUpdateArtifactStatus={(moduleId, status) => {
          updateActiveWorkspace((w) => ({
            ...w,
            artifacts: w.artifacts.map((a) =>
              a.moduleId === moduleId ? { ...a, status, updatedAt: Date.now() } : a,
            ),
          }));
        }}
        onSaveWorkspace={handleSaveWorkspace}
        saveState={saveState}
        workspaceSearch={workspaceSearch}
        onWorkspaceSearchChange={setWorkspaceSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />
    </>
  );
}
