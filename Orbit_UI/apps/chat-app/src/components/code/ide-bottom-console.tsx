"use client";

import { useState } from "react";
import {
  AlertCircle,
  Bug,
  ChevronDown,
  ChevronUp,
  Plug,
  Terminal,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ConsoleTab = "terminal" | "debug" | "output" | "problems" | "ports";

const CONSOLE_TABS: Array<{ id: ConsoleTab; label: string; icon: LucideIcon }> = [
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "debug", label: "Debug Console", icon: Bug },
  { id: "output", label: "Output", icon: Terminal },
  { id: "problems", label: "Problems", icon: AlertCircle },
  { id: "ports", label: "Ports", icon: Plug },
];

const TERMINAL_LOG = `$ pnpm build
> axiom-api-client@0.1.0 build
> tsc

$ node dist/index.js
Axiom client ready — base URL https://api.axiom.ai/v1
`;

const DEBUG_LOG = `[info] AxiomClient initialized
[debug] RateLimiter configured: 60 req/min
[warn] API key loaded from environment
`;

const OUTPUT_LOG = `[build] Compiling TypeScript...
[build] Emitting declaration files...
[build] Done in 1.24s
`;

const PROBLEMS = [
  { file: "src/rate-limiter.ts", line: 12, severity: "warn", message: "Recursive acquire() may overflow on long waits" },
];

const PORTS = [
  { name: "Node", port: 9229, status: "listening" },
  { name: "Dev server", port: 3001, status: "listening" },
];

type IdeBottomConsoleProps = {
  onClose?: () => void;
  onMaximize?: () => void;
  maximized?: boolean;
};

export function IdeBottomConsole({ onClose, onMaximize, maximized }: IdeBottomConsoleProps) {
  const [activeTab, setActiveTab] = useState<ConsoleTab>("terminal");
  const [terminalInput, setTerminalInput] = useState("");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--ide-border-subtle)]">
        <div className="ide-sidebar-tabs flex min-w-0 flex-1 gap-0.5 px-2 py-1">
          {CONSOLE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "ide-sidebar-tab flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10.5px] font-medium tracking-wide",
                  active
                    ? "ide-sidebar-tab-active"
                    : "text-muted-foreground hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground",
                )}
              >
                <Icon className="h-3 w-3 shrink-0 opacity-80" />
                <span className="truncate uppercase">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 px-2">
          {onMaximize && (
            <button
              type="button"
              onClick={onMaximize}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground"
              aria-label={maximized ? "Restore console height" : "Maximize console"}
            >
              {maximized ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)] hover:text-foreground"
              aria-label="Close console"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "terminal" && (
          <div className="flex h-full min-h-0 flex-col">
            <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed text-foreground/85 [scrollbar-width:thin]">
              {TERMINAL_LOG}
            </pre>
            <div className="flex shrink-0 items-center gap-2 border-t border-[color:var(--workspace-tab-border)] px-3 py-2">
              <span className="text-[12px] text-primary">$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(event) => setTerminalInput(event.target.value)}
                placeholder="Enter command..."
                className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
        )}

        {activeTab === "debug" && (
          <pre className="h-full overflow-auto p-3 font-mono text-[12px] leading-relaxed text-muted-foreground [scrollbar-width:thin]">
            {DEBUG_LOG}
          </pre>
        )}

        {activeTab === "output" && (
          <pre className="h-full overflow-auto p-3 font-mono text-[12px] leading-relaxed text-muted-foreground [scrollbar-width:thin]">
            {OUTPUT_LOG}
          </pre>
        )}

        {activeTab === "problems" && (
          <div className="h-full overflow-auto p-2 [scrollbar-width:thin]">
            {PROBLEMS.map((problem, index) => (
              <button
                key={index}
                type="button"
                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)]"
              >
                <AlertCircle
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    problem.severity === "warn" ? "text-amber-500" : "text-muted-foreground",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground">
                    {problem.file}:{problem.line}
                  </p>
                  <p className="text-[12px] text-muted-foreground">{problem.message}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === "ports" && (
          <div className="h-full overflow-auto p-3 [scrollbar-width:thin]">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pb-2 font-medium">Process</th>
                  <th className="pb-2 font-medium">Port</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {PORTS.map((port) => (
                  <tr key={port.port} className="border-t border-[color:var(--workspace-tab-border)]">
                    <td className="py-2 text-foreground">{port.name}</td>
                    <td className="py-2 font-mono text-muted-foreground">{port.port}</td>
                    <td className="py-2 text-primary">{port.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
