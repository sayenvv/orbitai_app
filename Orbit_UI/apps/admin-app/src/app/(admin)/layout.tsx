import { AdminShell } from "@/components/admin-shell";
import { AdminSidebar } from "@/components/admin-sidebar";

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminShell>
        <AdminSidebar />
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">{children}</main>
      </AdminShell>
    </div>
  );
}
