"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { SidebarSection } from "@/components/home/app-sidebar-panels";
import { useAppShell } from "@/components/layout/app-shell-context";
import { navigateToNewChat } from "@/lib/chat-navigation";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";

export function useSidebarNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { section, setSection, openSupport, openLogin } = useAppShell();
  const { isAuthenticated } = useAuthStore();
  const activeConversationId = useChatStore((s) => s.activeConversationId);

  const activeChatId =
    (pathname.startsWith("/c/") ? pathname.split("/c/")[1]?.split("/")[0] : null) ??
    searchParams.get("conversation") ??
    activeConversationId;

  const handleSectionChange = useCallback(
    (next: SidebarSection) => {
      setSection(next);
      if (next === "home") {
        useChatStore.getState().setActiveConversation(null);
        if (pathname !== "/") {
          router.push("/");
        } else if (searchParams.get("section")) {
          router.replace("/");
        }
      } else if (next === "library") {
        if (pathname !== "/" || searchParams.get("section") !== "library") {
          router.push("/?section=library");
        }
      } else if (next === "insights") {
        if (!pathname.startsWith("/insights")) {
          router.push("/insights");
        }
      } else if (next === "agents") {
        if (pathname !== "/" || searchParams.get("section") !== "agents") {
          router.push("/?section=agents");
        }
      } else if (next === "plans") {
        if (pathname !== "/plans") {
          router.push("/plans");
        }
      }
    },
    [pathname, router, searchParams, setSection],
  );

  const handleNewChat = useCallback(() => {
    setSection("home");
    navigateToNewChat(router);
  }, [router, setSection]);

  const goHome = useCallback(() => {
    handleSectionChange("home");
  }, [handleSectionChange]);

  const openChat = useCallback(
    (id: string) => {
      router.push(`/c/${encodeURIComponent(id)}`);
    },
    [router],
  );

  return {
    section,
    isAuthenticated,
    activeChatId,
    handleSectionChange,
    handleNewChat,
    goHome,
    openChat,
    openSupport,
    openLogin,
  };
}
