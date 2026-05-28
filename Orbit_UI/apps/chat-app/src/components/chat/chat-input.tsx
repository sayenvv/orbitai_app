"use client";

import { useState, useRef, FormEvent, KeyboardEvent, useEffect } from "react";
import { Send, Paperclip, StopCircle } from "lucide-react";
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

export function ChatInput({ onSend, isLoading, selectedSource, onSelectSource, showContextSelector = true }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
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

  return (
    <div className="border-t bg-background/80 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-4 py-3">
        {/* Context Source Selector */}
        {showContextSelector && (
        <div className="mb-2">
          <ContextSelector selectedSource={selectedSource} onSelect={onSelectSource} />
        </div>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-end gap-2 rounded-2xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-primary/30 transition-all">
            <button
              type="button"
              className="hidden sm:inline-flex items-center justify-center rounded-xl h-9 w-9 ml-2 mb-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
                  ? `Ask about "${selectedSource.name}"...`
                  : "Message Study AI..."
              }
              className="flex-1 resize-none bg-transparent px-3 py-3 text-sm placeholder:text-muted-foreground focus:outline-none min-h-[44px] max-h-[160px] leading-relaxed"
              rows={1}
              disabled={isLoading}
            />
            <div className="flex items-center gap-1 mr-2 mb-1.5">
              {isLoading ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl h-9 w-9 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  title="Stop generating"
                >
                  <StopCircle className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className={cn(
                    "inline-flex items-center justify-center rounded-xl h-9 w-9 transition-all",
                    input.trim()
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 scale-100"
                      : "bg-muted text-muted-foreground scale-95 opacity-60"
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            {selectedSource
              ? `Answering based on: ${selectedSource.name}`
              : "Study AI can make mistakes. Verify important information with your course materials."}
          </p>
        </form>
      </div>
    </div>
  );
}
