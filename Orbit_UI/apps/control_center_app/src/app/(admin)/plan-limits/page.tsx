import Link from "next/link";
import { PageHeader, PageBody } from "@/components/page-shell";
import { PlanLimitsEditor } from "@/components/plan-limits-editor";

export default function PlanLimitsPage() {
  return (
    <>
      <PageHeader
        title="Subscription plans"
        description="Configure token limits, marketing copy, and included features for each subscription plan."
        actions={
          <Link
            href="/configuration"
            className="inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            Agent configuration
          </Link>
        }
      />
      <PageBody>
        <PlanLimitsEditor />
      </PageBody>
    </>
  );
}
