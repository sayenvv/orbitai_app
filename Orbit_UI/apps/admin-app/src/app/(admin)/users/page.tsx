import { Download, UserPlus } from "lucide-react";
import { PageHeader, PageBody } from "@/components/page-shell";
import { UsersTable } from "@/components/tables/users-table";
import { RequirePermission, Can } from "@/components/auth-guard";
import { getUsers } from "@/lib/data";

export default function UsersPage() {
  const users = getUsers();

  return (
    <RequirePermission permission="users.view">
      <PageHeader
        title="Users"
        description={`${users.length} registered customers across all plans.`}
        actions={
          <>
            <Can permission="users.export">
              <button className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-[11.5px] font-medium hover:bg-accent/50 transition-colors">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            </Can>
            <Can permission="users.invite">
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
                <UserPlus className="h-3.5 w-3.5" /> Invite user
              </button>
            </Can>
          </>
        }
      />
      <PageBody>
        <UsersTable users={users} />
      </PageBody>
    </RequirePermission>
  );
}
