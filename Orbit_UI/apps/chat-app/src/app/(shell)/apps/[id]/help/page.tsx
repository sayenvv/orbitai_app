import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCatalogAppById } from "@orbit/clovai-apps";
import { AppHelpPage } from "@/components/apps/app-help-page";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const app = findCatalogAppById(id);
  if (!app) return { title: "Help" };
  return {
    title: `${app.name} — Help`,
    description: app.description,
    robots: { index: true, follow: true },
  };
}

export default async function AppHelpRoutePage({ params }: { params: Params }) {
  const { id } = await params;
  const app = findCatalogAppById(id);

  if (!app) {
    notFound();
  }

  return <AppHelpPage app={app} />;
}
