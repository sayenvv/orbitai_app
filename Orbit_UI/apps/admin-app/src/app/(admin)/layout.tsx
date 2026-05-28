import { AdminSidebar } from "@/components/admin-sidebar";

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">{children}</main>
    </div>
  );
}
