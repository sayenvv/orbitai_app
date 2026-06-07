"use client";

import { SettingsHelpFooterTab } from "@/components/home/support-modal";
import { SidebarAuthFooter } from "@/components/layout/sidebar-auth-footer";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { SidebarUserFooter } from "@/components/layout/sidebar-user-footer";
import { useTokenUsage } from "@/hooks/use-token-usage";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";
import { useUsageStore } from "@/store/usage-store";
import { cn } from "@/lib/utils";

/**
 * Code workspace rail — always collapsed, no expand affordance. Profile lives here.
 */
export function CodeCollapsedRail() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const { setProfileOpen, openLogin, openSupport } = useAppShell();
  useTokenUsage();
  const plan = useUsageStore((state) => state.usage?.plan ?? "free");
  const planLabel = `${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan`;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  return (
    <aside
      data-profile-rail=""
      className={cn(
        "code-profile-rail sidebar-glass flex h-full min-h-0 w-full flex-col overflow-visible",
      )}
      aria-label="Code workspace sidebar"
      aria-expanded={false}
    >
      <div className="code-profile-rail-header flex h-[3.25rem] shrink-0 items-center justify-center">
        <SidebarBrand showText={false} />
      </div>

      <div className="code-profile-rail-footer mt-auto shrink-0">
        {!isAuthenticated && (
          <SidebarAuthFooter
            expanded={false}
            onSignIn={() => openLogin("login")}
            onSignUp={() => openLogin("register")}
          />
        )}
        {isAuthenticated ? (
          <SidebarUserFooter
            expanded={false}
            name={user?.name ?? "Account"}
            initials={initials}
            subtitle={planLabel}
            onProfile={() => setProfileOpen(true)}
            onSettings={() => openSupport("settings")}
          />
        ) : (
          <SettingsHelpFooterTab collapsed onOpen={() => openSupport("settings")} />
        )}
      </div>
    </aside>
  );
}
