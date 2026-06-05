import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import ShellLoading from "./loading";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellLoading />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
