import { PageHeader, PageBody } from "@/components/page-shell";
import { RequirePermission } from "@/components/auth-guard";

export default function SettingsPage() {
  return (
    <RequirePermission permission="settings.view">
      <PageHeader
        title="Settings"
        description="Admin preferences and operational controls."
      />
      <PageBody className="space-y-5">
        <div className="premium-card p-6">
          <h3 className="text-sm font-semibold">Workspace</h3>
          <p className="text-[11.5px] text-muted-foreground mt-1">Display name, region and timezone preferences for the admin console.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Workspace name</span>
              <input className="form-input mt-1.5" defaultValue="Orbit Operations" />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Default currency</span>
              <input className="form-input mt-1.5" defaultValue="USD" />
            </label>
          </div>
        </div>
        <div className="premium-card p-6">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <p className="text-[11.5px] text-muted-foreground mt-1">Configure alerts for failed payments and security events.</p>
        </div>
      </PageBody>
    </RequirePermission>
  );
}
