"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleHelp } from "lucide-react";
import {
  CRIMINAL_DETECTION_PROJECT_ID,
  ProjectPlanningApp,
  ProjectPlanningHeaderNav,
  type CatalogApp,
  type ProjectPlanningDocument,
  type ProjectPlanningPersistence,
  type ProjectPlanningView,
  type ProjectPlanningWorkspaceTab,
  getAppHelpHref,
  getAppWorkspaceHref,
} from "@orbit/clovai-apps";
import { projectPlanningApi } from "@/lib/orbit-api";
import { ProjectPlanningWorkspaceChat } from "@/components/apps/project-planning-workspace-chat";
import { useAppShell } from "@/components/layout/app-shell-context";

const WORKSPACE_TAB_PREPARE_MS = 450;

function createWorkspaceTabId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createWorkspaceDraftId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `draft-${Date.now()}`;
}

const DEFAULT_PROJECT_TITLE = "Criminal Detection";

function defaultWorkspaceTabTitle(tabCount: number): string {
  return tabCount <= 1 ? DEFAULT_PROJECT_TITLE : `${DEFAULT_PROJECT_TITLE} ${tabCount}`;
}

type WorkspaceTabRecord = ProjectPlanningWorkspaceTab;

export function ProjectPlanningAppPage({ app }: { app: CatalogApp }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeader } = useAppShell();
  const workspaceHref = getAppWorkspaceHref(app);

  const [preferredView, setPreferredView] = useState<ProjectPlanningView>(() => {
    const view = searchParams.get("view");
    return view === "workspace" ? "workspace" : "home";
  });
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTabRecord[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [workspaceSessionKey, setWorkspaceSessionKey] = useState(0);
  const [isPreparingWorkspaceTab, setIsPreparingWorkspaceTab] = useState(false);
  const prepareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistence = useMemo<ProjectPlanningPersistence>(
    () => ({
      loadProject: (projectId) =>
        projectPlanningApi.getProject(projectId) as Promise<ProjectPlanningDocument>,
      saveProject: (document) =>
        projectPlanningApi.saveProject(document.id, document as Parameters<
          typeof projectPlanningApi.saveProject
        >[1]),
    }),
    [],
  );

  const syncUrlView = useCallback(
    (view: ProjectPlanningView) => {
      const params = new URLSearchParams(searchParams.toString());
      if (view === "workspace") {
        params.set("view", "workspace");
      } else {
        params.delete("view");
      }
      const query = params.toString();
      router.replace(query ? `${workspaceHref}?${query}` : workspaceHref, { scroll: false });
    },
    [router, searchParams, workspaceHref],
  );

  const handleShellViewChange = useCallback(
    (view: ProjectPlanningView) => {
      setPreferredView(view);
      syncUrlView(view);
    },
    [syncUrlView],
  );

  const handleOpenHelp = useCallback(() => {
    router.push(getAppHelpHref(app));
  }, [app, router]);

  const handleCreateWorkspaceTab = useCallback(() => {
    if (prepareTimerRef.current) clearTimeout(prepareTimerRef.current);
    setIsPreparingWorkspaceTab(true);

    prepareTimerRef.current = setTimeout(() => {
      const tabId = createWorkspaceTabId();
      const draftId = createWorkspaceDraftId();
      setWorkspaceTabs((current) => {
        const next: WorkspaceTabRecord = {
          id: tabId,
          title: defaultWorkspaceTabTitle(current.length + 1),
          draftId,
          projectId: CRIMINAL_DETECTION_PROJECT_ID,
        };
        return [...current, next];
      });
      setActiveTabId(tabId);
      setWorkspaceSessionKey((k) => k + 1);
      setPreferredView("workspace");
      syncUrlView("workspace");
      setIsPreparingWorkspaceTab(false);
      prepareTimerRef.current = null;
    }, WORKSPACE_TAB_PREPARE_MS);
  }, [syncUrlView]);

  const handleSelectWorkspaceTab = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
      setPreferredView("workspace");
      syncUrlView("workspace");
    },
    [syncUrlView],
  );

  const handleCloseWorkspaceTab = useCallback(
    (tabId: string) => {
      setWorkspaceTabs((current) => {
        const next = current.filter((tab) => tab.id !== tabId);
        if (activeTabId === tabId) {
          const fallback = next[next.length - 1]?.id ?? null;
          setActiveTabId(fallback);
          if (!fallback) {
            setPreferredView("home");
            syncUrlView("home");
          }
        }
        return next;
      });
    },
    [activeTabId, syncUrlView],
  );

  const headerNav = useMemo(
    () => (
      <ProjectPlanningHeaderNav
        tabs={workspaceTabs}
        activeTabId={activeTabId ?? ""}
        onSelectTab={handleSelectWorkspaceTab}
        onCloseTab={handleCloseWorkspaceTab}
        onNewTab={handleCreateWorkspaceTab}
        isPreparingNew={isPreparingWorkspaceTab}
        homeSelected={preferredView === "home"}
        onHomeClick={() => handleShellViewChange("home")}
      />
    ),
    [
      activeTabId,
      handleCloseWorkspaceTab,
      handleCreateWorkspaceTab,
      handleSelectWorkspaceTab,
      handleShellViewChange,
      isPreparingWorkspaceTab,
      preferredView,
      workspaceTabs,
    ],
  );

  useEffect(() => {
    setHeader({
      title: app.name,
      subtitle: preferredView === "home" ? "Requirements through rollout" : undefined,
      nav: headerNav,
      actions: (
        <button
          type="button"
          onClick={handleOpenHelp}
          title="Help"
          aria-label="Help"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <CircleHelp className="h-4 w-4" strokeWidth={2} />
        </button>
      ),
    });
    return () => setHeader(null);
  }, [app.name, handleOpenHelp, headerNav, preferredView, setHeader]);

  useEffect(() => {
    return () => {
      if (prepareTimerRef.current) clearTimeout(prepareTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "workspace" && workspaceTabs.length === 0 && !isPreparingWorkspaceTab) {
      void handleCreateWorkspaceTab();
    }
  }, [handleCreateWorkspaceTab, isPreparingWorkspaceTab, searchParams, workspaceTabs.length]);

  const activeTab = workspaceTabs.find((tab) => tab.id === activeTabId);

  return (
    <ProjectPlanningApp
      initialTab={preferredView}
      workspaceSessionKey={workspaceSessionKey}
      workspaceTabs={workspaceTabs}
      activeWorkspaceTabId={activeTabId}
      projectId={activeTab?.projectId ?? CRIMINAL_DETECTION_PROJECT_ID}
      persistence={persistence}
      renderDeliverableChat={(props) => <ProjectPlanningWorkspaceChat {...props} />}
      onSelectWorkspaceTab={handleSelectWorkspaceTab}
      onCloseWorkspaceTab={handleCloseWorkspaceTab}
      onNewWorkspaceTab={handleCreateWorkspaceTab}
      isPreparingNewWorkspaceTab={isPreparingWorkspaceTab}
      onShellViewChange={handleShellViewChange}
      onStartWorkspace={handleCreateWorkspaceTab}
    />
  );
}
