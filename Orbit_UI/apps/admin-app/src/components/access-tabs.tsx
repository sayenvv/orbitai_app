"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ShieldCheck, KeyRound, Users, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/access", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/access/roles", label: "Roles", icon: ShieldCheck },
  { href: "/access/permissions", label: "Permissions", icon: KeyRound },
  { href: "/access/members", label: "Members", icon: Users },
  { href: "/access/audit", label: "Member activity", icon: Activity },
];

export function AccessTabs() {
  const pathname = usePathname();
  return (
    <div className="border-b">
      <nav className="flex items-center gap-1 overflow-x-auto px-1 -mb-px">
        {TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 transition-all whitespace-nowrap",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
