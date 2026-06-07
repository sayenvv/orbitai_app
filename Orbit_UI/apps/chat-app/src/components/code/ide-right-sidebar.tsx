"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowUp,
  Bot,
  MessageSquare,
  Sparkles,
  Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type RightSidebarTab = "ask" | "chat" | "problems" | "output";

export const RIGHT_SIDEBAR_TABS: Array<{ id: RightSidebarTab; label: string; icon: LucideIcon }> = [
  { id: "ask", label: "Ask", icon: Sparkles },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "problems", label: "Problems", icon: AlertCircle },
  { id: "output", label: "Output", icon: Terminal },
];

type PanelMessage = { role: "user" | "assistant"; text: string };

const DUMMY_MESSAGES: PanelMessage[] = [
  {
    role: "assistant",
    text: "I can help refactor `AxiomClient`, explain types, or generate tests. What would you like to work on?",
  },
];

const DUMMY_CHAT = [
  { role: "user" as const, text: "How do I add retry logic to complete()?" },
  {
    role: "assistant" as const,
    text: "Wrap the fetch call in a loop with exponential backoff. Start with 3 attempts and cap delay at 2s.",
  },
];

const DUMMY_PROBLEMS = [
  { file: "src/client.ts", line: 24, message: "Prefer optional chaining on config.baseUrl" },
  { file: "src/rate-limiter.ts", line: 12, message: "Recursive acquire() may stack overflow on long waits" },
];

const DUMMY_OUTPUT = `> axiom-api-client@0.1.0 build
> tsc

Build completed in 1.2s
`;

type IdeRightSidebarProps = {
  activeTab: RightSidebarTab;
  activeFileLabel?: string;
};

export function IdeRightSidebar({ activeTab, activeFileLabel }: IdeRightSidebarProps) {
  const [askInput, setAskInput] = useState("");
  const [askMessages, setAskMessages] = useState<PanelMessage[]>(DUMMY_MESSAGES);

  const handleAsk = () => {
    const prompt = askInput.trim();
    if (!prompt) return;

    setAskMessages((prev) => [
      ...prev,
      { role: "user", text: prompt },
      {
        role: "assistant",
        text: `Here's a starting point for "${prompt}" in ${activeFileLabel ?? "this file"} — extract shared fetch logic into a private request() helper with typed errors.`,
      },
    ]);
    setAskInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === "ask" && (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 [scrollbar-width:thin]">
              {askMessages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed",
                    message.role === "user"
                      ? "ml-4 bg-[var(--workspace-tab-inactive-bg-hover)] text-foreground shadow-sm"
                      : "mr-2 border border-[color:var(--ide-border-subtle)] bg-[color-mix(in_oklab,var(--ide-surface)_88%,var(--workspace-tab-bg)_12%)] text-foreground/90 shadow-sm",
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Bot className="h-3 w-3" />
                      Axiom
                    </div>
                  )}
                  {message.text}
                </div>
              ))}
            </div>
            <div className="shrink-0 border-t border-[color:var(--workspace-tab-border)] p-3">
              <div className="glass-composer rounded-xl border border-[color:var(--ide-border-subtle)] p-2.5 shadow-sm">
                <textarea
                  value={askInput}
                  onChange={(event) => setAskInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleAsk();
                    }
                  }}
                  rows={3}
                  placeholder="Ask about this code..."
                  className="w-full resize-none bg-transparent px-1 py-1 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {activeFileLabel ? `Context: ${activeFileLabel}` : "Project context"}
                  </span>
                  <button
                    type="button"
                    onClick={handleAsk}
                    disabled={!askInput.trim()}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--workspace-tab-active-bg)] text-[var(--workspace-tab-active-fg)] transition-opacity disabled:opacity-40"
                    aria-label="Send question"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "chat" && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 [scrollbar-width:thin]">
            {DUMMY_CHAT.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-[13px] leading-relaxed",
                  message.role === "user"
                    ? "ml-6 bg-[var(--workspace-tab-inactive-bg-hover)]"
                    : "mr-2 border border-[color:var(--workspace-tab-border)]",
                )}
              >
                {message.text}
              </div>
            ))}
          </div>
        )}

        {activeTab === "problems" && (
          <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
            {DUMMY_PROBLEMS.map((problem, index) => (
              <button
                key={index}
                type="button"
                className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--workspace-tab-inactive-bg-hover)]"
              >
                <span className="text-[12px] font-medium text-foreground">
                  {problem.file}:{problem.line}
                </span>
                <span className="text-[12px] text-muted-foreground">{problem.message}</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === "output" && (
          <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed text-muted-foreground [scrollbar-width:thin]">
            {DUMMY_OUTPUT}
          </pre>
        )}
      </div>
    </div>
  );
}

export type { RightSidebarTab };
