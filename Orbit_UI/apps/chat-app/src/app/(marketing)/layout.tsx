import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  // Root <body> is fixed/overflow-hidden for the app shell; marketing pages
  // own their scroll container so the long-form page can scroll normally.
  return (
    <div className="h-dvh overflow-y-auto bg-background text-foreground">
      {children}
    </div>
  );
}
