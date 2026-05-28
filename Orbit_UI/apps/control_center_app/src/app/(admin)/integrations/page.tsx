import { PageHeader, PageBody, EmptyHint } from "@/components/page-shell";

export default function IntegrationsPage() {
  return (
    <>
      <PageHeader title="Integrations" description="External APIs, providers, and webhooks." />
      <PageBody>
        <EmptyHint
          title="No integrations yet"
          hint="Connect providers like Amadeus, Google Places, Stripe to power widgets and billing."
        />
      </PageBody>
    </>
  );
}
