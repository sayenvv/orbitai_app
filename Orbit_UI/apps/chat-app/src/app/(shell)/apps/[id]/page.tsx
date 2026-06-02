import { notFound } from "next/navigation";
import { findCatalogAppById } from "@orbit/clovai-apps";
import { AppDetailView } from "@/components/apps/app-detail-view";

type Params = Promise<{ id: string }>;

export default async function AppDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const app = findCatalogAppById(id);

  if (!app) {
    notFound();
  }

  return <AppDetailView app={app} />;
}
