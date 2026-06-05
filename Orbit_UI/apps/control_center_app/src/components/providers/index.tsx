"use client";

import { AppProviders } from "@orbit/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
