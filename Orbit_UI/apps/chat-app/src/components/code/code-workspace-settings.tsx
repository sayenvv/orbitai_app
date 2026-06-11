"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Code2,
  FolderOpen,
  GitBranch,
  HardDrive,
  Loader2,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  DEFAULT_CODE_WORKSPACE_PREFERENCES,
  normalizePreferences,
  readStoredPreferences,
  writeStoredPreferences,
  type CodeWorkspacePreferences,
} from "@/lib/code-workspace-preferences";
import {
  FALLBACK_CODE_WORKSPACE_TEMPLATES,
  fetchCodeWorkspaceTemplates,
  type CodeWorkspaceProjectTemplate,
} from "@/lib/code-workspace-templates";
import { codeWorkspaceApi, getApiErrorMessage } from "@/lib/orbit-api";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof HardDrive;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

const selectClassName = cn(
  "rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-sm",
  "focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

const inputClassName = cn(
  "w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm",
  "focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export function CodeWorkspaceSettings() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [storagePath, setStoragePath] = useState("");
  const [effectivePath, setEffectivePath] = useState("");
  const [defaultPath, setDefaultPath] = useState("");
  const [preferences, setPreferences] = useState<CodeWorkspacePreferences>(
    DEFAULT_CODE_WORKSPACE_PREFERENCES,
  );
  const [templates, setTemplates] = useState<CodeWorkspaceProjectTemplate[]>(
    FALLBACK_CODE_WORKSPACE_TEMPLATES,
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPreferences(readStoredPreferences());

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const settings = await codeWorkspaceApi.getSettings();
      setStoragePath(settings.storageRootPath ?? "");
      setEffectivePath(settings.effectiveStorageRootPath);
      setDefaultPath(settings.defaultStorageRootPath);
      setPreferences(normalizePreferences(settings.preferences));
      writeStoredPreferences(normalizePreferences(settings.preferences));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load workspace settings."));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void fetchCodeWorkspaceTemplates().then(setTemplates);
  }, [isAuthenticated]);

  const patchPreferences = (partial: Partial<CodeWorkspacePreferences>) => {
    setPreferences((current) => normalizePreferences({ ...current, ...partial }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const normalized = normalizePreferences(preferences);
    writeStoredPreferences(normalized);

    if (!isAuthenticated) {
      setSaved(true);
      setSaving(false);
      return;
    }

    try {
      const trimmed = storagePath.trim();
      const settings = await codeWorkspaceApi.updateSettings({
        storageRootPath: trimmed || null,
        preferences: normalized,
      });
      setStoragePath(settings.storageRootPath ?? "");
      setEffectivePath(settings.effectiveStorageRootPath);
      setDefaultPath(settings.defaultStorageRootPath);
      setPreferences(normalizePreferences(settings.preferences));
      writeStoredPreferences(normalizePreferences(settings.preferences));
      setSaved(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save workspace settings."));
    } finally {
      setSaving(false);
    }
  };

  const handleResetStorage = () => {
    setStoragePath("");
    setSaved(false);
  };

  const handleResetPreferences = () => {
    setPreferences(DEFAULT_CODE_WORKSPACE_PREFERENCES);
    setSaved(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3">
        <Link
          href={routes.code}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground"
          aria-label="Back to Clovops"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-wide">Clovops settings</h1>
          <p className="truncate text-xs text-muted-foreground">
            Storage, editor, and workspace preferences
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save all
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          {!isAuthenticated && (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Editor and workspace preferences are saved locally. Sign in to sync storage path and
              preferences across devices.
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading settings…
            </div>
          ) : (
            <>
              <section className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
                <SectionHeader
                  icon={HardDrive}
                  title="Storage"
                  description="Project files are stored outside this repository under {root}/{userId}/{projectId}/"
                />

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Custom path (optional)</span>
                  <input
                    type="text"
                    value={storagePath}
                    onChange={(event) => {
                      setStoragePath(event.target.value);
                      setSaved(false);
                    }}
                    disabled={!isAuthenticated || saving}
                    placeholder={defaultPath}
                    className={cn(inputClassName, "font-mono")}
                    spellCheck={false}
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleResetStorage}
                    disabled={!isAuthenticated || saving}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Use server default
                  </button>
                </div>

                <div className="space-y-1 rounded-lg border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground/80">Effective:</span>{" "}
                    <span className="font-mono text-foreground/70">{effectivePath || "—"}</span>
                  </p>
                  <p>
                    <span className="font-medium text-foreground/80">Server default:</span>{" "}
                    <span className="font-mono text-foreground/70">{defaultPath || "—"}</span>
                  </p>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
                <SectionHeader
                  icon={Code2}
                  title="Editor"
                  description="CodeMirror appearance and editing behavior"
                />

                <div className="space-y-2">
                  <SettingRow label="Tab size" description="Indentation width for new lines">
                    <select
                      value={preferences.tabSize}
                      onChange={(event) =>
                        patchPreferences({ tabSize: Number(event.target.value) as 2 | 4 | 8 })
                      }
                      disabled={saving}
                      className={selectClassName}
                    >
                      <option value={2}>2 spaces</option>
                      <option value={4}>4 spaces</option>
                      <option value={8}>8 spaces</option>
                    </select>
                  </SettingRow>

                  <SettingRow label="Font size" description="Editor text size in pixels">
                    <select
                      value={preferences.fontSize}
                      onChange={(event) =>
                        patchPreferences({ fontSize: Number(event.target.value) })
                      }
                      disabled={saving}
                      className={selectClassName}
                    >
                      {[11, 12, 13, 14, 15, 16, 18, 20].map((size) => (
                        <option key={size} value={size}>
                          {size}px
                        </option>
                      ))}
                    </select>
                  </SettingRow>

                  <SettingRow label="Word wrap" description="Wrap long lines in the editor">
                    <Toggle
                      checked={preferences.wordWrap}
                      onChange={(wordWrap) => patchPreferences({ wordWrap })}
                      disabled={saving}
                      label="Word wrap"
                    />
                  </SettingRow>

                  <SettingRow label="Line numbers" description="Show gutter line numbers">
                    <Toggle
                      checked={preferences.lineNumbers}
                      onChange={(lineNumbers) => patchPreferences({ lineNumbers })}
                      disabled={saving}
                      label="Line numbers"
                    />
                  </SettingRow>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
                <SectionHeader
                  icon={FolderOpen}
                  title="Workspace"
                  description="Project creation and panel defaults"
                />

                <div className="space-y-2">
                  <SettingRow
                    label="Auto-save files"
                    description="Save file contents while you type"
                  >
                    <Toggle
                      checked={preferences.autoSave}
                      onChange={(autoSave) => patchPreferences({ autoSave })}
                      disabled={saving}
                      label="Auto-save files"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Auto-save delay"
                    description="How long to wait after typing before saving"
                  >
                    <select
                      value={preferences.autoSaveDelayMs}
                      onChange={(event) =>
                        patchPreferences({
                          autoSaveDelayMs: Number(event.target.value) as
                            | 500
                            | 1000
                            | 2000
                            | 5000,
                        })
                      }
                      disabled={saving || !preferences.autoSave}
                      className={selectClassName}
                    >
                      <option value={500}>0.5 seconds</option>
                      <option value={1000}>1 second</option>
                      <option value={2000}>2 seconds</option>
                      <option value={5000}>5 seconds</option>
                    </select>
                  </SettingRow>

                  <SettingRow
                    label="Default project template"
                    description="Starter skeleton used when you create a new project"
                  >
                    <select
                      value={preferences.defaultProjectTemplate}
                      onChange={(event) =>
                        patchPreferences({ defaultProjectTemplate: event.target.value })
                      }
                      disabled={saving}
                      className={selectClassName}
                    >
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </SettingRow>

                  <SettingRow
                    label="Open terminal on launch"
                    description="Show the bottom terminal panel when opening Clovops"
                  >
                    <Toggle
                      checked={preferences.terminalOpenOnLaunch}
                      onChange={(terminalOpenOnLaunch) => patchPreferences({ terminalOpenOnLaunch })}
                      disabled={saving}
                      label="Open terminal on launch"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Open AI sidebar on launch"
                    description="Expand the right sidebar when opening Clovops"
                  >
                    <Toggle
                      checked={preferences.rightSidebarOpenOnLaunch}
                      onChange={(rightSidebarOpenOnLaunch) =>
                        patchPreferences({ rightSidebarOpenOnLaunch })
                      }
                      disabled={saving}
                      label="Open AI sidebar on launch"
                    />
                  </SettingRow>

                  <SettingRow label="Default git branch" description="Shown in the status bar">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={preferences.defaultGitBranch}
                        onChange={(event) =>
                          patchPreferences({ defaultGitBranch: event.target.value })
                        }
                        disabled={saving}
                        maxLength={64}
                        className={cn(inputClassName, "w-36 font-mono")}
                        spellCheck={false}
                      />
                    </div>
                  </SettingRow>
                </div>

                <button
                  type="button"
                  onClick={handleResetPreferences}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset editor & workspace defaults
                </button>
              </section>
            </>
          )}

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Settings saved.</p>
          )}
        </div>
      </div>
    </div>
  );
}
