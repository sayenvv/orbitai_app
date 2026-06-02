"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { findCatalogAppById } from "@orbit/clovai-apps";
import { AppHelpPage } from "@/components/apps/app-help-page";

export default function AppHelpRoutePage() {
  const params = useParams<{ id: string }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const app = useMemo(() => findCatalogAppById(routeId), [routeId]);

  if (!app) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">App not found</p>
          <Link
            href="/apps"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app store
          </Link>
        </div>
      </div>
    );
  }

  return <AppHelpPage app={app} />;
}
