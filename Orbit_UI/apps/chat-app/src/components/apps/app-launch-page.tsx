"use client";

import dynamic from "next/dynamic";
import { getLaunchAppKey, isLaunchApp, type CatalogApp } from "@orbit/clovai-apps";
import { Loader2 } from "lucide-react";

function AppLaunchLoading() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
    </div>
  );
}

const ResearchCompanionAppPage = dynamic(
  () =>
    import("@/components/apps/research-companion-app-page").then((m) => ({
      default: m.ResearchCompanionAppPage,
    })),
  { ssr: false, loading: AppLaunchLoading },
);

const PhotoStudioAppPage = dynamic(
  () =>
    import("@/components/apps/photo-studio-app-page").then((m) => ({
      default: m.PhotoStudioAppPage,
    })),
  { ssr: false, loading: AppLaunchLoading },
);

const ProjectPlanningAppPage = dynamic(
  () =>
    import("@/components/apps/project-planning-app-page").then((m) => ({
      default: m.ProjectPlanningAppPage,
    })),
  { ssr: false, loading: AppLaunchLoading },
);

type AppLaunchPageProps = {
  app: CatalogApp;
};

export function AppLaunchPage({ app }: AppLaunchPageProps) {
  const launchKey = getLaunchAppKey(app);

  if (!isLaunchApp(app) || !launchKey) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">This app is not available yet.</p>
      </div>
    );
  }

  switch (launchKey) {
    case "research-companion":
      return <ResearchCompanionAppPage key={app.id} app={app} />;
    case "photo-studio":
      return <PhotoStudioAppPage key={app.id} app={app} />;
    case "project-planning":
      return <ProjectPlanningAppPage key={app.id} app={app} />;
    default:
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">This app is not available yet.</p>
        </div>
      );
  }
}
