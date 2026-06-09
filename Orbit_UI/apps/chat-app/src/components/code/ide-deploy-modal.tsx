"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Loader2, Rocket, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DeployResult = {
  status: "success" | "failed";
  stack: string;
  deployUrl: string | null;
};

type IdeDeployModalProps = {
  open: boolean;
  projectTitle: string;
  deploying: boolean;
  result: DeployResult | null;
  errorMessage?: string | null;
  onClose: () => void;
  onDeploy: () => void;
};

export function IdeDeployModal({
  open,
  projectTitle,
  deploying,
  result,
  errorMessage,
  onClose,
  onDeploy,
}: IdeDeployModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    if (!result?.deployUrl) return;
    try {
      await navigator.clipboard.writeText(result.deployUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-background/55 px-4 backdrop-blur-sm">
      <div
        className="ide-deploy-modal glass-surface glass-modal w-full max-w-md overflow-hidden rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deploy-modal-title"
      >
        <div className="flex items-center justify-between border-b border-[color:var(--workspace-tab-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Rocket className="h-4 w-4" />
            </span>
            <div>
              <h2 id="deploy-modal-title" className="text-sm font-semibold text-foreground">
                Deploy project
              </h2>
              <p className="text-xs text-muted-foreground">{projectTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="rounded-xl border border-[color:var(--workspace-tab-border)] bg-[color-mix(in_oklab,var(--workspace-tab-bg)_88%,transparent)] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Target
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">Clovops Cloud</p>
            <p className="mt-1 text-xs text-muted-foreground">
              One-click deploy — builds your project and publishes a live preview URL.
            </p>
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </p>
          ) : null}

          {result?.status === "success" && result.deployUrl ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Deployed successfully
              </p>
              <p className="mt-1 font-mono text-[12px] text-foreground/90">{result.deployUrl}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="ide-toolbar-btn inline-flex items-center gap-1.5"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy URL"}
                </button>
                <a
                  href={result.deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ide-toolbar-btn inline-flex items-center gap-1.5"
                >
                  Open live site
                </a>
              </div>
            </div>
          ) : null}

          {result?.status === "failed" ? (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              Deploy failed. Check the Output panel for details.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[color:var(--workspace-tab-border)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onDeploy}
            disabled={deploying}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity",
              deploying && "opacity-70",
            )}
          >
            {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {deploying ? "Deploying…" : result ? "Deploy again" : "Deploy now"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
