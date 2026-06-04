import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BRAND_NAME } from "@orbit/ui";

export const metadata: Metadata = {
  title: "AI Apps Catalog",
  description: `Browse the ${BRAND_NAME} catalog of AI apps — image generation, branding, research, project planning, and more. Each app has a dedicated workspace.`,
  alternates: { canonical: "/apps" },
  openGraph: {
    type: "website",
    title: `AI Apps Catalog — ${BRAND_NAME}`,
    description: `Browse the ${BRAND_NAME} catalog of AI apps for creators, students, and teams.`,
    url: "/apps",
    siteName: BRAND_NAME,
  },
};

export default function AppsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
