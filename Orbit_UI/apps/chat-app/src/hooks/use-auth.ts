"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore, User } from "@/store/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  email_verified: boolean;
  image: string | null;
  created_at: string;
  updated_at: string;
}

function mapUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role as User["role"],
    emailVerified: apiUser.email_verified,
    image: apiUser.image ?? undefined,
    createdAt: apiUser.created_at,
    updatedAt: apiUser.updated_at,
  };
}

export function useCurrentUser() {
  const { setUser, setLoading } = useAuthStore();

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data: ApiUser = await res.json();
      if (data.role === "admin") {
        setUser(null);
        return;
      }
      setUser(mapUser(data));
    } catch {
      setUser(null);
    }
  }, [setUser]);

  useEffect(() => {
    // Initial auth check
    checkAuth().finally(() => setLoading(false));

    // Re-check auth when user switches back to this tab/window
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    };
    const handleFocus = () => {
      checkAuth();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Periodic fallback check every 60 seconds
    const interval = setInterval(checkAuth, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [setLoading, checkAuth]);
}

export function useLogout() {
  const { logout } = useAuthStore();

  return () => {
    // Only clear local chat app state — do NOT call backend logout
    // so the shared cookie stays intact for the study app
    logout();
  };
}
