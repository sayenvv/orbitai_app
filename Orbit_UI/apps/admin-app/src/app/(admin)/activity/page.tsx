import { PageHeader, PageBody } from "@/components/page-shell";
import { ActivityTimeline } from "@/components/activity-timeline";
import { RequirePermission } from "@/components/auth-guard";
import { getActivity } from "@/lib/data";

export default function ActivityPage() {
  const events = getActivity();

  return (
    <RequirePermission permission="activity.view">
      <PageHeader
        title="Activity"
        description="Recent platform events across users and billing."
      />
      <PageBody>
        <ActivityTimeline events={events} />
      </PageBody>
    </RequirePermission>
  );
}
