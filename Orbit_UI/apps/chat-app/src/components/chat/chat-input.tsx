"use client";

import { useState, useRef, FormEvent, KeyboardEvent, useEffect } from "react";
import { ArrowUp, Paperclip, Sparkles, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudySource } from "@/types";
import { ContextSelector } from "./context-selector";

type ChatInputProps = {
  onSend: (message: string) => void;
  isLoading: boolean;
  selectedSource: StudySource | null;
  onSelectSource: (source: StudySource | null) => void;
  showContextSelector?: boolean;
};

export function ChatInput({
  onSend,
  isLoading,
  selectedSource,
  onSelectSource,
  showContextSelector = true,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-4 pt-10 safe-bottom sm:px-6 sm:pb-6">
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/95 to-transparent"
      />

      <div className="pointer-events-auto relative w-full max-w-3xl">
        {showContextSelector && (
          <div className="mb-2 flex justify-center">
            <ContextSelector selectedSource={selectedSource} onSelect={onSelectSource} />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="rounded-[28px] border border-border/60 bg-card/95 p-2 shadow-[0_16px_48px_-16px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:shadow-[0_16px_48px_-16px_rgba(0,0,0,0.45)]">
            <div className="flex items-end gap-1.5">
              <button
                type="button"
                className="press mb-1 ml-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedSource
                    ? `Ask about "${selectedSource.name}"…`
                    : "Ask anything…"
                }
                className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-[15px] leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none sm:px-3"
                rows={1}
                disabled={isLoading}
              />

              <div className="mb-1 mr-1 shrink-0">
                {isLoading ? (
                  <button
                    type="button"
                    className="press inline-flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                    title="Stop generating"
                  >
                    <StopCircle className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canSend}
                    className={cn(
                      "press inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
                      canSend
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
            <Sparkles className="h-3 w-3 shrink-0 text-primary/60" />
            {selectedSource
              ? `Using context: ${selectedSource.name}`
              : "Orbit AI can make mistakes — verify important information."}
          </p>
        </form>
      </div>
    </div>
  );
}
