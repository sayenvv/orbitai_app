"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessagesSquare,
  CreditCard,
  Sparkles,
  Activity,
  Settings,
  Search,
  Crown,
  ShieldCheck,
  Bell,
  FileBarChart,
  ScrollText,
  HeartPulse,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { RoleSwitcher } from "@/components/role-switcher";
import { useCanPerform } from "@/components/auth-guard";
import type { Permission } from "@/lib/rbac";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Users;
  description: string;
  badge?: string;
  permission: Permission;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Platform KPIs", permission: "dashboard.view" },
      { label: "Activity", href: "/activity", icon: Activity, description: "Recent events", permission: "activity.view" },
    ],
  },
  {
    title: "Customers",
    items: [
      { label: "Users", href: "/users", icon: Users, description: "Registered users", permission: "users.view" },
      { label: "Conversations", href: "/conversations", icon: MessagesSquare, description: "Chat sessions", permission: "conversations.view" },
    ],
  },
  {
    title: "Billing",
    items: [
      { label: "Subscriptions", href: "/subscriptions", icon: Sparkles, description: "Active plans", permission: "subscriptions.view" },
      { label: "Payments", href: "/payments", icon: CreditCard, description: "Transactions", permission: "payments.view" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "User health", href: "/user-health", icon: HeartPulse, description: "End-user issues & response times", permission: "health.view" },
      { label: "Notifications", href: "/notifications", icon: Bell, description: "Alerts & system messages", permission: "notifications.view" },
      { label: "Reports", href: "/reports", icon: FileBarChart, description: "Usage, revenue & engagement", permission: "reports.view" },
      { label: "System logs", href: "/logs", icon: ScrollText, description: "Full event log across the platform", permission: "logs.view" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Access control", href: "/access", icon: ShieldCheck, description: "Roles, permissions & members", permission: "access.view" },
      { label: "Settings", href: "/settings", icon: Settings, description: "Admin preferences", permission: "settings.view" },
    ],
  },
];

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const allowed = useCanPerform(item.permission);
  if (!allowed) return null;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.description}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all group relative",
        isActive
          ? "bg-gradient-to-r from-accent to-accent/40 text-accent-foreground shadow-sm"
          : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />
      )}
      <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive && "text-primary")} />
      <span className="text-[11.5px] font-medium truncate flex-1">{item.label}</span>
      {item.badge && (
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const filterMatch = (item: NavItem) =>
    !query ||
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase());

  return (
    <aside className="hidden md:flex w-64 shrink-0 h-full flex-col border-r bg-sidebar/70 backdrop-blur-xl sticky top-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-primary to-chart-4 flex items-center justify-center shadow-md ring-1 ring-primary/30">
            <Crown className="h-4 w-4 text-primary-foreground" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-sidebar" />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight block leading-none">Orbit Admin</span>
            <span className="text-[10px] text-muted-foreground leading-none mt-1 block">Operations Suite</span>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Search */}
      <div className="px-3 py-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border bg-background/70 pl-8 pr-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring/40 transition-all"
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 min-h-0 [scrollbar-width:thin]">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(filterMatch);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.title} className="mb-3">
              <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return <NavLink key={item.href} item={item} isActive={isActive} />;
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-3 shrink-0">
        <RoleSwitcher />
      </div>
    </aside>
  );
}
