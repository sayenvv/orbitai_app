import { notFound } from "next/navigation";
import { findCatalogAppById } from "@orbit/clovai-apps";
import { AppLaunchAuthGate } from "@/components/apps/app-launch-auth-gate";

type Params = Promise<{ id: string }>;

export default async function AppLaunchRoutePage({ params }: { params: Params }) {
  const { id } = await params;
  const app = findCatalogAppById(id);

  if (!app) {
    notFound();
  }

  return <AppLaunchAuthGate key={app.id} app={app} />;
}
