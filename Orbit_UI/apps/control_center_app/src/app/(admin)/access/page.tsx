import { PageHeader, PageBody, EmptyHint } from "@/components/page-shell";

export default function AccessPage() {
  return (
    <>
      <PageHeader title="Access" description="Roles, permissions, and audit logs." />
      <PageBody>
        <EmptyHint
          title="Role-based access coming soon"
          hint="Define roles (admin, editor, viewer) and assign them to users."
        />
      </PageBody>
    </>
  );
}
