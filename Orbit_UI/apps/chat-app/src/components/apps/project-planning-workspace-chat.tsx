"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Loader2, Sparkles } from "lucide-react";
import type {
  PlanningArtifact,
  PlanningPhase,
  PlanningWorksheetContent,
  WorksheetTextSelection,
} from "@orbit/clovai-apps";
import { ChatMessages } from "@/components/chat/chat-messages";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";
import { ApiError, projectPlanningApi } from "@/lib/orbit-api";
import { randomId } from "@/lib/utils";
import type { Message } from "@/types";

type HistoryTurn = { role: "user" | "assistant"; content: string };

type ProjectPlanningWorkspaceChatProps = {
  projectId: string;
  projectName: string;
  projectSummary: string;
  phase: PlanningPhase;
  artifact: PlanningArtifact;
  worksheet: PlanningWorksheetContent;
  onWorksheetChange: (content: PlanningWorksheetContent) => void;
  onClose: () => void;
  textSelection?: WorksheetTextSelection | null;
};

const SUGGESTIONS = [
  "Expand this deliverable with more detail for our Python backend and Flutter app.",
  "Add a section on risks, assumptions, and open questions.",
  "Rewrite the worksheet to be clearer and more professional.",
];

export function ProjectPlanningWorkspaceChat({
  projectId,
  projectName,
  projectSummary,
  phase,
  artifact,
  worksheet,
  onWorksheetChange,
  onClose,
  textSelection = null,
}: ProjectPlanningWorkspaceChatProps) {
  const { openAuthPrompt } = useAppShell();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const greeting = useMemo<Message>(
    () => ({
      id: "pp-greeting",
      role: "assistant",
      content:
        `I can help you edit **${artifact.label}** in ${phase.label}. ` +
        "Highlight text on the canvas first — I'll use that selection as context. " +
        "Ask me to rewrite sections, add links, tables, images, or update structure. " +
        "When I change the worksheet, updates apply to the canvas automatically.",
      timestamp: new Date(),
    }),
    [artifact.label, phase.label],
  );

  const selectionHint = textSelection?.selectedText.trim()
    ? `Selected: “${textSelection.selectedText.trim().slice(0, 60)}${textSelection.selectedText.length > 60 ? "…" : ""}”`
    : null;

  const displayMessages = messages.length === 0 ? [greeting] : messages;
  const showSuggestions = messages.length === 0 && !isLoading;

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
  }, [input]);

  const handleSend = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      if (!isAuthenticated) {
        openAuthPrompt();
        return;
      }

      const userMessage: Message = {
        id: randomId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };
      setMessages((current) => [...current, userMessage]);
      setIsLoading(true);

      try {
        const result = await projectPlanningApi.aiAssist({
          projectId,
          artifactId: artifact.id,
          message: trimmed,
          projectName,
          projectSummary,
          phaseLabel: phase.label,
          artifactLabel: artifact.label,
          artifactDescription: artifact.description,
          artifactFormat: artifact.format,
          worksheet,
          history,
          textSelection: textSelection?.selectedText.trim() ? textSelection : null,
        });

        if (result.worksheetUpdated && result.worksheet) {
          onWorksheetChange(result.worksheet as PlanningWorksheetContent);
        }

        const assistantText =
          result.reply.trim() ||
          (result.worksheetUpdated
            ? "I've updated the deliverable worksheet on the canvas."
            : "Done.");

        const assistantMessage: Message = {
          id: randomId(),
          role: "assistant",
          content: assistantText,
          timestamp: new Date(),
        };

        setMessages((current) => [...current, assistantMessage]);
        setHistory((current) => [
          ...current,
          { role: "user", content: trimmed },
          { role: "assistant", content: assistantText },
        ]);
      } catch (err) {
        const errorText =
          err instanceof ApiError
            ? err.message
            : "Sorry, something went wrong. Please try again.";
        setMessages((current) => [
          ...current,
          {
            id: randomId(),
            role: "assistant",
            content: errorText,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      artifact,
      history,
      isAuthenticated,
      isLoading,
      onWorksheetChange,
      openAuthPrompt,
      phase.label,
      projectId,
      projectName,
      projectSummary,
      textSelection,
      worksheet,
    ],
  );

  const submitInput = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    void handleSend(trimmed);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/40 px-1 py-1">
        <div className="flex items-start gap-1">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-label="Back to tools"
            title="Back to tools"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 py-0.5">
            <p className="text-xs font-semibold text-foreground">AI assistant</p>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
              {artifact.label} · changes apply to the canvas
            </p>
            {selectionHint ? (
              <p className="mt-1 line-clamp-2 text-[10px] font-medium text-foreground">{selectionHint}</p>
            ) : null}
          </div>
        </div>
      </div>

      <ChatMessages
        messages={displayMessages}
        isLoading={isLoading}
        className="min-h-0 flex-1"
        contentClassName="px-1"
        footer={
          showSuggestions ? (
            <div className="space-y-1.5 px-1 pb-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void handleSend(suggestion)}
                  className="glass-surface glass-card glass-card-interactive flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] leading-relaxed text-foreground"
                >
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          ) : null
        }
      />

      <div className="shrink-0 border-t border-border/40 p-2">
        <div className="glass-surface glass-composer rounded-lg p-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitInput();
              }
            }}
            rows={2}
            placeholder="Ask AI to update this deliverable…"
            className="max-h-[7rem] min-h-[2.5rem] w-full resize-none bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex justify-end border-t border-border/30 px-1 pt-1">
            <button
              type="button"
              onClick={submitInput}
              disabled={!input.trim() || isLoading}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background disabled:opacity-40"
              aria-label="Send"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
