"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Layers, Plus } from "lucide-react";
import {
  PROJECT_PLANNING_ARTIFACT_COUNT,
  PROJECT_PLANNING_PHASES,
  PROJECT_PLANNING_ROOT_LABEL,
} from "./project-planning-catalog";
import {
  DashboardButton,
  DashboardContentFrame,
  DashboardMetric,
  DashboardPanel,
  DashboardSectionTitle,
  studioSurfaces,
} from "./project-planning-dashboard-ui";
import {
  ProjectPlanningWorkspace,
  type ProjectPlanningDeliverableChatProps,
  type ProjectPlanningPersistence,
} from "./project-planning-workspace";
import type { ReactNode } from "react";
import type { ProjectPlanningWorkspaceTab } from "./project-planning-workspace-chrome";
import { CRIMINAL_DETECTION_PROJECT_ID } from "./project-planning-document";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export type ProjectPlanningView = "home" | "workspace";

export type { ProjectPlanningWorkspaceTab } from "./project-planning-workspace-chrome";
export { ProjectPlanningHeaderNav } from "./project-planning-workspace-chrome";

export type ProjectPlanningAppProps = {
  initialTab?: ProjectPlanningView;
  workspaceSessionKey?: number | string;
  workspaceTabs?: ProjectPlanningWorkspaceTab[];
  activeWorkspaceTabId?: string | null;
  onSelectWorkspaceTab?: (tabId: string) => void;
  onCloseWorkspaceTab?: (tabId: string) => void;
  onNewWorkspaceTab?: () => void;
  isPreparingNewWorkspaceTab?: boolean;
  onShellViewChange?: (view: ProjectPlanningView) => void;
  onStartWorkspace?: () => void;
  projectId?: string;
  persistence?: ProjectPlanningPersistence;
  renderDeliverableChat?: (props: ProjectPlanningDeliverableChatProps) => ReactNode;
};

export function ProjectPlanningApp({
  initialTab = "home",
  workspaceSessionKey = 0,
  workspaceTabs = [],
  activeWorkspaceTabId = null,
  onSelectWorkspaceTab,
  onCloseWorkspaceTab,
  onNewWorkspaceTab,
  isPreparingNewWorkspaceTab = false,
  onShellViewChange,
  onStartWorkspace,
  projectId = CRIMINAL_DETECTION_PROJECT_ID,
  persistence,
  renderDeliverableChat,
}: ProjectPlanningAppProps) {
  const [activeView, setActiveView] = useState<ProjectPlanningView>(
    initialTab === "workspace" ? "workspace" : "home",
  );
  const [draftSessionActive, setDraftSessionActive] = useState(initialTab === "workspace");

  useEffect(() => {
    setActiveView(initialTab === "workspace" ? "workspace" : "home");
    if (initialTab === "workspace") {
      setDraftSessionActive(true);
    }
  }, [initialTab, workspaceSessionKey]);

  const setView = useCallback(
    (view: ProjectPlanningView) => {
      setActiveView(view);
      onShellViewChange?.(view);
    },
    [onShellViewChange],
  );

  const handleHomeClick = useCallback(() => {
    setView("home");
  }, [setView]);

  const handleStartWorkspace = useCallback(() => {
    onStartWorkspace?.();
    setDraftSessionActive(true);
    setView("workspace");
  }, [onStartWorkspace, setView]);

  const homeSelected = activeView === "home";
  const showWorkspace =
    draftSessionActive && activeView === "workspace";

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", studioSurfaces.page)}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "h-full",
            activeView !== "home" && "hidden",
          )}
        >
          <DashboardContentFrame>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-muted text-foreground">
              <Layers className="h-6 w-6" strokeWidth={2} />
            </div>

            <div className="mt-6">
              <DashboardSectionTitle
                eyebrow="Clovai Project Studio"
                title={PROJECT_PLANNING_ROOT_LABEL}
                description="Structured program planning from discovery through delivery — requirements, architecture, UX, AI systems, security, and rollout."
                action={
                  <DashboardButton variant="primary" onClick={handleStartWorkspace}>
                    <Plus className="h-4 w-4" strokeWidth={2.25} />
                    Open workspace
                  </DashboardButton>
                }
              />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <DashboardMetric
                label="Planning phases"
                value={PROJECT_PLANNING_PHASES.length}
                hint="End-to-end lifecycle coverage"
              />
              <DashboardMetric
                label="Deliverables"
                value={PROJECT_PLANNING_ARTIFACT_COUNT}
                hint="Diagrams, documents, and matrices"
              />
              <DashboardMetric
                label="Review workflow"
                value="Step-by-step"
                hint="Track completion per deliverable"
              />
            </div>

            <DashboardPanel className="mt-8">
              <h3 className="text-sm font-semibold text-foreground">Getting started</h3>
              <ol className="mt-5 space-y-4">
                {[
                  {
                    step: "1",
                    text: (
                      <>
                        Use <span className="font-medium text-foreground">Dashboard</span> for
                        program-wide metrics and the phase roadmap.
                      </>
                    ),
                  },
                  {
                    step: "2",
                    text: (
                      <>
                        Open <span className="font-medium text-foreground">Workspace</span> to
                        review deliverables phase by phase.
                      </>
                    ),
                  },
                  {
                    step: "3",
                    text: "Mark each step reviewed as you complete diagrams, documents, and matrices.",
                  },
                ].map((item) => (
                  <li key={item.step} className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted text-xs font-semibold text-foreground">
                      {item.step}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ol>
              <DashboardButton
                variant="ghost"
                onClick={handleStartWorkspace}
                className="mt-6 -ml-1 px-0 hover:bg-transparent"
              >
                Continue to workspace
                <ArrowRight className="h-4 w-4" />
              </DashboardButton>
            </DashboardPanel>
          </DashboardContentFrame>
        </div>

        {showWorkspace ? (
          <div
            key={workspaceSessionKey}
            className={cn("h-full min-h-0", activeView !== "workspace" && "hidden")}
          >
            <ProjectPlanningWorkspace
              embedded
              projectId={projectId}
              persistence={persistence}
              renderDeliverableChat={renderDeliverableChat}
              initialMode="workspace"
              workspaceSessionKey={workspaceSessionKey}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
