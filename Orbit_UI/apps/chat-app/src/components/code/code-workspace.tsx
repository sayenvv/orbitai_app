"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  FileCode2,
  GitBranch,
  X,
} from "lucide-react";
import { CodeEditor } from "@/components/code/code-editor";
import { IdeDeployModal, type DeployResult } from "@/components/code/ide-deploy-modal";
import { IdeFileMenu } from "@/components/code/ide-file-menu";
import { IdeBottomConsole, type IdeConsolePort } from "@/components/code/ide-bottom-console";
import {
  IDE_SIDEBAR_ICON_RAIL_WIDTH_PX,
  IdeCollapsibleSidebar,
} from "@/components/code/ide-collapsible-sidebar";
import {
  IdeLeftSidebar,
  LEFT_SIDEBAR_TABS,
  type LeftSidebarTab,
} from "@/components/code/ide-left-sidebar";
import { IdeResizableBottomPanel } from "@/components/code/ide-resizable-bottom-panel";
import { IdeResizablePanel } from "@/components/code/ide-resizable-panel";
import {
  IdeRightSidebar,
  RIGHT_SIDEBAR_TABS,
  type RightSidebarTab,
} from "@/components/code/ide-right-sidebar";
import { IdeStatusBar } from "@/components/code/ide-status-bar";
import { CODE_PROJECT_NAME, CODE_WORKSPACE_FILES } from "@/lib/code-workspace-demo";
import {
  addLocalNode,
  ancestorFolderIds,
  applyProjectState,
  buildInitialFileContents,
  buildLocalDemoProject,
  DEFAULT_UI_STATE,
  getActiveFile,
  getCreateParentId,
  inferLanguageForName,
  mapApiProject,
  nodesForPersistence,
  nodePath,
} from "@/lib/code-workspace-model";
import type {
  CodeWorkspaceFileContents,
  CodeWorkspaceNode,
  CodeWorkspaceProject,
  CodeWorkspaceUiState,
} from "@/lib/code-workspace-types";
import type { PrepareProjectSearch } from "@/components/code/ide-project-search";
import type { IdeCursorPosition } from "@/lib/ide-cursor";
import { useResizableHeight } from "@/hooks/use-resizable-height";
import { useResizableWidth } from "@/hooks/use-resizable-width";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useCodeWorkspacePreferences } from "@/hooks/use-code-workspace-preferences";
import { codeWorkspaceApi, getApiErrorMessage } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

function languageLabel(language: string): string {
  if (language === "typescript") return "TypeScript";
  if (language === "json") return "JSON";
  if (language === "markdown") return "Markdown";
  return language;
}

function breadcrumbSegments(path: string): string[] {
  return path ? path.split("/") : [];
}

export function CodeWorkspace() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { setHeader } = useAppShell();
  const { preferences, ready: preferencesReady } = useCodeWorkspacePreferences();
  const prefsAppliedRef = useRef(false);

  const [project, setProject] = useState<CodeWorkspaceProject | null>(null);
  const [fileContents, setFileContents] = useState<CodeWorkspaceFileContents>({});
  const [loading, setLoading] = useState(true);
  const [persisted, setPersisted] = useState(false);
  const skipSaveRef = useRef(true);
  const loadedFilesRef = useRef<Set<string>>(new Set());
  const fileSaveTimersRef = useRef<Record<string, number>>({});
  const previousProjectIdRef = useRef<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployOutput, setDeployOutput] = useState("");
  const [deployPorts, setDeployPorts] = useState<IdeConsolePort[]>([]);
  const [consolePreferredTab, setConsolePreferredTab] = useState<
    "terminal" | "debug" | "output" | "problems" | "ports" | undefined
  >(undefined);
  const [leftSidebarTab, setLeftSidebarTab] = useState<LeftSidebarTab>("files");
  const [rightSidebarTab, setRightSidebarTab] = useState<RightSidebarTab>("ask");
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [consoleMaximized, setConsoleMaximized] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);

  useEffect(() => {
    if (!preferencesReady || prefsAppliedRef.current) return;
    prefsAppliedRef.current = true;
    setConsoleOpen(preferences.terminalOpenOnLaunch);
    setRightSidebarCollapsed(!preferences.rightSidebarOpenOnLaunch);
  }, [
    preferences.rightSidebarOpenOnLaunch,
    preferences.terminalOpenOnLaunch,
    preferencesReady,
  ]);
  const [cursor, setCursor] = useState<IdeCursorPosition>({ line: 1, column: 1 });
  const [selectionChars, setSelectionChars] = useState(0);
  const [editorScrollTarget, setEditorScrollTarget] = useState<{
    fileId: string;
    line: number;
  } | null>(null);

  const leftPanel = useResizableWidth(240, 180, 480, "left");
  const rightPanel = useResizableWidth(320, 260, 560, "right");
  const leftSidebarWidth = leftSidebarCollapsed
    ? IDE_SIDEBAR_ICON_RAIL_WIDTH_PX
    : leftPanel.width;
  const rightSidebarWidth = rightSidebarCollapsed
    ? IDE_SIDEBAR_ICON_RAIL_WIDTH_PX
    : rightPanel.width;
  const consolePanel = useResizableHeight(180, 120, 420);
  const consoleMaxHeight = 420;

  const nodes = project?.state.nodes ?? [];
  const ui = project?.state.ui ?? DEFAULT_UI_STATE;
  const activeFile = useMemo(() => getActiveFile(nodes, ui.activeFileId), [nodes, ui.activeFileId]);
  const activeContent =
    ui.activeFileId && fileContents[ui.activeFileId] !== undefined
      ? fileContents[ui.activeFileId]
      : "";
  const isActiveFileContentReady =
    !ui.activeFileId || fileContents[ui.activeFileId] !== undefined;
  const activePath = activeFile ? nodePath(activeFile.id, nodes) : "";
  const lineCount = Math.max(activeContent.split("\n").length, 1);
  const crumbs = useMemo(() => breadcrumbSegments(activePath), [activePath]);
  const activeFileLabel = activeFile?.name;

  const allFileNodes = useMemo(
    () => nodes.filter((node) => node.kind === "file"),
    [nodes],
  );

  const updateUi = useCallback((updater: (current: CodeWorkspaceUiState) => CodeWorkspaceUiState) => {
    setProject((current) => {
      if (!current) return current;
      return applyProjectState(current, {
        ...current.state,
        ui: updater(current.state.ui),
      });
    });
  }, []);

  const fetchFileContent = useCallback(
    async (fileId: string, projectId: string, nodeList: CodeWorkspaceNode[]): Promise<string> => {
      const cached = fileContents[fileId];
      if (cached !== undefined) return cached;

      const fallbackPath = nodePath(fileId, nodeList);
      const fallback = CODE_WORKSPACE_FILES[fallbackPath]?.content ?? "";

      if (!persisted) {
        setFileContents((previous) =>
          previous[fileId] !== undefined ? previous : { ...previous, [fileId]: fallback },
        );
        loadedFilesRef.current.add(fileId);
        return fallback;
      }

      try {
        const result = await codeWorkspaceApi.getFileContent(projectId, fileId);
        const content = result.content || fallback;
        loadedFilesRef.current.add(fileId);
        setFileContents((previous) =>
          previous[fileId] !== undefined ? previous : { ...previous, [fileId]: content },
        );
        return content;
      } catch {
        loadedFilesRef.current.add(fileId);
        setFileContents((previous) =>
          previous[fileId] !== undefined ? previous : { ...previous, [fileId]: fallback },
        );
        return fallback;
      }
    },
    [fileContents, persisted],
  );

  const loadFileContent = useCallback(
    async (fileId: string, projectId: string, nodeList: CodeWorkspaceNode[]) => {
      if (loadedFilesRef.current.has(fileId) && fileContents[fileId] !== undefined) return;
      await fetchFileContent(fileId, projectId, nodeList);
    },
    [fetchFileContent, fileContents],
  );

  const prepareSearch = useCallback<PrepareProjectSearch>(async () => {
    if (!project) return fileContents;

    const merged: CodeWorkspaceFileContents = { ...fileContents };
    const fileNodes = nodes.filter((node) => node.kind === "file");

    await Promise.all(
      fileNodes.map(async (node) => {
        if (merged[node.id] !== undefined) return;
        merged[node.id] = await fetchFileContent(node.id, project.id, nodes);
      }),
    );

    return merged;
  }, [fetchFileContent, fileContents, nodes, project]);

  const applyRemoteProject = useCallback((next: CodeWorkspaceProject) => {
    skipSaveRef.current = true;
    setProject(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      setLoading(true);
      skipSaveRef.current = true;

      if (isAuthenticated && !preferencesReady) return;

      if (!isAuthenticated) {
        if (!cancelled) {
          const demo = buildLocalDemoProject();
          setProject(demo);
          setFileContents(buildInitialFileContents(demo.state.nodes));
          setPersisted(false);
          setLoading(false);
        }
        return;
      }

      try {
        if (projectIdParam) {
          const raw = await codeWorkspaceApi.getProject(projectIdParam);
          if (!cancelled) {
            applyRemoteProject(mapApiProject(raw));
            setPersisted(true);
          }
          return;
        }

        const list = await codeWorkspaceApi.listProjects();
        if (list.data.length > 0) {
          const raw = await codeWorkspaceApi.getProject(list.data[0].id);
          if (!cancelled) {
            applyRemoteProject(mapApiProject(raw));
            setPersisted(true);
          }
          return;
        }

        const created = await codeWorkspaceApi.createProject({
          title: CODE_PROJECT_NAME,
          seedDemo: preferences.seedDemoOnCreate,
        });
        if (!cancelled) {
          applyRemoteProject(mapApiProject(created));
          setPersisted(true);
        }
      } catch {
        if (!cancelled) {
          const demo = buildLocalDemoProject();
          setProject(demo);
          setFileContents(buildInitialFileContents(demo.state.nodes));
          setPersisted(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProject();
    return () => {
      cancelled = true;
    };
  }, [
    applyRemoteProject,
    isAuthenticated,
    preferences.seedDemoOnCreate,
    preferencesReady,
    projectIdParam,
  ]);

  useEffect(() => {
    if (!project || !persisted || loading) return;

    if (
      previousProjectIdRef.current !== null &&
      previousProjectIdRef.current !== project.id
    ) {
      loadedFilesRef.current.clear();
      setFileContents({});
    }
    previousProjectIdRef.current = project.id;

    const fileIds = new Set([
      ...project.state.ui.openFileIds,
      ...(project.state.ui.activeFileId ? [project.state.ui.activeFileId] : []),
    ]);

    for (const fileId of fileIds) {
      void loadFileContent(fileId, project.id, project.state.nodes);
    }
  }, [loadFileContent, loading, persisted, project?.id, project?.state.nodes, project?.state.ui.activeFileId, project?.state.ui.openFileIds]);

  useEffect(() => {
    if (!project || !persisted || loading) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    if (!preferences.autoSave) return;

    const timer = window.setTimeout(() => {
      void codeWorkspaceApi
        .updateStructure(project.id, {
          nodes: nodesForPersistence(project.state.nodes),
          ui: project.state.ui,
        })
        .catch(() => {});
    }, preferences.autoSaveDelayMs);

    return () => window.clearTimeout(timer);
  }, [preferences.autoSave, preferences.autoSaveDelayMs, project, persisted, loading]);

  const openFile = useCallback(
    (fileId: string) => {
      updateUi((current) => ({
        ...current,
        explorerFocusId: fileId,
        activeFileId: fileId,
        openFileIds: [fileId],
      }));

      if (persisted && project) {
        void loadFileContent(fileId, project.id, project.state.nodes);
      }
    },
    [loadFileContent, persisted, project, updateUi],
  );

  const openSearchResult = useCallback(
    (fileId: string, line: number) => {
      updateUi((current) => {
        const expanded = new Set(current.expandedFolderIds);
        for (const folderId of ancestorFolderIds(fileId, nodes)) {
          expanded.add(folderId);
        }
        return {
          ...current,
          rootExpanded: true,
          expandedFolderIds: Array.from(expanded),
          explorerFocusId: fileId,
          activeFileId: fileId,
          openFileIds: [fileId],
        };
      });

      if (persisted && project) {
        void loadFileContent(fileId, project.id, nodes);
      }

      setEditorScrollTarget({ fileId, line });
    },
    [loadFileContent, nodes, persisted, project, updateUi],
  );

  const closeTab = useCallback(() => {
    updateUi((current) => ({
      ...current,
      explorerFocusId: current.explorerFocusId === current.activeFileId ? null : current.explorerFocusId,
      activeFileId: null,
      openFileIds: [],
    }));
  }, [updateUi]);

  const handleCursorChange = useCallback((nextCursor: IdeCursorPosition, nextSelection: number) => {
    setCursor(nextCursor);
    setSelectionChars(nextSelection);
  }, []);

  const handleScrollToLineComplete = useCallback(() => {
    setEditorScrollTarget(null);
  }, []);

  const updateActiveFile = useCallback(
    (content: string) => {
      const fileId = project?.state.ui.activeFileId;
      if (!fileId || !project) return;

      setFileContents((previous) => ({ ...previous, [fileId]: content }));

      if (!persisted || !preferences.autoSave) return;

      window.clearTimeout(fileSaveTimersRef.current[fileId]);
      fileSaveTimersRef.current[fileId] = window.setTimeout(() => {
        void codeWorkspaceApi.saveFileContent(project.id, fileId, content);
      }, preferences.autoSaveDelayMs);
    },
    [persisted, preferences.autoSave, preferences.autoSaveDelayMs, project],
  );

  const selectFolder = useCallback(
    (folderId: string) => {
      updateUi((current) => ({ ...current, explorerFocusId: folderId }));
    },
    [updateUi],
  );

  const selectRoot = useCallback(() => {
    updateUi((current) => ({ ...current, explorerFocusId: null }));
  }, [updateUi]);

  const toggleRoot = useCallback(() => {
    updateUi((current) => ({
      ...current,
      explorerFocusId: null,
      rootExpanded: !current.rootExpanded,
    }));
  }, [updateUi]);

  const toggleFolder = useCallback(
    (folderId: string) => {
      updateUi((current) => {
        const expanded = new Set(current.expandedFolderIds);
        if (expanded.has(folderId)) expanded.delete(folderId);
        else expanded.add(folderId);
        return {
          ...current,
          explorerFocusId: folderId,
          expandedFolderIds: [...expanded],
        };
      });
    },
    [updateUi],
  );

  const prepareCreateParent = useCallback(
    (parentId: string | null) => {
      if (!parentId) {
        updateUi((current) => ({ ...current, explorerFocusId: null, rootExpanded: true }));
        return;
      }

      const folder = nodes.find((node) => node.id === parentId && node.kind === "folder");
      const focusId = folder?.id ?? parentId;

      updateUi((current) => {
        const expanded = new Set(current.expandedFolderIds);
        expanded.add(parentId);

        let ancestorId: string | null = parentId;
        while (ancestorId) {
          const ancestor = nodes.find((node) => node.id === ancestorId);
          if (!ancestor?.parentId) break;
          expanded.add(ancestor.parentId);
          ancestorId = ancestor.parentId;
        }

        return {
          ...current,
          explorerFocusId: focusId,
          rootExpanded: true,
          expandedFolderIds: [...expanded],
        };
      });
    },
    [nodes, updateUi],
  );

  const handleCreateFile = useCallback(
    async (parentId: string | null, name: string): Promise<string | null> => {
      if (!project) return "Project not loaded.";

      if (persisted) {
        try {
          const raw = await codeWorkspaceApi.addNode(project.id, {
            kind: "file",
            name,
            parentId: parentId ?? null,
            language: inferLanguageForName(name),
          });
          applyRemoteProject(mapApiProject(raw));
          return null;
        } catch (error) {
          return getApiErrorMessage(error, "Could not create file.");
        }
      }

      const result = addLocalNode(project.state, {
        kind: "file",
        name,
        parentId,
      });
      if (result.error) return result.error;
      setProject(applyProjectState(project, result.state));
      setFileContents((previous) => ({ ...previous, [result.nodeId]: "" }));
      return null;
    },
    [applyRemoteProject, persisted, project],
  );

  const handleCreateFolder = useCallback(
    async (parentId: string | null, name: string): Promise<string | null> => {
      if (!project) return "Project not loaded.";

      if (persisted) {
        try {
          const raw = await codeWorkspaceApi.addNode(project.id, {
            kind: "folder",
            name,
            parentId: parentId ?? null,
          });
          applyRemoteProject(mapApiProject(raw));
          return null;
        } catch (error) {
          return getApiErrorMessage(error, "Could not create folder.");
        }
      }

      const result = addLocalNode(project.state, {
        kind: "folder",
        name,
        parentId,
      });
      if (result.error) return result.error;
      setProject(applyProjectState(project, result.state));
      return null;
    },
    [applyRemoteProject, persisted, project],
  );

  const handleSave = useCallback(async () => {
    const fileId = project?.state.ui.activeFileId;
    if (!fileId || !project || !persisted) return;

    const content = fileContents[fileId] ?? "";
    window.clearTimeout(fileSaveTimersRef.current[fileId]);

    setSaving(true);
    setSaved(false);
    try {
      await codeWorkspaceApi.saveFileContent(project.id, fileId, content);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }, [fileContents, persisted, project]);

  const handleSaveAs = useCallback(async () => {
    const fileId = project?.state.ui.activeFileId;
    if (!fileId || !project) return;

    const activeNode = nodes.find((node) => node.id === fileId && node.kind === "file");
    if (!activeNode) return;

    const suggested = activeNode.name;
    const nextName = window.prompt("Save as", suggested);
    if (!nextName?.trim()) return;

    const trimmed = nextName.trim();
    if (trimmed === activeNode.name) {
      await handleSave();
      return;
    }

    const content = fileContents[fileId] ?? "";
    const parentId = activeNode.parentId;

    if (persisted) {
      try {
        const raw = await codeWorkspaceApi.addNode(project.id, {
          kind: "file",
          name: trimmed,
          parentId,
          language: inferLanguageForName(trimmed),
        });
        const mapped = mapApiProject(raw);
        const newFileId = mapped.state.ui.activeFileId;
        if (newFileId) {
          await codeWorkspaceApi.saveFileContent(project.id, newFileId, content);
          loadedFilesRef.current.add(newFileId);
          setFileContents((previous) => ({ ...previous, [newFileId]: content }));
        }
        applyRemoteProject(mapped);
      } catch (error) {
        window.alert(getApiErrorMessage(error, "Could not save file."));
      }
      return;
    }

    const result = addLocalNode(project.state, {
      kind: "file",
      name: trimmed,
      parentId,
      language: inferLanguageForName(trimmed),
    });
    if (result.error) {
      window.alert(result.error);
      return;
    }
    setProject(applyProjectState(project, result.state));
    setFileContents((previous) => ({ ...previous, [result.nodeId]: content }));
  }, [applyRemoteProject, fileContents, handleSave, nodes, persisted, project]);

  const handleNewFileFromMenu = useCallback(async () => {
    if (!project) return;
    setLeftSidebarTab("files");
    setLeftSidebarCollapsed(false);

    const parentId = getCreateParentId(ui.explorerFocusId, nodes);
    const nextName = window.prompt("New file name", "untitled.ts");
    if (!nextName?.trim()) return;

    const error = await handleCreateFile(parentId, nextName.trim());
    if (error) window.alert(error);
  }, [handleCreateFile, nodes, project, ui.explorerFocusId]);

  const handleNewFolderFromMenu = useCallback(async () => {
    if (!project) return;
    setLeftSidebarTab("files");
    setLeftSidebarCollapsed(false);

    const parentId = getCreateParentId(ui.explorerFocusId, nodes);
    const nextName = window.prompt("New folder name", "new-folder");
    if (!nextName?.trim()) return;

    const error = await handleCreateFolder(parentId, nextName.trim());
    if (error) window.alert(error);
  }, [handleCreateFolder, nodes, project, ui.explorerFocusId]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [activeContent]);

  useEffect(() => {
    setCursor({ line: 1, column: 1 });
    setSelectionChars(0);
  }, [ui.activeFileId]);

  const toggleConsole = useCallback(() => {
    setConsoleOpen((prev) => {
      if (!prev) setConsoleMaximized(false);
      return !prev;
    });
  }, []);

  const canSaveFile = Boolean(activeFile) && isActiveFileContentReady && persisted;

  const flushProjectFiles = useCallback(async () => {
    if (!project || !persisted) return;

    const fileNodes = nodes.filter((node) => node.kind === "file");
    await Promise.all(
      fileNodes.map(async (node) => {
        const content = fileContents[node.id] ?? "";
        window.clearTimeout(fileSaveTimersRef.current[node.id]);
        await codeWorkspaceApi.saveFileContent(project.id, node.id, content);
      }),
    );

    await codeWorkspaceApi.updateStructure(project.id, {
      nodes: nodesForPersistence(nodes),
      ui,
    });
  }, [fileContents, nodes, persisted, project, ui]);

  const handleOpenDeploy = useCallback(() => {
    setDeployError(null);
    setDeployModalOpen(true);
  }, []);

  const handleDeploy = useCallback(async () => {
    if (!project) return;

    setDeploying(true);
    setDeployError(null);
    setDeployResult(null);
    setConsoleOpen(true);
    setConsoleMaximized(false);
    setConsolePreferredTab("output");

    try {
      if (persisted) {
        await flushProjectFiles();
        const response = await codeWorkspaceApi.deployProject(project.id);
        const output = response.logs.map((entry) => `[${entry.level}] ${entry.message}`).join("\n");
        setDeployOutput(output);
        setDeployResult({
          status: response.status,
          stack: response.stack,
          deployUrl: response.deployUrl,
        });
        if (response.status === "success" && response.deployUrl) {
          setDeployPorts([{ name: "Production", port: 443, status: "live" }]);
          setConsolePreferredTab("ports");
        }
        return;
      }

      const hasPackageJson = nodes.some(
        (node) => node.kind === "file" && node.name === "package.json",
      );
      const stack = hasPackageJson ? "node" : "generic";
      const slug = project.id.slice(0, 8);
      const deployUrl = `https://${slug}.clovops.app`;
      const output = [
        "[info] Starting local preview deploy…",
        `[info] Project: ${project.title}`,
        `[info] Detected stack: ${stack}`,
        stack === "node" ? "[info] Running pnpm build…" : "[warn] Demo mode — sign in to deploy to Clovops Cloud.",
        stack === "node" ? "[success] Build completed successfully." : "[info] Bundling workspace files.",
        `[success] Live at ${deployUrl}`,
      ].join("\n");
      setDeployOutput(output);
      setDeployResult({ status: "success", stack, deployUrl });
      setDeployPorts([{ name: "Preview", port: 443, status: "live" }]);
      setConsolePreferredTab("ports");
    } catch (error) {
      setDeployError(getApiErrorMessage(error, "Deploy failed."));
      setDeployOutput((previous) =>
        previous
          ? `${previous}\n[error] ${getApiErrorMessage(error, "Deploy failed.")}`
          : `[error] ${getApiErrorMessage(error, "Deploy failed.")}`,
      );
    } finally {
      setDeploying(false);
    }
  }, [flushProjectFiles, nodes, persisted, project]);

  const fileMenu = useMemo(
    () => (
      <IdeFileMenu
        canSave={canSaveFile && persisted}
        canDeploy={Boolean(project)}
        saving={saving}
        onNewFile={() => void handleNewFileFromMenu()}
        onNewFolder={() => void handleNewFolderFromMenu()}
        onSave={() => void handleSave()}
        onSaveAs={() => void handleSaveAs()}
        onDeploy={handleOpenDeploy}
      />
    ),
    [
      canSaveFile,
      handleNewFileFromMenu,
      handleNewFolderFromMenu,
      handleOpenDeploy,
      handleSave,
      handleSaveAs,
      persisted,
      project,
      saving,
    ],
  );

  useEffect(() => {
    setHeader({
      leading: fileMenu,
    });
    return () => setHeader(null);
  }, [fileMenu, setHeader]);

  if (loading || !project) {
    return (
      <div className="ide-workspace flex h-full min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="ide-workspace flex h-full min-h-0 flex-1 flex-col overflow-hidden backdrop-blur-3xl">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <IdeResizablePanel
          side="left"
          width={leftSidebarWidth}
          onResizeStart={leftPanel.onResizeStart}
          resizable={!leftSidebarCollapsed}
        >
          <IdeCollapsibleSidebar
            side="left"
            tabs={LEFT_SIDEBAR_TABS}
            activeTab={leftSidebarTab}
            onTabChange={setLeftSidebarTab}
            collapsed={leftSidebarCollapsed}
            onCollapsedChange={setLeftSidebarCollapsed}
          >
            <IdeLeftSidebar
              activeTab={leftSidebarTab}
              projectTitle={project.title}
              nodes={nodes}
              ui={ui}
              onSelectFolder={selectFolder}
              onSelectRoot={selectRoot}
              onToggleRoot={toggleRoot}
              onToggleFolder={toggleFolder}
              onSelectFile={openFile}
              onPrepareCreateParent={prepareCreateParent}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onPrepareSearch={prepareSearch}
              onOpenSearchResult={openSearchResult}
            />
          </IdeCollapsibleSidebar>
        </IdeResizablePanel>

        <section className="ide-editor-panel relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="ide-tab-bar flex shrink-0 items-end justify-between gap-1.5 px-1.5 md:px-2">
            <select
              value={ui.activeFileId ?? ""}
              onChange={(event) => openFile(event.target.value)}
              className="glass-input mb-1.5 max-w-[10rem] truncate rounded-lg px-2 py-1.5 text-[13px] md:hidden"
              aria-label="Select file"
            >
              {allFileNodes.map((file) => (
                <option key={file.id} value={file.id}>
                  {nodePath(file.id, nodes)}
                </option>
              ))}
            </select>

            <div
              className="ide-tab-strip hidden min-w-0 flex-1 items-end overflow-x-auto [scrollbar-width:thin] md:flex"
              role="tablist"
              aria-label="Open files"
            >
              {activeFile ? (
                <div role="tab" aria-selected className="ide-tab group ide-tab-active">
                  <button
                    type="button"
                    onClick={() => openFile(activeFile.id)}
                    className="ide-tab-label flex min-w-0 flex-1 items-center gap-1.5"
                  >
                    <FileCode2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{activeFile.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeTab}
                    className="ide-tab-close"
                    aria-label={`Close ${activeFile.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="ide-tab-actions mb-1 flex shrink-0 items-center gap-1">
              {saved ? (
                <span className="ide-toolbar-btn inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  Saved
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={!activeFile || !isActiveFileContentReady}
                className="ide-toolbar-btn inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Copy file contents"
              >
                <ClipboardCopy className="h-3 w-3 opacity-70" />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                className="ide-toolbar-btn inline-flex items-center gap-1.5"
              >
                <GitBranch className="h-3 w-3 opacity-70" />
                main
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </div>
          </div>

          <div className="ide-breadcrumb-bar flex shrink-0 items-center gap-1 px-2 py-1 text-muted-foreground">
            {crumbs.map((segment, index) => (
              <span key={`${segment}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
                <span className={index === crumbs.length - 1 ? "text-foreground/80" : undefined}>
                  {segment}
                </span>
              </span>
            ))}
          </div>

          <div className="ide-editor-viewport relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {activeFile && isActiveFileContentReady ? (
              <CodeEditor
                value={activeContent}
                language={activeFile.language ?? "plaintext"}
                onChange={updateActiveFile}
                tabSize={preferences.tabSize}
                fontSize={preferences.fontSize}
                wordWrap={preferences.wordWrap}
                lineNumbers={preferences.lineNumbers}
                scrollToLine={
                  editorScrollTarget?.fileId === activeFile.id ? editorScrollTarget.line : null
                }
                onScrollToLineComplete={handleScrollToLineComplete}
                onCursorChange={handleCursorChange}
              />
            ) : activeFile ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading file…
              </div>
            ) : null}
          </div>

          {consoleOpen && (
            <IdeResizableBottomPanel
              height={consoleMaximized ? consoleMaxHeight : consolePanel.height}
              onResizeStart={consolePanel.onResizeStart}
            >
              <IdeBottomConsole
                maximized={consoleMaximized}
                onMaximize={() => setConsoleMaximized((prev) => !prev)}
                onClose={() => setConsoleOpen(false)}
                preferredTab={consolePreferredTab}
                outputLog={deployOutput}
                ports={deployPorts}
              />
            </IdeResizableBottomPanel>
          )}
        </section>

        <IdeResizablePanel
          side="right"
          width={rightSidebarWidth}
          onResizeStart={rightPanel.onResizeStart}
          resizable={!rightSidebarCollapsed}
        >
          <IdeCollapsibleSidebar
            side="right"
            tabs={RIGHT_SIDEBAR_TABS}
            activeTab={rightSidebarTab}
            onTabChange={setRightSidebarTab}
            collapsed={rightSidebarCollapsed}
            onCollapsedChange={setRightSidebarCollapsed}
          >
            <IdeRightSidebar
              activeTab={rightSidebarTab}
              activeFileLabel={activeFileLabel}
            />
          </IdeCollapsibleSidebar>
        </IdeResizablePanel>
      </div>

      <IdeStatusBar
        consoleOpen={consoleOpen}
        onToggleConsole={toggleConsole}
        workspaceName={project.title}
        branch={preferences.defaultGitBranch}
        language={activeFile?.language ? languageLabel(activeFile.language) : undefined}
        lineCount={lineCount}
        cursor={cursor}
        selectionChars={selectionChars}
        tabSize={preferences.tabSize}
      />

      <IdeDeployModal
        open={deployModalOpen}
        projectTitle={project.title}
        deploying={deploying}
        result={deployResult}
        errorMessage={deployError}
        onClose={() => setDeployModalOpen(false)}
        onDeploy={() => void handleDeploy()}
      />
    </div>
  );
}
