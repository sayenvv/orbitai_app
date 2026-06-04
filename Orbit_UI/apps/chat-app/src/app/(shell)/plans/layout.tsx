import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BRAND_NAME } from "@orbit/ui";

export const metadata: Metadata = {
  title: "Pricing & Plans",
  description: `Compare ${BRAND_NAME} plans and pricing. Start free, then upgrade for higher limits and Pro model access.`,
  alternates: { canonical: "/plans" },
  openGraph: {
    type: "website",
    title: `Pricing & Plans — ${BRAND_NAME}`,
    description: `Compare ${BRAND_NAME} plans and pricing. Start free, then upgrade for higher limits.`,
    url: "/plans",
    siteName: BRAND_NAME,
  },
};

export default function PlansLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
