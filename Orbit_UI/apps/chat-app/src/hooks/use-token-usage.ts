"use client";

import { useCallback, useEffect } from "react";

import { publicApi } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";
import { useUsageStore } from "@/store/usage-store";

export function useTokenUsage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const usage = useUsageStore((s) => s.usage);
  const loading = useUsageStore((s) => s.loading);
  const setUsage = useUsageStore((s) => s.setUsage);
  const setLoading = useUsageStore((s) => s.setLoading);
  const clearUsage = useUsageStore((s) => s.clearUsage);

  const refreshUsage = useCallback(async () => {
    if (!isAuthenticated) {
      clearUsage();
      return;
    }

    setLoading(true);
    try {
      const data = await publicApi.subscription();
      setUsage(data);
    } catch {
      // keep last known usage on transient errors
    } finally {
      setLoading(false);
    }
  }, [clearUsage, isAuthenticated, setLoading, setUsage]);

  useEffect(() => {
    void refreshUsage();
  }, [refreshUsage]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleRefresh = () => {
      if (document.visibilityState === "visible") {
        void refreshUsage();
      }
    };

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);
    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, [isAuthenticated, refreshUsage]);

  return {
    usage,
    loading,
    refreshUsage,
  };
}
