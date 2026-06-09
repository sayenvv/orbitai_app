"use client";

import {
  AlertTriangle,
  Circle,
  GitBranch,
  IndentIncrease,
  Radio,
  Sparkles,
  Terminal,
  XCircle,
} from "lucide-react";
import type { IdeCursorPosition } from "@/lib/ide-cursor";
import { cn } from "@/lib/utils";

type IdeStatusBarProps = {
  consoleOpen: boolean;
  onToggleConsole: () => void;
  workspaceName: string;
  branch?: string;
  language?: string;
  lineCount: number;
  cursor: IdeCursorPosition;
  selectionChars: number;
  errorCount?: number;
  warningCount?: number;
  synced?: boolean;
  tabSize?: number;
};

function MetricToken({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <span className="ide-command-token" title={`${label}: ${value}`}>
      <span className="ide-command-token-label">{label}</span>
      <span className={cn("ide-command-token-value", mono && "font-mono")}>{value}</span>
    </span>
  );
}

export function IdeStatusBar({
  consoleOpen,
  onToggleConsole,
  workspaceName,
  branch = "main",
  language,
  lineCount,
  cursor,
  selectionChars,
  errorCount = 1,
  warningCount = 1,
  synced = true,
  tabSize = 2,
}: IdeStatusBarProps) {
  const hasDiagnostics = errorCount > 0 || warningCount > 0;

  return (
    <footer className="ide-command-strip glass-surface" aria-label="Workspace status">
      <div className="ide-command-strip-accent" aria-hidden />

      <div className="ide-command-strip-grid">
        <section className="ide-command-zone ide-command-zone-left">
          <span className="ide-command-workspace glass-chip" title={workspaceName}>
            <Circle
              className={cn(
                "ide-command-live-dot h-2 w-2 shrink-0",
                synced ? "ide-command-live-dot-synced" : "ide-command-live-dot-pending",
              )}
              fill="currentColor"
              strokeWidth={0}
            />
            <span className="truncate font-semibold tracking-wide">{workspaceName}</span>
          </span>

          <button
            type="button"
            onClick={onToggleConsole}
            className={cn(
              "ide-command-action glass-chip",
              consoleOpen && "ide-command-action-active",
            )}
            aria-pressed={consoleOpen}
          >
            <Terminal className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Terminal</span>
          </button>

          <span className="ide-command-action ide-command-action-static glass-chip">
            <GitBranch className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>{branch}</span>
          </span>

          {hasDiagnostics && (
            <span className="ide-command-diagnostics glass-chip">
              {errorCount > 0 && (
                <span className="ide-command-diag ide-command-diag-error" title="Errors">
                  <XCircle className="h-3 w-3" />
                  {errorCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="ide-command-diag ide-command-diag-warn" title="Warnings">
                  <AlertTriangle className="h-3 w-3" />
                  {warningCount}
                </span>
              )}
            </span>
          )}
        </section>

        <section className="ide-command-zone ide-command-zone-center">
          <div className="ide-command-hud glass-chip" aria-live="polite">
            <span className="ide-command-hud-item">
              <span className="ide-command-hud-key">Ln</span>
              <span className="ide-command-hud-val">{cursor.line}</span>
            </span>
            <span className="ide-command-hud-sep" aria-hidden />
            <span className="ide-command-hud-item">
              <span className="ide-command-hud-key">Col</span>
              <span className="ide-command-hud-val">{cursor.column}</span>
            </span>
            {selectionChars > 0 && (
              <>
                <span className="ide-command-hud-sep" aria-hidden />
                <span className="ide-command-hud-item">
                  <span className="ide-command-hud-key">Sel</span>
                  <span className="ide-command-hud-val">{selectionChars}</span>
                </span>
              </>
            )}
            <span className="ide-command-hud-sep" aria-hidden />
            <span className="ide-command-hud-item">
              <span className="ide-command-hud-key">Total</span>
              <span className="ide-command-hud-val">{lineCount}</span>
            </span>
          </div>
        </section>

        <section className="ide-command-zone ide-command-zone-right">
          <div className="ide-command-metrics glass-chip">
            <MetricToken label="Lang" value={language ?? "Plain"} />
            <MetricToken label="EOL" value="LF" mono />
            <MetricToken label="Enc" value="UTF-8" mono />
            <span className="ide-command-token" title={`Indentation: ${tabSize} spaces`}>
              <IndentIncrease className="h-3 w-3 opacity-60" strokeWidth={1.75} />
              <span className="ide-command-token-value font-mono">{tabSize}</span>
            </span>
          </div>

          <span className="ide-command-model glass-chip" title="Active inference model">
            <Sparkles className="h-3 w-3" strokeWidth={1.75} />
            <span>Axiom Ultra 3.1</span>
            <Radio className="h-2.5 w-2.5 opacity-50" strokeWidth={2} />
          </span>
        </section>
      </div>
    </footer>
  );
}
