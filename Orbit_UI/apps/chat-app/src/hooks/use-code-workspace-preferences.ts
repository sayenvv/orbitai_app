"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CODE_WORKSPACE_PREFERENCES_EVENT,
  DEFAULT_CODE_WORKSPACE_PREFERENCES,
  normalizePreferences,
  readStoredPreferences,
  writeStoredPreferences,
  type CodeWorkspacePreferences,
} from "@/lib/code-workspace-preferences";
import { codeWorkspaceApi } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";

export function useCodeWorkspacePreferences() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [preferences, setPreferences] = useState<CodeWorkspacePreferences>(
    DEFAULT_CODE_WORKSPACE_PREFERENCES,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = readStoredPreferences();
      if (!isAuthenticated) {
        if (!cancelled) {
          setPreferences(cached);
          setReady(true);
        }
        return;
      }

      try {
        const settings = await codeWorkspaceApi.getSettings();
        const merged = normalizePreferences({
          ...cached,
          ...settings.preferences,
        });
        writeStoredPreferences(merged);
        if (!cancelled) {
          setPreferences(merged);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setPreferences(cached);
          setReady(true);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<CodeWorkspacePreferences>;
      if (custom.detail) setPreferences(normalizePreferences(custom.detail));
    };

    window.addEventListener(CODE_WORKSPACE_PREFERENCES_EVENT, handler);
    return () => window.removeEventListener(CODE_WORKSPACE_PREFERENCES_EVENT, handler);
  }, []);

  const updatePreferences = useCallback((partial: Partial<CodeWorkspacePreferences>) => {
    setPreferences((current) => normalizePreferences({ ...current, ...partial }));
  }, []);

  return { preferences, ready, updatePreferences };
}
