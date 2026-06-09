export type CodeWorkspacePreferences = {
  tabSize: 2 | 4 | 8;
  fontSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  autoSaveDelayMs: 500 | 1000 | 2000 | 5000;
  seedDemoOnCreate: boolean;
  terminalOpenOnLaunch: boolean;
  defaultGitBranch: string;
  rightSidebarOpenOnLaunch: boolean;
};

export const DEFAULT_CODE_WORKSPACE_PREFERENCES: CodeWorkspacePreferences = {
  tabSize: 2,
  fontSize: 13,
  wordWrap: true,
  lineNumbers: true,
  autoSave: true,
  autoSaveDelayMs: 1000,
  seedDemoOnCreate: true,
  terminalOpenOnLaunch: true,
  defaultGitBranch: "main",
  rightSidebarOpenOnLaunch: false,
};

export const CODE_WORKSPACE_PREFERENCES_EVENT = "code-workspace-preferences-changed";
const STORAGE_KEY = "orbit:code-workspace-preferences";

function isTabSize(value: unknown): value is CodeWorkspacePreferences["tabSize"] {
  return value === 2 || value === 4 || value === 8;
}

function isAutoSaveDelay(value: unknown): value is CodeWorkspacePreferences["autoSaveDelayMs"] {
  return value === 500 || value === 1000 || value === 2000 || value === 5000;
}

export function normalizePreferences(
  partial: Partial<CodeWorkspacePreferences> | null | undefined,
): CodeWorkspacePreferences {
  const base = { ...DEFAULT_CODE_WORKSPACE_PREFERENCES };
  if (!partial) return base;

  if (isTabSize(partial.tabSize)) base.tabSize = partial.tabSize;
  if (typeof partial.fontSize === "number" && partial.fontSize >= 11 && partial.fontSize <= 20) {
    base.fontSize = Math.round(partial.fontSize);
  }
  if (typeof partial.wordWrap === "boolean") base.wordWrap = partial.wordWrap;
  if (typeof partial.lineNumbers === "boolean") base.lineNumbers = partial.lineNumbers;
  if (typeof partial.autoSave === "boolean") base.autoSave = partial.autoSave;
  if (isAutoSaveDelay(partial.autoSaveDelayMs)) base.autoSaveDelayMs = partial.autoSaveDelayMs;
  if (typeof partial.seedDemoOnCreate === "boolean") base.seedDemoOnCreate = partial.seedDemoOnCreate;
  if (typeof partial.terminalOpenOnLaunch === "boolean") {
    base.terminalOpenOnLaunch = partial.terminalOpenOnLaunch;
  }
  if (typeof partial.defaultGitBranch === "string" && partial.defaultGitBranch.trim()) {
    base.defaultGitBranch = partial.defaultGitBranch.trim().slice(0, 64);
  }
  if (typeof partial.rightSidebarOpenOnLaunch === "boolean") {
    base.rightSidebarOpenOnLaunch = partial.rightSidebarOpenOnLaunch;
  }

  return base;
}

export function readStoredPreferences(): CodeWorkspacePreferences {
  if (typeof window === "undefined") return DEFAULT_CODE_WORKSPACE_PREFERENCES;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CODE_WORKSPACE_PREFERENCES;
    return normalizePreferences(JSON.parse(raw) as Partial<CodeWorkspacePreferences>);
  } catch {
    return DEFAULT_CODE_WORKSPACE_PREFERENCES;
  }
}

export function writeStoredPreferences(preferences: CodeWorkspacePreferences): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(
    new CustomEvent<CodeWorkspacePreferences>(CODE_WORKSPACE_PREFERENCES_EVENT, {
      detail: preferences,
    }),
  );
}
