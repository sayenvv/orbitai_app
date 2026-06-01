"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { findCatalogAppById } from "@orbit/clovai-apps";
import { AppLaunchPage } from "@/components/apps/app-launch-page";

export default function AppLaunchRoutePage() {
  const params = useParams<{ id: string }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const app = useMemo(() => findCatalogAppById(routeId), [routeId]);

  if (!app) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">App not found.</p>
      </div>
    );
  }

  return <AppLaunchPage key={app.id} app={app} />;
}
