import { notFound } from "next/navigation";
import { findCatalogAppById } from "@orbit/clovai-apps";
import { AppHelpPage } from "@/components/apps/app-help-page";

type Params = Promise<{ id: string }>;

export default async function AppHelpRoutePage({ params }: { params: Params }) {
  const { id } = await params;
  const app = findCatalogAppById(id);

  if (!app) {
    notFound();
  }

  return <AppHelpPage app={app} />;
}
