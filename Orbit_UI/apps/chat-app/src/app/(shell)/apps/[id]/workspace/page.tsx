import { notFound } from "next/navigation";
import { findCatalogAppById } from "@orbit/clovai-apps";
import { AppLaunchPage } from "@/components/apps/app-launch-page";

type Params = Promise<{ id: string }>;

export default async function AppLaunchRoutePage({ params }: { params: Params }) {
  const { id } = await params;
  const app = findCatalogAppById(id);

  if (!app) {
    notFound();
  }

  return <AppLaunchPage key={app.id} app={app} />;
}
