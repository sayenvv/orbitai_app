import { AdminShell } from "@/components/admin-shell";

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-background">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
