"use client";

import { AppSidebarContent } from "@/components/layout/app-sidebar-content";
import { CollapsibleRail } from "@/components/layout/collapsible-rail";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { useChatSideRail } from "@/hooks/use-chat-side-rail";
import { cn } from "@/lib/utils";

type ChatHistoryRailProps = {
  className?: string;
};

export function ChatHistoryRail({ className }: ChatHistoryRailProps) {
  const { open, hydrated, toggle, setOpen } = useChatSideRail("left");

  return (
    <CollapsibleRail
      side="left"
      open={open}
      hydrated={hydrated}
      onToggle={toggle}
      ariaLabel="App sidebar"
      className={cn("h-full min-h-0 w-full bg-sidebar", className)}
      renderBrand={(expanded, onExpand) => (
        <SidebarBrand showText={expanded} onExpand={expanded ? undefined : onExpand} />
      )}
      renderContent={(expanded) => (
        <AppSidebarContent expanded={expanded} onExpand={() => setOpen(true)} />
      )}
    />
  );
}
