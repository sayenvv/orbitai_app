"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Settings,
  Palette,
  LayoutGrid,
  LayoutTemplate,
  Sparkles,
  ShieldCheck,
  Plug,
  Search,
  Wrench,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@orbit/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { LogOut } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Bot;
  description: string;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { label: "Agents", href: "/agents", icon: Bot, description: "Manage AI agents" },
      { label: "Tools", href: "/tools", icon: Wrench, description: "Tool catalog (JSON)" },
      { label: "Widgets", href: "/widgets", icon: LayoutGrid, description: "Rendering widgets" },
      { label: "Adaptive Cards", href: "/adaptive-cards", icon: LayoutTemplate, description: "Adaptive Card templates" },
    ],
  },
  {
    title: "Customization",
    items: [
      { label: "Themes", href: "/themes", icon: Palette, description: "Colors & branding" },
      { label: "Personalization", href: "/personalization", icon: Sparkles, description: "Per-user defaults" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Configuration", href: "/configuration", icon: Settings, description: "Global settings" },
      { label: "Subscription plans", href: "/plan-limits", icon: CreditCard, description: "Limits & plan setup" },
      { label: "Integrations", href: "/integrations", icon: Plug, description: "API keys & connectors" },
      { label: "Access", href: "/access", icon: ShieldCheck, description: "Roles & permissions" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const { user } = useAuthStore();
  const handleLogout = useLogout();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "OP";

  const filterMatch = (item: NavItem) =>
    !query ||
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase());

  return (
    <aside className="hidden md:flex w-60 shrink-0 h-full flex-col border-r bg-card/60 backdrop-blur-xl sticky top-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
        <div className="min-w-0">
          <BrandMark size="md" />
          <span className="text-[10px] text-muted-foreground leading-none mt-1 block">Control Center</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settings..."
            className="w-full rounded-lg border bg-background/60 pl-8 pr-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring/40 transition-all"
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 min-h-0 [scrollbar-width:thin]">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(filterMatch);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.title} className="mb-2">
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.description}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors group relative",
                        isActive
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-primary" />
                      )}
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive && "text-primary")} />
                      <span className="text-[11px] font-medium truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-3 shrink-0">
        <div className="flex items-center gap-3 rounded-lg px-2.5 py-2">
          <div className="relative shrink-0">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-border/60">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium leading-none truncate">{user?.name ?? "Operator"}</p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate capitalize">{user?.role ?? "operator"}</p>
          </div>
          <button
            onClick={() => void handleLogout()}
            title="Sign out"
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
