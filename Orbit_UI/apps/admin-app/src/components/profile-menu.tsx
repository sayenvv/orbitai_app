"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserCircle2,
  ShieldCheck,
  Bell,
  Activity,
  LogOut,
  ChevronDown,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useRoles } from "@/store/team-store";
import { initials, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Tone = "info" | "success" | "warning" | "danger" | "violet" | "neutral";

const DISPLAY_NAME = "Avery Quinn";
const DISPLAY_EMAIL = "avery.quinn@orbit.ai";

export function ProfileMenu() {
  const router = useRouter();
  const roleId = useAuthStore((s) => s.role);
  const hydrated = useAuthStore((s) => s.hydrated);
  const roles = useRoles();
  const roleDef = roles.find((r) => r.id === roleId) ?? roles[0];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-full border bg-background/70 pl-1 pr-2 py-1 hover:bg-accent transition-colors",
          open && "ring-2 ring-ring/30"
        )}
        title="Profile menu"
      >
        <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chart-4 text-[10px] font-bold text-white">
          {initials(DISPLAY_NAME)}
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[color:var(--success)] ring-2 ring-background" />
        </span>
        <span className="hidden sm:flex flex-col items-start leading-none">
          <span className="text-[11px] font-semibold leading-none">{DISPLAY_NAME.split(" ")[0]}</span>
          {hydrated && roleDef && (
            <span className="text-[9.5px] text-muted-foreground leading-none mt-0.5">{roleDef.label}</span>
          )}
        </span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border bg-popover shadow-lg overflow-hidden z-[100]">
          {/* Header */}
          <div className="px-3 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-4 text-[11px] font-bold text-white">
                {initials(DISPLAY_NAME)}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold truncate">{DISPLAY_NAME}</p>
                <p className="text-[10.5px] text-muted-foreground truncate">{DISPLAY_EMAIL}</p>
              </div>
            </div>
            {roleDef && (
              <div className="mt-2">
                <Badge tone={roleDef.tone as Tone}>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    {roleDef.label}
                  </span>
                </Badge>
              </div>
            )}
          </div>

          {/* Items */}
          <ul className="py-1">
            <MenuItem icon={UserCircle2} label="My profile" onSelect={() => go("/profile")} />
            <MenuItem icon={Activity} label="My activity" onSelect={() => go("/access/audit")} />
            <MenuItem icon={Bell} label="Notifications" onSelect={() => go("/notifications")} />
            <MenuItem icon={SettingsIcon} label="Settings" onSelect={() => go("/settings")} />
          </ul>

          <div className="border-t py-1">
            <MenuItem icon={LogOut} label="Sign out" destructive onSelect={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon, label, onSelect, destructive,
}: {
  icon: typeof UserCircle2;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left hover:bg-accent/60 transition-colors",
          destructive ? "text-destructive" : "text-foreground"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    </li>
  );
}

