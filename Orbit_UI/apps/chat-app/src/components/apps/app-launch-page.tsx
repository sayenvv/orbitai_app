"use client";

import { getLaunchAppKey, isLaunchApp, type CatalogApp } from "@orbit/clovai-apps";
import { ClovaiProjectsAppPage } from "@/components/apps/clovai-projects-app-page";
import { PhotoStudioAppPage } from "@/components/apps/photo-studio-app-page";
import { ResearchCompanionAppPage } from "@/components/apps/research-companion-app-page";

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
    case "clovai-projects":
      return <ClovaiProjectsAppPage key={app.id} app={app} />;
    default:
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">This app is not available yet.</p>
        </div>
      );
  }
}
