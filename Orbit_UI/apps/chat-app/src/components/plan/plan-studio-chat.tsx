"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronRight, Loader2, Sparkles } from "lucide-react";

import { ChatMessages } from "@/components/chat/chat-messages";
import { useAppShell } from "@/components/layout/app-shell-context";
import {
  coerceDiagramContent,
  contentToWorksheet,
  worksheetToContent,
  type PlanDeliverableContent,
} from "@/lib/plan-deliverable-content";
import { ApiError, projectPlanningApi } from "@/lib/orbit-api";
import type { SynopsisDeliverable, SynopsisSection } from "@/lib/plan-synopsis-catalog";
import { useAuthStore } from "@/store/auth-store";
import { randomId } from "@/lib/utils";
import type { Message } from "@/types";

type HistoryTurn = { role: "user" | "assistant"; content: string };

type PlanStudioChatProps = {
  planId: string;
  projectPrompt: string;
  section: SynopsisSection;
  deliverable: SynopsisDeliverable;
  content: PlanDeliverableContent;
  onContentChange: (content: PlanDeliverableContent) => void;
  onClose: () => void;
  width: number;
};

function buildSuggestions(deliverable: SynopsisDeliverable): string[] {
  if (deliverable.format === "diagram") {
    return [
      "Expand this Mermaid diagram with more components and data flows.",
      "Add authentication and error-handling paths to the diagram.",
      "Simplify the diagram for an executive audience.",
    ];
  }
  if (deliverable.format === "matrix") {
    return [
      "Fill this matrix with realistic priorities, owners, and statuses.",
      "Add three more rows for key risks or requirements.",
      "Align the matrix with our project brief and constraints.",
    ];
  }
  return [
    "Expand this section with more detail and actionable bullets.",
    "Rewrite this deliverable to be clearer and more professional.",
    "Add assumptions, risks, and open questions to this section.",
  ];
}

export function PlanStudioChat({
  planId,
  projectPrompt,
  section,
  deliverable,
  content,
  onContentChange,
  onClose,
  width,
}: PlanStudioChatProps) {
  const { openAuthPrompt } = useAppShell();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = useMemo(() => buildSuggestions(deliverable), [deliverable]);

  const greeting = useMemo<Message>(
    () => ({
      id: "studio-plan-greeting",
      role: "assistant",
      content:
        `I'm **ClovAI**, your planning assistant for section **${section.number}. ${deliverable.label}**. ` +
        "I can update this section's content, Mermaid diagrams, and tables. Changes apply to the center panel.",
      timestamp: new Date(),
    }),
    [deliverable.label, section.label],
  );

  const displayMessages = messages.length === 0 ? [greeting] : messages;
  const showSuggestions = messages.length === 0 && !isLoading;

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
  }, [input]);

  const handleSend = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
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

      const diagramHint =
        deliverable.format === "diagram"
          ? "\n\n[Format note] Store diagram updates as Mermaid inside a paragraph block: ```mermaid ... ```"
          : "";

      try {
        const result = await projectPlanningApi.aiAssist({
          projectId: planId,
          artifactId: deliverable.id,
          message: trimmed + diagramHint,
          projectName: projectPrompt.slice(0, 80) || "Studio plan",
          projectSummary: projectPrompt,
          phaseLabel: section.label,
          artifactLabel: deliverable.label,
          artifactDescription: deliverable.description,
          artifactFormat: deliverable.format,
          worksheet: contentToWorksheet(content, deliverable.label),
          history,
        });

        if (result.worksheetUpdated && result.worksheet) {
          const next = worksheetToContent(result.worksheet, deliverable.format, content);
          onContentChange(
            deliverable.format === "diagram"
              ? coerceDiagramContent(deliverable, next, projectPrompt)
              : next,
          );
        }

        const assistantText =
          result.reply.trim() ||
          (result.worksheetUpdated
            ? `I've updated **${deliverable.label}** in the center panel.`
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
      content,
      deliverable,
      history,
      isAuthenticated,
      isLoading,
      onContentChange,
      openAuthPrompt,
      planId,
      projectPrompt,
      section.label,
    ],
  );

  const submitInput = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    void handleSend(trimmed);
  };

  return (
    <aside
      className="platform-side-panel flex min-h-[280px] w-full shrink-0 flex-col overflow-hidden border-t lg:min-h-0 lg:w-[var(--chat-panel-width)] lg:border-t-0"
      style={{ ["--chat-panel-width" as string]: `${width}px` }}
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="size-3.5 shrink-0 text-primary" />
          <span className="text-xs font-medium text-foreground">ClovAI</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Close ClovAI chat"
          aria-label="Close ClovAI chat"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="shrink-0 border-b border-border/40 px-3 py-2">
        <p className="truncate text-[11px] font-medium text-foreground">{deliverable.label}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {section.label} · changes apply to the center panel
        </p>
      </div>

      <ChatMessages
        messages={displayMessages}
        isLoading={isLoading}
        className="min-h-0 flex-1"
        contentClassName="px-2"
        footer={
          showSuggestions ? (
            <div className="space-y-1.5 px-2 pb-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void handleSend(suggestion)}
                  className="flex w-full items-start gap-2 rounded-sm border border-border/60 bg-card px-2.5 py-2 text-left text-[10px] leading-relaxed text-foreground transition hover:bg-muted/30"
                >
                  <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          ) : null
        }
      />

      <div className="shrink-0 border-t border-border/40 p-2">
        <div className="rounded-sm border border-border/60 bg-card p-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitInput();
              }
            }}
            rows={2}
            placeholder="Ask ClovAI to update this section…"
            className="max-h-[7rem] min-h-[2.5rem] w-full resize-none bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex justify-end border-t border-border/30 px-1 pt-1">
            <button
              type="button"
              onClick={submitInput}
              disabled={!input.trim() || isLoading}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground disabled:opacity-40"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ArrowUp className="size-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
