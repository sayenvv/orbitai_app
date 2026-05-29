"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarRecentsList,
  SidebarSectionNav,
  type SidebarSection,
} from "@/components/home/app-sidebar-panels";
import { publicApi } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";
import type { Conversation } from "@/types";

type ChatSidebarProps = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onDelete,
}: ChatSidebarProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [section, setSection] = useState<SidebarSection>("home");
  const [plan, setPlan] = useState<string>("free");

  useEffect(() => {
    if (!user) return;
    publicApi
      .subscription()
      .then((data) => {
        if (data?.plan) setPlan(data.plan);
      })
      .catch(() => {});
  }, [user]);

  const handleSectionChange = (next: SidebarSection) => {
    setSection(next);
    if (next === "library") router.push("/?section=library");
    else if (next === "agents") router.push("/?section=agents");
  };

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card/50 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-sm">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="block text-sm font-semibold tracking-tight">Orbit AI</span>
            <span className="text-[10px] leading-none text-muted-foreground">Chat</span>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <div className="border-b px-3 py-2">
        <SidebarSectionNav
          expanded
          section={section}
          onSectionChange={handleSectionChange}
          onNewChat={() => router.push("/")}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 py-2">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recents
        </p>
        <SidebarRecentsList
          conversations={conversations}
          loading={false}
          activeId={activeId}
          onSelect={onSelect}
          onDelete={onDelete}
          compact
        />
      </div>

      <div className="border-t p-3">
        <div className="group flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-accent/50">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-border/60">
              <span className="text-xs font-bold text-primary">
                {user?.name
                  ? user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "?"}
              </span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-none">{user?.name || "User"}</p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
