"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SidebarSection } from "@/components/home/app-sidebar-panels";
import type { SupportTab } from "@/components/home/support-modal";

export type AppHeaderState = {
  title?: string;
  subtitle?: string;
  leading?: ReactNode;
  actions?: ReactNode;
};

type AppShellContextValue = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;
  section: SidebarSection;
  setSection: (section: SidebarSection) => void;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  authMode: "login" | "register";
  setAuthMode: (mode: "login" | "register") => void;
  supportOpen: boolean;
  supportTab: SupportTab;
  openSupport: (tab?: SupportTab) => void;
  closeSupport: () => void;
  setSupportTab: (tab: SupportTab) => void;
  openUpgrade: () => void;
  openLogin: (mode?: "login" | "register") => void;
  header: AppHeaderState | null;
  setHeader: (header: AppHeaderState | null) => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [section, setSection] = useState<SidebarSection>("home");
  const [profileOpen, setProfileOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportTab, setSupportTab] = useState<SupportTab>("settings");
  const [header, setHeaderState] = useState<AppHeaderState | null>(null);

  const openSupport = useCallback((tab: SupportTab = "settings") => {
    setSupportTab(tab);
    setSupportOpen(true);
  }, []);

  const closeSupport = useCallback(() => setSupportOpen(false), []);

  const openUpgrade = useCallback(() => {
    router.push("/plans");
  }, [router]);

  const openLogin = useCallback((mode: "login" | "register" = "login") => {
    setAuthMode(mode);
    setLoginModalOpen(true);
  }, []);

  const setHeader = useCallback((next: AppHeaderState | null) => {
    setHeaderState(next);
  }, []);

  const value = useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      mobileDrawerOpen,
      setMobileDrawerOpen,
      section,
      setSection,
      profileOpen,
      setProfileOpen,
      loginModalOpen,
      setLoginModalOpen,
      authMode,
      setAuthMode,
      supportOpen,
      supportTab,
      openSupport,
      closeSupport,
      setSupportTab,
      openUpgrade,
      openLogin,
      header,
      setHeader,
    }),
    [
      sidebarOpen,
      mobileDrawerOpen,
      section,
      profileOpen,
      loginModalOpen,
      authMode,
      supportOpen,
      supportTab,
      openSupport,
      closeSupport,
      openUpgrade,
      openLogin,
      header,
      setHeader,
    ],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error("useAppShell must be used within AppShellProvider");
  }
  return ctx;
}

export function useOptionalAppShell() {
  return useContext(AppShellContext);
}
