"use client";

import { AppProviders } from "@orbit/ui";
import { AuthProvider } from "./auth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AuthProvider>{children}</AuthProvider>
    </AppProviders>
  );
}
