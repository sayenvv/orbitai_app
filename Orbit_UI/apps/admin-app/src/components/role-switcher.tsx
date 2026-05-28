"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ShieldCheck, Check } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useRoles } from "@/store/team-store";
import { cn } from "@/lib/utils";

export function RoleSwitcher() {
  const role = useAuthStore((s) => s.role);
  const setRole = useAuthStore((s) => s.setRole);
  const hydrated = useAuthStore((s) => s.hydrated);
  const roles = useRoles();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const displayRole = hydrated ? role : "super_admin";
  const displayDef = roles.find((r) => r.id === displayRole) ?? roles[0];

  if (!displayDef) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-xl border bg-background/60 px-2.5 py-2 transition-all hover:bg-accent/50",
          open && "ring-2 ring-ring/30"
        )}
      >
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] text-muted-foreground leading-none">Acting as</p>
          <p className="text-[11.5px] font-semibold leading-none mt-1 truncate">
            {displayDef.label}
          </p>
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border bg-popover shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2 border-b bg-muted/40">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Switch role (demo)
            </p>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {roles.map((r) => {
              const active = r.id === displayRole;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => {
                      setRole(r.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors flex items-start gap-2.5",
                      active && "bg-accent/30"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11.5px] font-semibold leading-none">{r.label}</p>
                        {!r.isBuiltIn && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            custom
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-muted-foreground mt-1.5 leading-snug">
                        {r.description || `${r.permissions.length} permissions`}
                      </p>
                    </div>
                    {active && <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
