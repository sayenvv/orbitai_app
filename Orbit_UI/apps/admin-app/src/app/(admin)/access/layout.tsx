import type { ReactNode } from "react";
import { RequirePermission } from "@/components/auth-guard";
import { AccessTabs } from "@/components/access-tabs";

export default function AccessLayout({ children }: { children: ReactNode }) {
  return (
    <RequirePermission permission="access.view">
      <div className="flex flex-col h-full">
        <AccessTabs />
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
      </div>
    </RequirePermission>
  );
}
