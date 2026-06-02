import type { ElementType, HTMLAttributes, ReactNode } from "react";

import {
  SIDEBAR_ICON_SLOT_CLASS,
  SIDEBAR_TEXT_CLASS,
  sidebarRowClassName,
} from "@/components/layout/sidebar-layout";
import { cn } from "@/lib/utils";

type SidebarRowProps = {
  icon?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  as?: ElementType;
} & HTMLAttributes<HTMLElement>;

export function SidebarRow({
  icon,
  children,
  className,
  contentClassName,
  as: Component = "div",
  ...props
}: SidebarRowProps) {
  return (
    <Component className={cn(sidebarRowClassName(), className)} {...props}>
      <span className={SIDEBAR_ICON_SLOT_CLASS}>{icon ?? null}</span>
      <div className={cn(SIDEBAR_TEXT_CLASS, contentClassName)}>{children}</div>
    </Component>
  );
}
