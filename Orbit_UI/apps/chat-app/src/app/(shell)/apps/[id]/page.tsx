import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCatalogAppById, visibleAppsCatalog } from "@orbit/clovai-apps";
import { BRAND_NAME } from "@orbit/ui";
import { AppDetailView } from "@/components/apps/app-detail-view";
import { chatConfig } from "@/lib/config";

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return visibleAppsCatalog.map((app) => ({ id: app.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const app = findCatalogAppById(id);

  if (!app) {
    return { title: "App not found" };
  }

  const canonical = `/apps/${app.id}`;
  const title = `${app.name} — ${app.tagline}`;
  const description = app.shortDescription || app.description;

  return {
    title: app.name,
    description,
    alternates: { canonical },
    keywords: [app.name, app.category, app.tag, `${BRAND_NAME} apps`, ...app.badges],
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: BRAND_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function AppDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const app = findCatalogAppById(id);

  if (!app) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.shortDescription || app.description,
    applicationCategory: app.category,
    operatingSystem: "Web",
    url: `${chatConfig.url}/apps/${app.id}`,
    softwareVersion: app.version,
    offers: {
      "@type": "Offer",
      price: app.tier === "pro" ? "0" : "0",
      priceCurrency: "USD",
      category: app.tier === "pro" ? "Pro" : "Starter",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: app.rating,
      bestRating: 5,
      ratingCount: app.installs.replace(/[^0-9]/g, "") || "100",
    },
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AppDetailView app={app} />
    </>
  );
}
